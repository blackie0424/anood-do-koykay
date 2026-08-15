import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { router } from '@inertiajs/vue3'
import SongList from '../Pages/SongList.vue'
import SongPlayer from '../Pages/SongPlayer.vue'

// SongPlayer 冷啟動（isColdLoad prop 為 true）時會呼叫 router.visit 悄悄
// 重新導覽（見 SongPlayer.spec.js 的專門測試），這裡跟分享功能無關；不
// 傳 isColdLoad（預設 false）就不會觸發，但 router.visit 還是先 mock 掉
// 保險。
beforeEach(() => {
    vi.spyOn(router, 'visit').mockImplementation(() => {})
})

const SONGS = {
    data: [
        { id: 1, title_native: 'Do Koykay', title_zh: '飛魚之歌', book_number: '001', audio_full: '/audio/1.mp3' },
    ],
    meta: { current_page: 1, last_page: 1, total: 1, per_page: 20 },
    links: {},
}

const SONG = {
    id: 1,
    title_native: 'Do Koykay',
    title_zh: '飛魚之歌',
    audio_full: '/audio/1.mp3',
    lines: [],
}

describe('SongList — Web Share API 分享按鈕', () => {
    beforeEach(() => {
        global.IntersectionObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    })

    afterEach(() => { vi.restoreAllMocks() })

    it('navigator.share 存在時呼叫 Web Share API', async () => {
        const shareMock = vi.fn().mockResolvedValue(undefined)
        Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true })

        const wrapper = mount(SongList, { props: { songs: SONGS } })
        await wrapper.find('button[aria-label="分享"]').trigger('click')
        await wrapper.vm.$nextTick()

        expect(shareMock).toHaveBeenCalledWith({
            title: 'Do Koykay',
            url: 'https://anood.pongsonotao.org/songs/1',
        })
    })

    it('navigator.share 不存在時 fallback 複製連結', async () => {
        Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
        const clipboardMock = vi.fn().mockResolvedValue(undefined)
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: clipboardMock },
            configurable: true,
        })

        const wrapper = mount(SongList, { props: { songs: SONGS } })
        await wrapper.find('button[aria-label="分享"]').trigger('click')
        await wrapper.vm.$nextTick()

        expect(clipboardMock).toHaveBeenCalledWith('https://anood.pongsonotao.org/songs/1')
        expect(wrapper.find('button[aria-label="已複製"]').exists()).toBe(true)
    })

    it('使用者取消分享（share reject）不顯示錯誤', async () => {
        const shareMock = vi.fn().mockRejectedValue(new DOMException('AbortError'))
        Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true })

        const wrapper = mount(SongList, { props: { songs: SONGS } })
        await wrapper.find('button[aria-label="分享"]').trigger('click')
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).not.toContain('錯誤')
        expect(wrapper.find('button[aria-label="分享"]').exists()).toBe(true)
    })
})

describe('SongPlayer — Web Share API 分享按鈕', () => {
    afterEach(() => { vi.restoreAllMocks() })

    it('navigator.share 存在時呼叫 Web Share API', async () => {
        const shareMock = vi.fn().mockResolvedValue(undefined)
        Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true })

        const wrapper = mount(SongPlayer, { props: { song: SONG } })
        await wrapper.find('button[aria-label="分享"]').trigger('click')
        await wrapper.vm.$nextTick()

        expect(shareMock).toHaveBeenCalledWith({
            title: 'Do Koykay',
            url: 'https://anood.pongsonotao.org/songs/1',
        })
    })

    it('navigator.share 不存在時 fallback 複製連結', async () => {
        Object.defineProperty(navigator, 'share', { value: undefined, configurable: true })
        const clipboardMock = vi.fn().mockResolvedValue(undefined)
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: clipboardMock },
            configurable: true,
        })

        const wrapper = mount(SongPlayer, { props: { song: SONG } })
        await wrapper.find('button[aria-label="分享"]').trigger('click')
        await wrapper.vm.$nextTick()

        expect(clipboardMock).toHaveBeenCalledWith('https://anood.pongsonotao.org/songs/1')
        expect(wrapper.find('button[aria-label="已複製"]').exists()).toBe(true)
    })

    it('使用者取消分享（share reject）不顯示錯誤', async () => {
        const shareMock = vi.fn().mockRejectedValue(new DOMException('AbortError'))
        Object.defineProperty(navigator, 'share', { value: shareMock, configurable: true })

        const wrapper = mount(SongPlayer, { props: { song: SONG } })
        await wrapper.find('button[aria-label="分享"]').trigger('click')
        await wrapper.vm.$nextTick()

        expect(wrapper.text()).not.toContain('錯誤')
        expect(wrapper.find('button[aria-label="分享"]').exists()).toBe(true)
    })
})
