import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import Songs from '../Pages/Admin/Songs.vue'

vi.mock('@inertiajs/vue3', () => ({
    usePage: () => ({ props: { auth: { user: { role: 'admin' } } } }),
    Link: { template: '<a href="#"><slot /></a>' },
    router: { reload: vi.fn() },
}))
vi.mock('axios', () => ({ default: { delete: vi.fn() } }))

const AdminLayoutStub = { template: '<div><slot /></div>' }

const mockSongs = [
    { id: 1, title_native: 'A', title_zh: '', audio_full: '/a.mp3', scores_count: 1, status: 'published',      book_number: '001', audio_duration: 60 },
    { id: 2, title_native: 'B', title_zh: '', audio_full: null,     scores_count: 0, status: 'draft',          book_number: '002', audio_duration: null },
    { id: 3, title_native: 'C', title_zh: '', audio_full: null,     scores_count: 2, status: 'pending_review', book_number: '003', audio_duration: null },
    { id: 4, title_native: 'D', title_zh: '', audio_full: '/d.mp3', scores_count: 1, status: 'pending_review', book_number: '004', audio_duration: 90 },
]

function mountSongs(search = '') {
    Object.defineProperty(window, 'location', {
        value: { href: `http://localhost/admin/songs${search}`, search },
        writable: true, configurable: true,
    })
    window.history.replaceState = vi.fn()
    return mount(Songs, {
        props: { songs: mockSongs },
        global: { stubs: { AdminLayout: AdminLayoutStub } },
    })
}

describe('Songs - pending_review tab', () => {
    it('shows only pending_review songs', async () => {
        const wrapper = mountSongs()
        wrapper.vm.filter = 'pending_review'
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.filteredSongs).toHaveLength(2)
        expect(wrapper.vm.filteredSongs.every(s => s.status === 'pending_review')).toBe(true)
    })

    it('restores pending_review from URL', async () => {
        const wrapper = mountSongs('?tab=pending_review')
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.filter).toBe('pending_review')
    })

    it('pending_review tab is in VALID_TABS', () => {
        const wrapper = mountSongs()
        expect(wrapper.vm.VALID_TABS ?? ['all','no-audio','no-score','draft','ready','pending_review','published'])
            .toContain('pending_review')
    })
})
