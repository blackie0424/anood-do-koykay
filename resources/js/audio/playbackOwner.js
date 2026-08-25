// 全站同時只准一個音源出聲。
//
// 這個站有三個彼此獨立、互不知情的音源：播放頁的 <audio>、錄音頁預覽使用者
// 錄音的 Audio、以及錄音頁播原唱的 Audio。過去每個都各自播、各自停，跨越
// 頁面與覆蓋層的邊界時就會疊加出聲（chung 2026-08-24 回報）。每加一個入口
// 就要記得補一次 pause，遲早會漏——所以把「誰在出聲」收斂成這一個狀態。
//
// 刻意不做的事：不攔截 visibilitychange。長輩可能鎖上螢幕、把手機放在旁邊
// 聽詩歌，切到背景不該停止播放（chung 2026-08-24 確認）。

let owner = null

// 取得播放權：停掉前一個持有者。呼叫端仍需自己呼叫 play()，
// 想要一次做完兩件事請用 playExclusive()。
export function claimPlayback(element) {
    if (!element) return
    if (owner && owner !== element) {
        try {
            owner.pause?.()
        } catch {
            // 舊音源可能已被卸載或處於奇怪狀態。停不掉它不該擋住使用者
            // 現在要聽的東西，所以吞掉並繼續換手。
        }
    }
    owner = element
}

// 釋放播放權。只有現任持有者能釋放，避免別人誤清掉狀態。
export function releasePlayback(element) {
    if (element && owner === element) owner = null
}

export function playExclusive(element) {
    if (!element) return undefined
    claimPlayback(element)
    return element.play?.()
}

export function resetPlaybackOwnerForTesting() {
    owner = null
}
