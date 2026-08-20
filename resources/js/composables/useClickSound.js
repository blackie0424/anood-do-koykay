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

// iOS 不接受「只呼叫 resume()」當作解鎖——實測（chung 回報）：按了同意、
// 按了聆聽都沒有聲音，直到某首歌真正播放過之後，所有按鈕才突然開始有聲音。
// 那是 <audio> 播放把音訊輸出解鎖了，不是我們解的。
//
// iOS 的要求是「在使用者手勢中真的播放一個音訊節點」，公認做法是播一個
// 一個取樣點的無聲緩衝。這裡改用這個方式，並在第一次點擊任何按鈕時就做，
// 不能只靠同意畫面——同意狀態存在 sessionStorage，重新整理或從 LINE 再次
// 進入時那個畫面根本不會出現。
let unlocked = false

function unlockAudio(ctx) {
    // 自己包 try：解鎖失敗（環境不支援 createBuffer 等）不該連帶讓 beep 也
    // 播不出來——在不需要解鎖的平台上（桌機）beep 本來就能正常播放
    try {
        ctx.resume?.()

        const buffer = ctx.createBuffer(1, 1, 22050)
        const source = ctx.createBufferSource()
        source.buffer = buffer
        source.connect(ctx.destination)
        source.start(0)
    } catch {
        // 靜默，仍標記為已嘗試，避免每次點擊都重試
    }
    unlocked = true
}

// 可在已知的第一個手勢（同意條款）提前解鎖，讓那一次點擊就有聲音
export function warmUpClickSound() {
    try {
        const ctx = getContext()
        if (ctx && !unlocked) unlockAudio(ctx)
    } catch {
        // 解鎖失敗不影響按鈕功能；下次點擊會再試一次
    }
}

// 維持同步：先前改成 async 並 await resume() 是錯的修法——在尚未解鎖的
// 狀態下那個 Promise 可能遲遲不 resolve，導致 beep 永遠沒被排程，正是
// 「一路沒聲音、直到歌曲播放過才全部正常」的原因。
export function playClickSound() {
    try {
        const ctx = getContext()
        if (!ctx) return

        // 這裡一定在使用者手勢中（由按鈕點擊觸發），是合法的解鎖時機
        if (!unlocked) unlockAudio(ctx)

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
    unlocked = false
}

export function useClickSound() {
    return { playClickSound, warmUpClickSound }
}
