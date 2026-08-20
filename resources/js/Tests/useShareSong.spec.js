import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useShareSong, songShareUrl, SHARE_BASE_URL } from '../composables/useShareSong'

const SONG = { id: 42, title_native: 'Anood no Tao' }

function stubNavigator({ share, clipboard } = {}) {
    Object.defineProperty(navigator, 'share', { value: share, configurable: true, writable: true })
    Object.defineProperty(navigator, 'clipboard', { value: clipboard, configurable: true, writable: true })
}

beforeEach(() => { vi.useFakeTimers() })
afterEach(() => {
    vi.useRealTimers()
    stubNavigator({ share: undefined, clipboard: undefined })
})

describe('songShareUrl', () => {
    // chung 決定：網址維持寫死正式站，不用 window.location.origin，
    // 否則測試/預覽環境會把測試網址分享出去
    it('永遠指向正式站，不受目前網域影響', () => {
        expect(songShareUrl(42)).toBe('https://anood.pongsonotao.org/songs/42')
        expect(songShareUrl(42).startsWith(SHARE_BASE_URL)).toBe(true)
    })
})

describe('useShareSong — 支援原生分享時', () => {
    it('呼叫 navigator.share 並帶入歌名與網址', async () => {
        const share = vi.fn().mockResolvedValue(undefined)
        stubNavigator({ share })
        const s = useShareSong()

        await s.share(SONG)

        expect(share).toHaveBeenCalledWith({ title: 'Anood no Tao', url: songShareUrl(42) })
    })

    it('使用者取消分享時不丟例外、也不顯示已複製', async () => {
        stubNavigator({ share: vi.fn().mockRejectedValue(new Error('AbortError')) })
        const s = useShareSong()

        await expect(s.share(SONG)).resolves.toBeUndefined()
        expect(s.copiedId.value).toBeNull()
    })

    it('有原生分享時不會去碰剪貼簿', async () => {
        const writeText = vi.fn()
        stubNavigator({ share: vi.fn().mockResolvedValue(undefined), clipboard: { writeText } })
        const s = useShareSong()

        await s.share(SONG)

        expect(writeText).not.toHaveBeenCalled()
    })
})

describe('useShareSong — 退回複製網址時', () => {
    it('複製成功後標記該首歌為已複製', async () => {
        stubNavigator({ clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
        const s = useShareSong()

        await s.share(SONG)

        expect(s.copiedId.value).toBe(42)
    })

    it('2 秒後自動清除已複製狀態', async () => {
        stubNavigator({ clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
        const s = useShareSong()
        await s.share(SONG)

        await vi.advanceTimersByTimeAsync(2000)

        expect(s.copiedId.value).toBeNull()
    })

    // 這是原本 SongList.vue 的真實錯誤：沒有防護，LINE 舊版 WebView 或
    // 非 HTTPS 環境沒有 navigator.clipboard，點分享會直接丟例外
    it('沒有 clipboard API 時不丟例外', async () => {
        stubNavigator({ clipboard: undefined })
        const s = useShareSong()

        await expect(s.share(SONG)).resolves.toBeUndefined()
    })

    it('沒有 clipboard API 時不顯示已複製（原本會謊稱複製成功）', async () => {
        stubNavigator({ clipboard: undefined })
        const s = useShareSong()

        await s.share(SONG)

        expect(s.copiedId.value).toBeNull()
    })

    it('剪貼簿寫入被拒絕時不丟例外、也不顯示已複製', async () => {
        stubNavigator({ clipboard: { writeText: vi.fn().mockRejectedValue(new Error('NotAllowed')) } })
        const s = useShareSong()

        await expect(s.share(SONG)).resolves.toBeUndefined()
        expect(s.copiedId.value).toBeNull()
    })

    it('連續分享不同歌曲時，只有最後一首顯示已複製', async () => {
        stubNavigator({ clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })
        const s = useShareSong()

        await s.share(SONG)
        await vi.advanceTimersByTimeAsync(1500)
        await s.share({ id: 7, title_native: '另一首' })
        // 第一首的計時器若沒被取消，這裡會把第二首的狀態一起清掉
        await vi.advanceTimersByTimeAsync(600)

        expect(s.copiedId.value).toBe(7)
    })
})
