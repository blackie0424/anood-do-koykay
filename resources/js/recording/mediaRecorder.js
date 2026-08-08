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
// 依瀏覽器挑選支援的錄音格式：Safari 只支援 audio/mp4、Chrome/Firefox 支援 audio/webm。
// 不指定時 Safari 可能錄不出有效資料（ondataavailable 空、blob size 0）。
export function pickMimeType() {
    const candidates = ['audio/webm', 'audio/mp4', 'audio/ogg']
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
        mr.start()
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
