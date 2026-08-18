import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, afterEach } from 'vitest'
import { router } from '@inertiajs/vue3'
import BackLink from '../Components/BackLink.vue'

function setHistoryLength(n) {
    Object.defineProperty(window.history, 'length', { configurable: true, value: n })
}

afterEach(() => { vi.restoreAllMocks() })

describe('BackLink', () => {
    it('預設 label 為「返回」，可自訂', () => {
        expect(mount(BackLink).text()).toContain('返回')
        expect(mount(BackLink, { props: { label: '返回清單' } }).text()).toContain('返回清單')
    })

    it('size=lg 用大字、預設 sm 用小字', () => {
        const lg = mount(BackLink, { props: { size: 'lg' } })
        expect(lg.find('button').classes()).toContain('text-lg')
        expect(lg.find('button').classes()).toContain('font-bold')
        expect(mount(BackLink).find('button').classes()).toContain('text-sm')
    })

    it('有瀏覽歷史時點擊呼叫 history.back', async () => {
        setHistoryLength(2)
        const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
        const visit = vi.spyOn(router, 'visit').mockImplementation(() => {})
        const wrapper = mount(BackLink)
        await wrapper.find('button').trigger('click')
        expect(back).toHaveBeenCalled()
        expect(visit).not.toHaveBeenCalled()
    })

    it('無瀏覽歷史時點擊導向首頁（router.visit）', async () => {
        setHistoryLength(1)
        const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
        const visit = vi.spyOn(router, 'visit').mockImplementation(() => {})
        const wrapper = mount(BackLink)
        await wrapper.find('button').trigger('click')
        expect(visit).toHaveBeenCalledWith('/')
        expect(back).not.toHaveBeenCalled()
    })

    it('父層綁定 @click 時交給父層、不做 history 導覽', async () => {
        setHistoryLength(2)
        const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
        const onClick = vi.fn()
        const wrapper = mount(BackLink, { attrs: { onClick } })
        await wrapper.find('button').trigger('click')
        expect(onClick).toHaveBeenCalled()
        expect(back).not.toHaveBeenCalled()
    })

    // 歌詞閱讀頁是深色主題，預設的深色字在深色背景上看不見
    it('預設（淺色背景）使用深色字', () => {
        const wrapper = mount(BackLink)

        expect(wrapper.classes()).toContain('text-stone-600')
    })

    it('theme="dark"（深色背景）改用淺色字', () => {
        const wrapper = mount(BackLink, { props: { theme: 'dark' } })

        expect(wrapper.classes()).toContain('text-stone-300')
        expect(wrapper.classes()).not.toContain('text-stone-600')
    })

    it('切換 theme 不影響返回行為（仍是同一個共用元件）', async () => {
        const back = vi.spyOn(window.history, 'back').mockImplementation(() => {})
        const wrapper = mount(BackLink, { props: { theme: 'dark' } })

        await wrapper.trigger('click')

        expect(back).toHaveBeenCalled()
        back.mockRestore()
    })
})
