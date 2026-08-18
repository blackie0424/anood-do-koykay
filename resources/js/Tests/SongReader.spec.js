import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import BackLink from '../Components/BackLink.vue'
import SongReader from '../Pages/SongReader.vue'

const SONG = {
    id: 1,
    title_native: 'Do Koykay',
    lines: [
        { id: 1, order: 1, text_native: 'Maomaw' },
        { id: 2, order: 2, text_native: 'Anood' },
    ],
}

function mountReader(song = SONG) {
    return mount(SongReader, {
        props: { song },
        global: { stubs: { Link: { inheritAttrs: false, template: '<a v-bind="$attrs"><slot /></a>' } } },
    })
}

describe('SongReader — 返回上一頁', () => {
    beforeEach(() => localStorage.clear())

    it('頂部有返回上一頁，且用的是與播放頁相同的共用元件 BackLink', () => {
        const wrapper = mountReader()

        expect(wrapper.findComponent(BackLink).exists()).toBe(true)
    })

    it('返回元件用預設（淺底深字）色系，與其他頁面一致', () => {
        const wrapper = mountReader()

        expect(wrapper.findComponent(BackLink).classes()).toContain('text-stone-600')
    })

    it('返回元件用大字級，與播放頁一致', () => {
        const wrapper = mountReader()

        expect(wrapper.findComponent(BackLink).props('size')).toBe('lg')
    })
})

describe('SongReader — 基本行為（確認加入返回鍵未影響既有功能）', () => {
    beforeEach(() => localStorage.clear())

    it('顯示第一段歌詞與進度', () => {
        const wrapper = mountReader()

        expect(wrapper.text()).toContain('Maomaw')
        expect(wrapper.text()).toContain('第 1 段 / 共 2 段')
    })

    it('點下一段會前進', async () => {
        const wrapper = mountReader()

        await wrapper.find('button[aria-label="下一段"]').trigger('click')

        expect(wrapper.text()).toContain('Anood')
        expect(wrapper.text()).toContain('第 2 段 / 共 2 段')
    })

    it('過濾掉空白歌詞行', () => {
        const wrapper = mountReader({
            ...SONG,
            lines: [
                { id: 1, order: 1, text_native: 'Maomaw' },
                { id: 2, order: 2, text_native: '   ' },
            ],
        })

        expect(wrapper.text()).toContain('第 1 段 / 共 1 段')
    })
})

describe('SongReader — 高齡友善配色（避開深色模式）', () => {
    beforeEach(() => localStorage.clear())

    it('用暖色淺底深字，不是深色模式', () => {
        const wrapper = mountReader()
        const root = wrapper.findAll('div').find((d) => d.classes().includes('min-h-dvh')).classes()

        expect(root).toContain('bg-amber-50')
        expect(root).toContain('text-stone-900')
        // 深色模式的底色與字色都不該再出現
        expect(root).not.toContain('bg-stone-900')
        expect(root).not.toContain('text-white')
    })

    it('歌詞主文字用最高對比的深色（實測 16.9:1，遠高於 AAA 的 7:1）', () => {
        const wrapper = mountReader()
        const lyric = wrapper.findAll('p').find((el) => el.text() === 'Maomaw')

        expect(lyric.classes()).toContain('text-stone-900')
    })

    it('主要動作用 blue-700 而非 blue-600（白字對比 5.2:1 → 6.7:1）', () => {
        const wrapper = mountReader()
        const next = wrapper.find('button[aria-label="下一段"]')

        expect(next.classes()).toContain('bg-blue-700')
        expect(next.classes()).toContain('text-white')
        expect(next.classes()).not.toContain('bg-blue-600')
    })

    it('控制項不再使用半透明白（bg-white/xx），那只在深色底上成立', () => {
        const wrapper = mountReader()
        const html = wrapper.html()

        expect(html).not.toContain('bg-white/10')
        expect(html).not.toContain('bg-white/20')
        expect(html).not.toContain('bg-white/50')
    })
})

describe('SongReader — 上一段／下一段只留箭頭圖示', () => {
    beforeEach(() => localStorage.clear())

    it('兩顆按鈕只顯示箭頭，不顯示「上一段」「下一段」文字', () => {
        const wrapper = mountReader()
        const prevBtn = wrapper.find('button[aria-label="上一段"]')
        const nextBtn = wrapper.find('button[aria-label="下一段"]')

        expect(prevBtn.text()).toBe('←')
        expect(nextBtn.text()).toBe('→')
        expect(wrapper.text()).not.toContain('上一段')
        expect(wrapper.text()).not.toContain('下一段')
    })

    it('文字拿掉後仍有無障礙名稱，螢幕閱讀器讀得到用途', () => {
        const wrapper = mountReader()

        expect(wrapper.find('button[aria-label="上一段"]').exists()).toBe(true)
        expect(wrapper.find('button[aria-label="下一段"]').exists()).toBe(true)
    })

    it('箭頭字級有上限，不會跟著系統字體無限放大', () => {
        const wrapper = mountReader()

        expect(wrapper.find('button[aria-label="上一段"]').classes()).toContain('text-[min(1.5rem,30px)]')
        expect(wrapper.find('button[aria-label="下一段"]').classes()).toContain('text-[min(1.75rem,34px)]')
    })

    it('最後一段的「結束」保留文字（不同性質的動作，沒有通用圖示）', async () => {
        const wrapper = mountReader()
        await wrapper.find('button[aria-label="下一段"]').trigger('click')

        expect(wrapper.text()).toContain('結束')
        expect(wrapper.find('button[aria-label="下一段"]').exists()).toBe(false)
    })

    it('第一段時上一段為停用狀態', () => {
        const wrapper = mountReader()

        expect(wrapper.find('button[aria-label="上一段"]').attributes('disabled')).toBeDefined()
    })
})
