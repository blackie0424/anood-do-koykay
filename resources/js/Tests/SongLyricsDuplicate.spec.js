import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import SongLyrics from '../Pages/Admin/SongLyrics.vue'

vi.mock('@inertiajs/vue3', () => ({
    usePage: () => ({ props: { auth: { user: { role: 'admin' } } } }),
    Link: { template: '<a><slot /></a>' },
}))

vi.mock('axios', () => ({ default: { post: vi.fn(), put: vi.fn() } }))

const AdminLayoutStub = { template: '<div><slot /></div>' }

function mockSong(lines = []) {
    return {
        id: 1,
        title_native: 'Test',
        title_zh: '測試',
        audio_full: null,
        audio_start: null,
        audio_end: null,
        scores: [],
        lines: lines.length ? lines : [
            { order: 1, text_native: 'A行', start_time: 1.0, end_time: 2.0 },
            { order: 2, text_native: 'B行', start_time: 2.0, end_time: 3.0 },
            { order: 3, text_native: 'C行', start_time: 3.0, end_time: 4.0 },
        ],
    }
}

function mountLyrics(song) {
    return mount(SongLyrics, {
        props: { song },
        global: {
            stubs: { AdminLayout: AdminLayoutStub },
        },
    })
}

describe('SongLyrics - duplicateLines', () => {
    it('appends copied lines to the end with times cleared', async () => {
        const wrapper = mountLyrics(mockSong())
        await wrapper.find('[data-testid="duplicate-from"]').setValue(1)
        await wrapper.find('[data-testid="duplicate-to"]').setValue(2)
        await wrapper.find('[data-testid="duplicate-btn"]').trigger('click')

        const vm = wrapper.vm
        expect(vm.lines).toHaveLength(5)
        expect(vm.lines[3].text_native).toBe('A行')
        expect(vm.lines[3].start_time).toBeNull()
        expect(vm.lines[3].end_time).toBeNull()
        expect(vm.lines[4].text_native).toBe('B行')
    })

    it('reassigns order after duplicate', async () => {
        const wrapper = mountLyrics(mockSong())
        await wrapper.find('[data-testid="duplicate-from"]').setValue(1)
        await wrapper.find('[data-testid="duplicate-to"]').setValue(3)
        await wrapper.find('[data-testid="duplicate-btn"]').trigger('click')

        const vm = wrapper.vm
        vm.lines.forEach((l, i) => {
            expect(l.order).toBe(i + 1)
        })
    })

    it('shows error when from > total', async () => {
        const wrapper = mountLyrics(mockSong())
        await wrapper.find('[data-testid="duplicate-from"]').setValue(5)
        await wrapper.find('[data-testid="duplicate-to"]').setValue(6)
        await wrapper.find('[data-testid="duplicate-btn"]').trigger('click')

        expect(wrapper.find('[data-testid="duplicate-error"]').exists()).toBe(true)
        expect(wrapper.vm.lines).toHaveLength(3)
    })

    it('shows error when to < from', async () => {
        const wrapper = mountLyrics(mockSong())
        await wrapper.find('[data-testid="duplicate-from"]').setValue(3)
        await wrapper.find('[data-testid="duplicate-to"]').setValue(1)
        await wrapper.find('[data-testid="duplicate-btn"]').trigger('click')

        expect(wrapper.find('[data-testid="duplicate-error"]').exists()).toBe(true)
        expect(wrapper.vm.lines).toHaveLength(3)
    })

    it('clears error on successful duplicate', async () => {
        const wrapper = mountLyrics(mockSong())
        // trigger error first
        await wrapper.find('[data-testid="duplicate-from"]').setValue(5)
        await wrapper.find('[data-testid="duplicate-to"]').setValue(6)
        await wrapper.find('[data-testid="duplicate-btn"]').trigger('click')
        expect(wrapper.find('[data-testid="duplicate-error"]').exists()).toBe(true)

        // then valid operation
        await wrapper.find('[data-testid="duplicate-from"]').setValue(1)
        await wrapper.find('[data-testid="duplicate-to"]').setValue(1)
        await wrapper.find('[data-testid="duplicate-btn"]').trigger('click')
        expect(wrapper.find('[data-testid="duplicate-error"]').exists()).toBe(false)
    })
})
