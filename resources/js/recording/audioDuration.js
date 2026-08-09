/**
 * 取得錄音 blob 的實際時長（毫秒）。
 *
 * 用 Web Audio 的 decodeAudioData 直接解碼聲音內容來算長度，
 * 不依賴檔案標頭——Safari 的 MediaRecorder mp4 缺時長標頭，但解碼仍可得到正確秒數。
 * 無法取得時回傳 null（呼叫端可退回其他估算方式）。
 */
export async function getBlobDuration(blob) {
    const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
    if (!AC || !blob || typeof blob.arrayBuffer !== 'function') return null
    const ctx = new AC()
    try {
        const arrayBuffer = await blob.arrayBuffer()
        const decoded = await new Promise((resolve, reject) => {
            const ret = ctx.decodeAudioData(arrayBuffer, resolve, reject)
            if (ret && typeof ret.then === 'function') ret.then(resolve, reject)
        })
        return Math.round(decoded.duration * 1000)
    } catch {
        return null
    } finally {
        try { ctx.close && ctx.close() } catch { /* noop */ }
    }
}
