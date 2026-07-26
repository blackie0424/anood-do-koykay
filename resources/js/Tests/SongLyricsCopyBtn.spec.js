import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SongLyrics from '../Pages/Admin/SongLyrics.vue'

vi.mock('@inertiajs/vue3', () => ({
    usePage: () => ({ props: { auth: { user: { role: 'admin' } } } }),
    Link: { template: '<a><slot /></a>' },
}))
vi.mock('axios', () => ({ default: { post: vi.fn(), put: vi.fn() } }))

const AdminLayoutStub = { template: '<div><slot /></div>' }

function makeSong(lines = []) {
    return {
        id: 1,
        title_native: 'Do Koykay',
        title_zh: '',
        audio_full: null,
        audio_start: null,
        audio_end: null,
        scores: [],
        lines: lines.length ? lines : [
            { order: 1, text_native: 'Maomaw', start_time: null, end_time: null },
            { order: 2, text_native: 'Anood',  start_time: null, end_time: null },
        ],
    }
}

function mountLyrics(song = makeSong()) {
    return mount(SongLyrics, {
        props: { song },
        global: { stubs: { AdminLayout: AdminLayoutStub } },
    })
}

describe('SongLyrics — 複製歌詞按鈕', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('預設顯示「複製歌詞」', () => {
        const wrapper = mountLyrics()
        expect(wrapper.find('[data-testid="copy-lyrics-btn"]').text()).toBe('複製歌詞')
    })

    it('複製成功：clipboard.writeText 收到所有歌詞行以換行串接', async () => {
        const writeText = vi.fn().mockResolvedValue(undefined)
        vi.stubGlobal('navigator', { clipboard: { writeText } })

        const wrapper = mountLyrics()
        await wrapper.find('[data-testid="copy-lyrics-btn"]').trigger('click')
        await wrapper.vm.$nextTick()

        expect(writeText).toHaveBeenCalledWith('Maomaw\nAnood')
    })

    it('複製成功：按鈕顯示「已複製 ✓」並套用綠色', async () => {
        vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })

        const wrapper = mountLyrics()
        await wrapper.find('[data-testid="copy-lyrics-btn"]').trigger('click')
        await wrapper.vm.$nextTick()

        const btn = wrapper.find('[data-testid="copy-lyrics-btn"]')
        expect(btn.text()).toBe('已複製 ✓')
        expect(btn.classes()).toContain('text-green-600')
    })

    it('複製失敗：按鈕顯示「複製失敗」並套用紅色', async () => {
        vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockRejectedValue(new Error('denied')) } })

        const wrapper = mountLyrics()
        await wrapper.find('[data-testid="copy-lyrics-btn"]').trigger('click')
        await wrapper.vm.$nextTick()

        const btn = wrapper.find('[data-testid="copy-lyrics-btn"]')
        expect(btn.text()).toBe('複製失敗')
        expect(btn.classes()).toContain('text-red-500')
    })

    it('空行（text_native 為空字串）保留為空行', async () => {
        vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn().mockResolvedValue(undefined) } })

        const wrapper = mountLyrics(makeSong([
            { order: 1, text_native: 'Line A', start_time: null, end_time: null },
            { order: 2, text_native: 'Line B', start_time: null, end_time: null },
        ]))
        wrapper.vm.addLine()
        await wrapper.vm.$nextTick()

        const writeText = vi.mocked((await import('axios')).default.post)
        const clipboardSpy = vi.fn().mockResolvedValue(undefined)
        vi.stubGlobal('navigator', { clipboard: { writeText: clipboardSpy } })

        await wrapper.find('[data-testid="copy-lyrics-btn"]').trigger('click')
        await wrapper.vm.$nextTick()

        expect(clipboardSpy).toHaveBeenCalledWith('Line A\nLine B\n')
    })
})
