/**
 * 麥克風錄音器（接唱模式）：權限與錄音分兩步，避免授權當下錄到中斷感。
 *
 *   acquire()  → 預取一次麥克風授權（getUserMedia），取得後立即釋放，只為觸發授權對話框
 *   start()    → 每段取一條「全新」stream 並建立新的 MediaRecorder 開始錄
 *   stop()     → Promise<Blob>，結束這一段並關閉該段 stream
 *   release()  → 釋放殘留資源（元件卸載時呼叫）
 *   ready      → 是否已取得授權
 *
 * 為何每段用全新 stream：iOS Safari 在共用同一條 stream、反覆建立 MediaRecorder
 * 時，第 3 段之後常常收不到有效的 ondataavailable，導致存進空 blob（靜音）。
 * 每段獨立取得 stream 可避開這個問題；授權已在 acquire 取得，之後 getUserMedia
 * 不會再跳對話框。
 */
// 每 timeslice 毫秒觸發一次 ondataavailable。iOS Safari 若不給 timeslice，
// 可能只在 stop() 時觸發、甚至完全不觸發，導致收不到 chunks（空 blob）。
const TIMESLICE_MS = 1000

// 依瀏覽器挑選支援的錄音格式。
// - Chrome/Firefox 支援 audio/webm
// - iOS Safari 不支援 webm；isTypeSupported('audio/mp4') 有時回 false，
//   需帶完整 codec 字串 audio/mp4;codecs=mp4a.40.2 才會通過。
// 先試 webm（維持 Chrome 原行為），再試 mp4 的完整/簡短寫法。
export function pickMimeType() {
    const candidates = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/mp4;codecs=mp4a.40.2',
        'audio/mp4',
        'audio/ogg',
    ]
    if (typeof MediaRecorder !== 'undefined' && typeof MediaRecorder.isTypeSupported === 'function') {
        for (const t of candidates) {
            if (MediaRecorder.isTypeSupported(t)) return t
        }
    }
    return ''
}

export function createMicRecorder() {
    let granted = false
    let mr = null
    let chunks = []
    let activeStream = null

    async function acquire() {
        if (granted) return
        const s = await navigator.mediaDevices.getUserMedia({ audio: true })
        s.getTracks().forEach((t) => t.stop()) // 只為觸發授權，立即釋放
        granted = true
    }

    async function start() {
        activeStream = await navigator.mediaDevices.getUserMedia({ audio: true })
        granted = true
        chunks = []
        const type = pickMimeType()
        mr = type ? new MediaRecorder(activeStream, { mimeType: type }) : new MediaRecorder(activeStream)
        mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
        // 給 timeslice 讓 Safari 定期觸發 ondataavailable
        mr.start(TIMESLICE_MS)
    }

    function stop() {
        return new Promise((resolve) => {
            if (!mr) return resolve(new Blob([], { type: 'audio/webm' }))
            const rec = mr
            const stream = activeStream
            mr = null
            activeStream = null
            rec.onstop = () => {
                stream?.getTracks().forEach((t) => t.stop())
                resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }))
            }
            rec.stop()
        })
    }

    function release() {
        activeStream?.getTracks().forEach((t) => t.stop())
        activeStream = null
        mr = null
    }

    return {
        acquire,
        start,
        stop,
        release,
        get ready() { return granted },
    }
}
