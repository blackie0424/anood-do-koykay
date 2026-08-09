import { ref, computed } from 'vue'
import { buildPlaybackPlan } from './playbackSequencer.js'
import { createDefaultStore } from './recordingStore.js'
import { createMicRecorder } from './mediaRecorder.js'
import { getBlobDuration } from './audioDuration.js'

const USER_PLAY_TAIL_MS = 250 // 依錄音時長推進時，尾端多留一點時間
const USER_PLAY_FALLBACK_MS = 8000 // 舊錄音無時長資訊時的保險上限

// iOS Safari 需要「手勢當下解鎖的共用 audio 元素」才能連續播放；其他平台用每段各建 audio 的舊路徑。
// iPadOS 13+ 的 UA 會偽裝成 Mac，故補 MacIntel + 多點觸控判斷。
function detectNeedsAudioUnlock() {
    if (typeof navigator === 'undefined') return false
    const ua = navigator.userAgent || ''
    if (/iPad|iPhone|iPod/.test(ua)) return true
    if (navigator.platform === 'MacIntel' && (navigator.maxTouchPoints || 0) > 1) return true
    return false
}

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
    const durationFromBlob = options.durationFromBlob ?? getBlobDuration
    const needsAudioUnlock = typeof options.needsAudioUnlock === 'boolean' ? options.needsAudioUnlock : detectNeedsAudioUnlock()

    const recordings = ref(new Map()) // lineId → { blob, url }
    const recordingLineId = ref(null)
    const micReady = ref(false)
    const isPlayingAll = ref(false)
    const playingLineId = ref(null) // 整體播放：目前播到哪一段（供高亮）
    const previewLineId = ref(null) // 單段自聽：目前正在播哪一段（供播放/暫停切換）
    const referencePreviewLineId = ref(null) // 單段聆聽原音：目前正在播哪一段
    const storageBlocked = ref(false) // Safari 無痕模式等 IndexedDB 無法寫入時為 true
    const error = ref(null)

    let previewAudio = null
    let refPreviewAudio = null
    let referenceAudio = null // 非 iOS 路徑：專用播原唱的 audio 元素
    let userStepAudio = null // 非 iOS 路徑：整體播放中正在播的使用者段
    let playbackAudio = null // iOS 路徑：整體播放共用的 audio 元素（手勢解鎖後可連續播）
    let activeStepCancel = null // 停止整體播放時用來結束當前段
    let recordStartAt = 0
    let stopAllFlag = false

    const recordedLineIds = computed(() => [...recordings.value.keys()])
    const hasRecording = (lineId) => recordings.value.has(lineId)
    const isRecording = (lineId) => recordingLineId.value === lineId

    function nextLineStart(line) {
        const ordered = [...(song.lines ?? [])].sort((a, b) => a.order - b.order)
        const idx = ordered.findIndex((l) => l.id === line.id)
        return ordered[idx + 1]?.start_time ?? null
    }

    function setRecording(lineId, blob, duration = null) {
        const prev = recordings.value.get(lineId)
        if (prev?.url) revokeUrl(prev.url)
        const map = new Map(recordings.value)
        map.set(lineId, { blob, url: makeUrl(blob), duration })
        recordings.value = map
    }

    async function load() {
        const stored = await store.getAllForSong(song.id)
        for (const rec of recordings.value.values()) revokeUrl(rec.url)
        const next = new Map()
        for (const [lineId, item] of stored) next.set(lineId, { blob: item.blob, url: makeUrl(item.blob), duration: item.duration ?? null })
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
            recordStartAt = Date.now()
        } catch {
            recordingLineId.value = null
            error.value = 'mic'
        }
    }

    async function stopRecording() {
        if (recordingLineId.value == null) return
        const lineId = recordingLineId.value
        recordingLineId.value = null
        const stopwatch = recordStartAt ? Date.now() - recordStartAt : null // 後備：碼表估算
        const blob = await micRecorder.stop()
        // 空 blob（iOS 連續錄音可能靜音）不儲存，提示使用者重錄
        if (!blob || blob.size === 0) {
            error.value = 'empty'
            return
        }
        // 精準：解碼錄音取得實際時長；失敗才退回碼表
        const decoded = await durationFromBlob(blob)
        const duration = (Number.isFinite(decoded) && decoded > 0) ? decoded : stopwatch
        try {
            await store.put(song.id, lineId, blob, duration)
        } catch {
            // Safari 無痕模式等 IndexedDB 無法寫入
            storageBlocked.value = true
            return
        }
        setRecording(lineId, blob, duration)
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

    // 播使用者錄音段。sharedAudio 有值＝iOS 共用元素路徑（換 src）；否則每段各建 audio（非 iOS）。
    // Safari mp4 缺時長資訊，靠 audio 事件判斷結束不可靠，改用「錄音當下量到的時長」定時推進；
    // 舊錄音無時長時退回 ended + 保險上限；play() 被拒也推進。
    function playUserStep(step, sharedAudio) {
        return new Promise((resolve) => {
            const rec = recordings.value.get(step.lineId)
            if (!rec) return resolve()
            const audio = sharedAudio || audioFactory(rec.url)
            if (sharedAudio) { audio.src = rec.url; audio.load?.() }
            userStepAudio = audio
            let done = false
            let progressed = false
            let timer = null
            const finish = () => {
                if (done) return
                done = true
                if (timer) clearTimeout(timer)
                audio.removeEventListener?.('timeupdate', onProgress)
                audio.removeEventListener?.('ended', onEnded)
                if (userStepAudio === audio) userStepAudio = null
                if (activeStepCancel === finish) activeStepCancel = null
                resolve()
            }
            activeStepCancel = finish
            const onProgress = () => { if (audio.currentTime > 0) progressed = true }
            const onEnded = () => { if (progressed) finish() } // 忽略尚未真正播放就觸發的 spurious ended
            audio.addEventListener?.('timeupdate', onProgress)
            audio.addEventListener?.('ended', onEnded)
            const p = audio.play?.()
            if (p && typeof p.catch === 'function') p.catch(() => finish())
            const hasDuration = Number.isFinite(rec.duration) && rec.duration > 0
            timer = setTimeout(finish, hasDuration ? rec.duration + USER_PLAY_TAIL_MS : USER_PLAY_FALLBACK_MS)
        })
    }

    // 播未錄段的原唱切片：到 step.end 就停並推進；ended 或 play() 被拒也要 resolve。
    // sharedAudio 路徑需換 src 到 audio_full 並等 loadedmetadata 才能 seek；非 iOS 用專用元素直接 seek。
    function playReferenceStep(step, sharedAudio) {
        return new Promise((resolve) => {
            const audio = sharedAudio || getReferenceAudio()
            let done = false
            const finish = () => {
                if (done) return
                done = true
                audio.removeEventListener?.('timeupdate', onTime)
                audio.removeEventListener?.('ended', onEnded)
                audio.removeEventListener?.('loadedmetadata', onMeta)
                audio.pause?.()
                if (activeStepCancel === finish) activeStepCancel = null
                resolve()
            }
            activeStepCancel = finish
            const onTime = () => { if (step.end != null && audio.currentTime >= step.end) finish() }
            const onEnded = () => finish()
            const seekAndPlay = () => {
                try { audio.currentTime = step.start } catch { /* noop */ }
                const p = audio.play?.()
                if (p && typeof p.catch === 'function') p.catch(() => finish())
            }
            const onMeta = () => seekAndPlay()
            audio.addEventListener?.('timeupdate', onTime)
            audio.addEventListener?.('ended', onEnded)
            if (sharedAudio && audio.src !== song.audio_full) {
                audio.src = song.audio_full
                audio.load?.()
                audio.addEventListener?.('loadedmetadata', onMeta, { once: true })
            } else {
                seekAndPlay()
            }
        })
    }

    function defaultPlayStep(step, sharedAudio) {
        return step.source === 'user' ? playUserStep(step, sharedAudio) : playReferenceStep(step, sharedAudio)
    }

    async function playAll() {
        if (isPlayingAll.value) return
        // 互斥：停自聽、原音
        stopPreview()
        stopReferencePreview()
        const step = options.playStep ?? defaultPlayStep
        const plan = buildPlaybackPlan(song.lines, recordedLineIds.value)
        // iOS Safari：整首共用一個 audio 元素——第一段在使用者手勢當下 play() 會解鎖它，
        // 之後對同一個已解鎖元素 play() 就不再被擋。非 iOS 用每段各建 audio 的路徑（sharedAudio=null）。
        const sharedAudio = (!options.playStep && needsAudioUnlock) ? audioFactory('') : null
        playbackAudio = sharedAudio
        if (sharedAudio) {
            try { const up = sharedAudio.play?.(); if (up && typeof up.catch === 'function') up.catch(() => {}) } catch { /* noop */ }
        }
        isPlayingAll.value = true
        stopAllFlag = false
        for (const s of plan) {
            if (stopAllFlag) break
            playingLineId.value = s.lineId
            await step(s, sharedAudio)
        }
        sharedAudio?.pause?.()
        referenceAudio?.pause?.()
        if (playbackAudio === sharedAudio) playbackAudio = null
        playingLineId.value = null
        isPlayingAll.value = false
    }

    function stopPlayAll() {
        stopAllFlag = true
        playbackAudio?.pause?.()
        playbackAudio = null
        referenceAudio?.pause?.()
        userStepAudio?.pause?.()
        userStepAudio = null
        const cancel = activeStepCancel // 立即結束當前段，讓播放迴圈跳出
        activeStepCancel = null
        cancel?.()
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
