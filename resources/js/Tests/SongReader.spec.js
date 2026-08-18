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

        await wrapper.find('button[class*="flex-1"]').trigger('click')

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
        const next = wrapper.findAll('button').find((el) => el.text().includes('下一段'))

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
