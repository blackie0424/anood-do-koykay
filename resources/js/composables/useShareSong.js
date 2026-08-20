import { ref, onScopeDispose } from 'vue'

// 分享出去的網址一律指向正式站。刻意不用 window.location.origin：測試或
// 預覽環境會把測試網址散佈到 LINE 群組裡，長輩點了會進到不對的站
// （chung 決定維持寫死，集中成這一個常數）
export const SHARE_BASE_URL = 'https://anood.pongsonotao.org'

const COPIED_FEEDBACK_MS = 2000

export function songShareUrl(songId) {
    return `${SHARE_BASE_URL}/songs/${songId}`
}

export function useShareSong() {
    // 用歌曲 id 而非布林值：歌曲清單頁同時有很多顆分享鈕，需要知道是哪一顆
    // 被按。播放頁只有一首歌，比對自己的 id 即可
    const copiedId = ref(null)
    let timer = null

    async function share(song) {
        const url = songShareUrl(song.id)

        if (navigator.share) {
            try {
                await navigator.share({ title: song.title_native, url })
            } catch {
                // 使用者取消分享不處理
            }
            return
        }

        // LINE 舊版 WebView 與非 HTTPS 環境沒有 navigator.clipboard，
        // 舊版 SongList 少了這道防護，點分享會直接丟例外
        if (!navigator.clipboard?.writeText) return

        try {
            await navigator.clipboard.writeText(url)
        } catch {
            // 權限被拒等情況：什麼都沒複製到，就不該跟使用者說「已複製」
            return
        }

        copiedId.value = song.id
        clearTimeout(timer)
        timer = setTimeout(() => { copiedId.value = null }, COPIED_FEEDBACK_MS)
    }

    onScopeDispose(() => clearTimeout(timer))

    return { copiedId, share }
}
