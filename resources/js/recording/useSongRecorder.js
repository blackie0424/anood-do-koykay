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
    const previewLineId = ref(null) // 單段自聽：目前正在播哪一段（供播放/暫停切換）
    const referencePreviewLineId = ref(null) // 單段聆聽原音：目前正在播哪一段
    const storageBlocked = ref(false) // Safari 無痕模式等 IndexedDB 無法寫入時為 true
    const error = ref(null)

    let referenceAudio = null
    let previewAudio = null
    let refPreviewAudio = null
    let stopAllFlag = false

    const recordedLineIds = computed(() => [...recordings.value.keys()])
    const hasRecording = (lineId) => recordings.value.has(lineId)
    const isRecording = (lineId) => recordingLineId.value === lineId

    function nextLineStart(line) {
        const ordered = [...(song.lines ?? [])].sort((a, b) => a.order - b.order)
        const idx = ordered.findIndex((l) => l.id === line.id)
        return ordered[idx + 1]?.start_time ?? null
    }

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

    // 偵測本地儲存是否可寫（Safari 無痕模式下 IndexedDB 寫入會失敗）
    async function probeStorage() {
        try {
            await store.put(song.id, -1, new Blob(['probe'], { type: 'text/plain' }))
            await store.remove(song.id, -1)
            storageBlocked.value = false
        } catch {
            storageBlocked.value = true
        }
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
        stopPreview()
        stopReferencePreview()
        stopPlayAll()
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
        // 空 blob（iOS 連續錄音可能靜音）不儲存，提示使用者重錄
        if (!blob || blob.size === 0) {
            error.value = 'empty'
            return
        }
        try {
            await store.put(song.id, lineId, blob)
        } catch {
            // Safari 無痕模式等 IndexedDB 無法寫入
            storageBlocked.value = true
            return
        }
        setRecording(lineId, blob)
        // TODO(暫時)：Safari 整體播放跳段診斷，定位後移除
        console.debug('[anood][stopRecording]', { lineId, size: blob.size, type: blob.type, recorded: [...recordings.value.keys()] })
    }

    async function deleteRecording(lineId) {
        await store.remove(song.id, lineId)
        const prev = recordings.value.get(lineId)
        if (prev?.url) revokeUrl(prev.url)
        const map = new Map(recordings.value)
        map.delete(lineId)
        recordings.value = map
    }

    function stopPreview() {
        if (previewAudio) { previewAudio.pause?.(); previewAudio = null }
        previewLineId.value = null
    }

    function stopReferencePreview() {
        if (refPreviewAudio) { refPreviewAudio.pause?.(); refPreviewAudio = null }
        referencePreviewLineId.value = null
    }

    // 自聽錄音：再點同一段則暫停（toggle）；播完自動恢復。互斥：停原音、整體播放
    function playSegment(lineId) {
        if (previewLineId.value === lineId) { stopPreview(); return null }
        stopPreview()
        stopReferencePreview()
        stopPlayAll()
        const rec = recordings.value.get(lineId)
        if (!rec) return null
        const audio = audioFactory(rec.url)
        previewAudio = audio
        previewLineId.value = lineId
        audio.addEventListener?.('ended', () => {
            if (previewAudio === audio) stopPreview()
        }, { once: true })
        const p = audio.play?.()
        if (p && typeof p.catch === 'function') p.catch(() => { if (previewAudio === audio) stopPreview() })
        return audio
    }

    // 聆聽原音：播 audio_full 依該段 start/end 切片；再點同段暫停（toggle）；播完自動恢復。
    // 互斥：停自聽、其他原音、整體播放。
    function playReference(line) {
        if (referencePreviewLineId.value === line.id) { stopReferencePreview(); return null }
        stopPreview()
        stopReferencePreview()
        stopPlayAll()
        if (line.start_time == null || !song.audio_full) return null
        const end = line.end_time ?? nextLineStart(line) ?? null
        const audio = audioFactory(song.audio_full)
        refPreviewAudio = audio
        referencePreviewLineId.value = line.id
        let done = false
        const finish = () => {
            if (done) return
            done = true
            audio.removeEventListener?.('timeupdate', onTime)
            if (refPreviewAudio === audio) stopReferencePreview()
        }
        const onTime = () => {
            if (end != null && audio.currentTime >= end) finish()
        }
        audio.addEventListener?.('timeupdate', onTime)
        audio.addEventListener?.('ended', () => finish(), { once: true })
        audio.currentTime = line.start_time
        const p = audio.play?.()
        if (p && typeof p.catch === 'function') p.catch(() => finish())
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
        // 互斥：停自聽、原音
        stopPreview()
        stopReferencePreview()
        const step = options.playStep ?? defaultPlayStep
        const plan = buildPlaybackPlan(song.lines, recordedLineIds.value)
        isPlayingAll.value = true
        stopAllFlag = false
        // TODO(暫時)：Safari 診斷，定位後移除
        console.log('[anood][playAll] started', { isPlayingAll: isPlayingAll.value, recorded: recordedLineIds.value, plan: plan.map((s) => [s.lineId, s.source]) })
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
        stopPreview()
        stopReferencePreview()
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
        previewLineId,
        referencePreviewLineId,
        storageBlocked,
        error,
        hasRecording,
        isRecording,
        load,
        prepare,
        probeStorage,
        startRecording,
        stopRecording,
        deleteRecording,
        playSegment,
        stopPreview,
        playReference,
        stopReferencePreview,
        playAll,
        stopPlayAll,
        dispose,
    }
}
