/**
 * 預設錄音器工廠：以 getUserMedia + MediaRecorder 錄一段音檔。
 *
 * 回傳 async factory，呼叫後取得單次使用的 recorder：
 *   start()  → 開始錄音
 *   stop()   → Promise<Blob>，並釋放麥克風
 */
export function createMediaRecorderFactory() {
    return async function createRecorder() {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        const mr = new MediaRecorder(stream)
        const chunks = []
        mr.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data) }

        return {
            start() { mr.start() },
            stop() {
                return new Promise((resolve) => {
                    mr.onstop = () => {
                        stream.getTracks().forEach((t) => t.stop())
                        resolve(new Blob(chunks, { type: mr.mimeType || 'audio/webm' }))
                    }
                    mr.stop()
                })
            },
        }
    }
}
