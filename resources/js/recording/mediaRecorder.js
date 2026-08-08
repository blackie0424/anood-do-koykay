/**
 * 麥克風錄音器（接唱模式）：權限與錄音分兩步，避免授權當下錄到中斷感。
 *
 *   acquire()  → 預取一次麥克風權限（getUserMedia），不開始錄音
 *   start()    → 用已取得的 stream 開始錄一段（未取得則先 acquire）
 *   stop()     → Promise<Blob>，結束這一段（保留 stream 供下段重用）
 *   release()  → 釋放麥克風（元件卸載時呼叫）
 *   ready      → 是否已取得麥克風
 *
 * 同一個 stream 貫穿整個錄音介面，每段錄音各建立一個 MediaRecorder。
 */
export function createMicRecorder() {
    let stream = null
    let mr = null
    let chunks = []

    async function acquire() {
        if (!stream) stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    }

    async function start() {
        await acquire()
        chunks = []
        mr = new MediaRecorder(stream)
        mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }
        mr.start()
    }

    function stop() {
        return new Promise((resolve) => {
            if (!mr) return resolve(new Blob([], { type: 'audio/webm' }))
            const rec = mr
            mr = null
            rec.onstop = () => resolve(new Blob(chunks, { type: rec.mimeType || 'audio/webm' }))
            rec.stop()
        })
    }

    function release() {
        if (stream) {
            stream.getTracks().forEach((t) => t.stop())
            stream = null
        }
        mr = null
    }

    return {
        acquire,
        start,
        stop,
        release,
        get ready() { return !!stream },
    }
}
