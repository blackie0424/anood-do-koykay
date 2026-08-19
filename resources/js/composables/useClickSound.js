// 全站共用的點擊音效：短促 beep，讓使用者（多為長者）確認「有按到」。
//
// 為什麼要共用單一 AudioContext：原本 PlayBar 每次點擊都 new 一個，瀏覽器
// 對同時存在的 AudioContext 數量有上限，連續快速點擊可能堆積並開始失敗。
// 這裡改成整站只建立一個、重複使用。
//
// iOS 限制：AudioContext 必須在使用者手勢中建立，且切到背景後可能被暫停，
// 所以每次播放前都嘗試 resume()。全程包 try/catch——音效只是輔助回饋，
// 任何環境問題都應該靜默失敗，不能影響按鈕本身的功能。

const FREQUENCY_HZ = 800
const DURATION_S = 0.08
const PEAK_GAIN = 0.2

let sharedContext = null

function getContext() {
    if (typeof window === 'undefined') return null

    const AudioContextClass = window.AudioContext || window.webkitAudioContext
    if (!AudioContextClass) return null

    if (!sharedContext) sharedContext = new AudioContextClass()
    return sharedContext
}

export function playClickSound() {
    try {
        const ctx = getContext()
        if (!ctx) return

        // 切回前景時 context 可能還是 suspended，先喚醒
        if (ctx.state === 'suspended') ctx.resume?.()

        const oscillator = ctx.createOscillator()
        const gain = ctx.createGain()

        oscillator.frequency.value = FREQUENCY_HZ
        oscillator.connect(gain)
        gain.connect(ctx.destination)

        const now = ctx.currentTime
        gain.gain.setValueAtTime(PEAK_GAIN, now)
        gain.gain.exponentialRampToValueAtTime(0.0001, now + DURATION_S)

        oscillator.start(now)
        oscillator.stop(now + DURATION_S)
    } catch {
        // 不支援或被瀏覽器政策擋下時靜默，不影響按鈕功能
    }
}

// 測試用：清掉共用實例，讓每個測試從乾淨狀態開始
export function resetClickSoundForTesting() {
    sharedContext = null
}

export function useClickSound() {
    return { playClickSound }
}
