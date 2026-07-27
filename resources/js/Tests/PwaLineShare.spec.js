import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import SongList from '../Pages/SongList.vue'
import SongPlayer from '../Pages/SongPlayer.vue'

const MOBILE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1'
const DESKTOP_UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'

const SONGS = [
    { id: 1, title_native: 'Do Koykay', title_zh: '飛魚之歌', book_number: '001', audio_full: '/audio/1.mp3' },
]

const SONG = {
    id: 1,
    title_native: 'Do Koykay',
    title_zh: '飛魚之歌',
    audio_full: '/audio/1.mp3',
    lines: [],
}

function mockMatchMedia(isStandalone) {
    return vi.fn().mockImplementation(query => ({
        matches: query === '(display-mode: standalone)' ? isStandalone : false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
    }))
}

describe('SongList — LINE 分享按鈕 PWA 隱藏', () => {
    let originalUA
    beforeEach(() => { originalUA = navigator.userAgent })
    afterEach(() => { Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true }) })

    it('行動裝置非 PWA：顯示 LINE 按鈕', () => {
        Object.defineProperty(navigator, 'userAgent', { value: MOBILE_UA, configurable: true })
        window.matchMedia = mockMatchMedia(false)
        Object.defineProperty(window.navigator, 'standalone', { value: undefined, configurable: true })

        const wrapper = mount(SongList, { props: { songs: SONGS } })
        expect(wrapper.find('a[aria-label="分享到 LINE"]').exists()).toBe(true)
    })

    it('行動裝置 PWA standalone mode：隱藏 LINE 按鈕', () => {
        Object.defineProperty(navigator, 'userAgent', { value: MOBILE_UA, configurable: true })
        window.matchMedia = mockMatchMedia(true)
        Object.defineProperty(window.navigator, 'standalone', { value: undefined, configurable: true })

        const wrapper = mount(SongList, { props: { songs: SONGS } })
        expect(wrapper.find('a[aria-label="分享到 LINE"]').exists()).toBe(false)
    })

    it('行動裝置 navigator.standalone=true：隱藏 LINE 按鈕', () => {
        Object.defineProperty(navigator, 'userAgent', { value: MOBILE_UA, configurable: true })
        window.matchMedia = mockMatchMedia(false)
        Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true })

        const wrapper = mount(SongList, { props: { songs: SONGS } })
        expect(wrapper.find('a[aria-label="分享到 LINE"]').exists()).toBe(false)
    })

    it('桌機非 PWA：不顯示 LINE 按鈕（非行動裝置）', () => {
        Object.defineProperty(navigator, 'userAgent', { value: DESKTOP_UA, configurable: true })
        window.matchMedia = mockMatchMedia(false)

        const wrapper = mount(SongList, { props: { songs: SONGS } })
        expect(wrapper.find('a[aria-label="分享到 LINE"]').exists()).toBe(false)
    })
})

describe('SongPlayer — LINE 分享按鈕 PWA 隱藏', () => {
    let originalUA
    beforeEach(() => { originalUA = navigator.userAgent })
    afterEach(() => { Object.defineProperty(navigator, 'userAgent', { value: originalUA, configurable: true }) })

    it('行動裝置非 PWA：顯示 LINE 按鈕', () => {
        Object.defineProperty(navigator, 'userAgent', { value: MOBILE_UA, configurable: true })
        window.matchMedia = mockMatchMedia(false)
        Object.defineProperty(window.navigator, 'standalone', { value: undefined, configurable: true })

        const wrapper = mount(SongPlayer, { props: { song: SONG } })
        expect(wrapper.find('a[aria-label="分享到 LINE"]').exists()).toBe(true)
    })

    it('行動裝置 PWA standalone mode：隱藏 LINE 按鈕', () => {
        Object.defineProperty(navigator, 'userAgent', { value: MOBILE_UA, configurable: true })
        window.matchMedia = mockMatchMedia(true)
        Object.defineProperty(window.navigator, 'standalone', { value: undefined, configurable: true })

        const wrapper = mount(SongPlayer, { props: { song: SONG } })
        expect(wrapper.find('a[aria-label="分享到 LINE"]').exists()).toBe(false)
    })

    it('行動裝置 navigator.standalone=true：隱藏 LINE 按鈕', () => {
        Object.defineProperty(navigator, 'userAgent', { value: MOBILE_UA, configurable: true })
        window.matchMedia = mockMatchMedia(false)
        Object.defineProperty(window.navigator, 'standalone', { value: true, configurable: true })

        const wrapper = mount(SongPlayer, { props: { song: SONG } })
        expect(wrapper.find('a[aria-label="分享到 LINE"]').exists()).toBe(false)
    })
})
