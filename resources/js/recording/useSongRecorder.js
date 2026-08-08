import { ref, computed } from 'vue'
import { buildPlaybackPlan } from './playbackSequencer.js'
import { createDefaultStore } from './recordingStore.js'
import { createMicRecorder } from './mediaRecorder.js'

function makeUrl(blob) {
    try { return URL.createObjectURL(blob) } catch { return '' }
}
function revokeUrl(url) {
    try { if (url) URL.revokeObjectURL(url) } catch { /* noop */ }
}

/**
 * 接唱模式 v1 逐段錄音狀態機。
 *
 * 依賴以參數注入，方便測試：
 *   store        錄音儲存層（預設 IndexedDB）
 *   micRecorder  麥克風錄音器 { acquire(), start(), stop():Promise<Blob>, release() }
 *   audioFactory (src) => HTMLAudioElement 類物件
 *   playStep     (step) => Promise<void>，整體播放單段（預設用 audioFactory）
 */
export function useSongRecorder(song, options = {}) {
    const store = options.store ?? createDefaultStore()
    const micRecorder = options.micRecorder ?? createMicRecorder()
    const audioFactory = options.audioFactory ?? ((src) => new Audio(src))

    const recordings = ref(new Map()) // lineId → { blob, url }
    const recordingLineId = ref(null)
    const micReady = ref(false)
    const isPlayingAll = ref(false)
    const playingLineId = ref(null) // 整體播放：目前播到哪一段（供高亮）
    const error = ref(null)

    let referenceAudio = null
    let stopAllFlag = false

    const recordedLineIds = computed(() => [...recordings.value.keys()])
    const hasRecording = (lineId) => recordings.value.has(lineId)
    const isRecording = (lineId) => recordingLineId.value === lineId

    function setRecording(lineId, blob) {
        const prev = recordings.value.get(lineId)
        if (prev?.url) revokeUrl(prev.url)
        const map = new Map(recordings.value)
        map.set(lineId, { blob, url: makeUrl(blob) })
        recordings.value = map
    }

    async function load() {
        const stored = await store.getAllForSong(song.id)
        for (const rec of recordings.value.values()) revokeUrl(rec.url)
        const next = new Map()
        for (const [lineId, blob] of stored) next.set(lineId, { blob, url: makeUrl(blob) })
        recordings.value = next
    }

    // 進入錄音介面時預取一次麥克風授權，之後按錄音才能即時開始、不被授權對話框打斷
    async function prepare() {
        try {
            await micRecorder.acquire()
            micReady.value = true
        } catch {
            error.value = 'mic'
        }
    }

    async function startRecording(lineId) {
        if (recordingLineId.value != null) return
        error.value = null
        try {
            await micRecorder.start()
            recordingLineId.value = lineId
        } catch {
            recordingLineId.value = null
            error.value = 'mic'
        }
    }

    async function stopRecording() {
        if (recordingLineId.value == null) return
        const lineId = recordingLineId.value
        recordingLineId.value = null
        const blob = await micRecorder.stop()
        await store.put(song.id, lineId, blob)
        setRecording(lineId, blob)
    }

    async function deleteRecording(lineId) {
        await store.remove(song.id, lineId)
        const prev = recordings.value.get(lineId)
        if (prev?.url) revokeUrl(prev.url)
        const map = new Map(recordings.value)
        map.delete(lineId)
        recordings.value = map
    }

    function playSegment(lineId) {
        const rec = recordings.value.get(lineId)
        if (!rec) return null
        const audio = audioFactory(rec.url)
        audio.play?.()
        return audio
    }

    function getReferenceAudio() {
        if (!referenceAudio) referenceAudio = audioFactory(song.audio_full)
        return referenceAudio
    }

    // 播使用者錄音段：播到 ended 才 resolve；play() 被拒或無法播時也要 resolve 以推進下一段
    function playUserStep(step) {
        return new Promise((resolve) => {
            const rec = recordings.value.get(step.lineId)
            if (!rec) return resolve()
            const audio = audioFactory(rec.url)
            let done = false
            const finish = () => {
                if (done) return
                done = true
                audio.removeEventListener?.('ended', onEnded)
                resolve()
            }
            const onEnded = () => finish()
            audio.addEventListener?.('ended', onEnded)
            const p = audio.play?.()
            if (p && typeof p.catch === 'function') p.catch(() => finish())
        })
    }

    // 播未錄段的原唱切片：到 step.end 就停並推進；ended 或 play() 被拒也要 resolve
    function playReferenceStep(step) {
        return new Promise((resolve) => {
            const audio = getReferenceAudio()
            let done = false
            const finish = () => {
                if (done) return
                done = true
                audio.removeEventListener?.('timeupdate', onTime)
                audio.removeEventListener?.('ended', onEnded)
                audio.pause?.()
                resolve()
            }
            const onTime = () => {
                if (step.end != null && audio.currentTime >= step.end) finish()
            }
            const onEnded = () => finish()
            audio.addEventListener?.('timeupdate', onTime)
            audio.addEventListener?.('ended', onEnded)
            audio.currentTime = step.start
            const p = audio.play?.()
            if (p && typeof p.catch === 'function') p.catch(() => finish())
        })
    }

    function defaultPlayStep(step) {
        return step.source === 'user' ? playUserStep(step) : playReferenceStep(step)
    }

    async function playAll() {
        if (isPlayingAll.value) return
        const step = options.playStep ?? defaultPlayStep
        const plan = buildPlaybackPlan(song.lines, recordedLineIds.value)
        isPlayingAll.value = true
        stopAllFlag = false
        for (const s of plan) {
            if (stopAllFlag) break
            playingLineId.value = s.lineId
            await step(s)
        }
        playingLineId.value = null
        isPlayingAll.value = false
    }

    function stopPlayAll() {
        stopAllFlag = true
        referenceAudio?.pause?.()
        playingLineId.value = null
        isPlayingAll.value = false
    }

    function dispose() {
        micRecorder.release?.()
        for (const rec of recordings.value.values()) revokeUrl(rec.url)
    }

    return {
        recordings,
        recordingLineId,
        recordedLineIds,
        micReady,
        isPlayingAll,
        playingLineId,
        error,
        hasRecording,
        isRecording,
        load,
        prepare,
        startRecording,
        stopRecording,
        deleteRecording,
        playSegment,
        playAll,
        stopPlayAll,
        dispose,
    }
}
