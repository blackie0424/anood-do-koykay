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

    it('返回元件用深色背景適用的字色（歌詞頁是深色主題）', () => {
        const wrapper = mountReader()
        const backLink = wrapper.findComponent(BackLink)

        expect(backLink.props('theme')).toBe('dark')
        expect(backLink.classes()).toContain('text-stone-300')
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
