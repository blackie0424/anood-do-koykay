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
    { id: 1, title_native: 'Song A', title_zh: '歌 A', audio_full: '/a.mp3', scores_count: 1, status: 'published', book_number: '001', audio_duration: 120 },
    { id: 2, title_native: 'Song B', title_zh: '歌 B', audio_full: null, scores_count: 0, status: 'draft', book_number: '002', audio_duration: null },
    { id: 3, title_native: 'Song C', title_zh: '歌 C', audio_full: '/c.mp3', scores_count: 2, status: 'draft', book_number: '003', audio_duration: 90 },
]

function mountSongs(search = '') {
    Object.defineProperty(window, 'location', {
        value: { href: `http://localhost/admin/songs${search}`, search },
        writable: true,
        configurable: true,
    })
    window.history.replaceState = vi.fn()

    return mount(Songs, {
        props: { songs: mockSongs },
        global: { stubs: { AdminLayout: AdminLayoutStub } },
    })
}

describe('Admin Songs - tab memory', () => {
    it('defaults to all when no query param', async () => {
        const wrapper = mountSongs()
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.filter).toBe('all')
    })

    it('restores filter from URL query param on mount', async () => {
        const wrapper = mountSongs('?tab=draft')
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.filter).toBe('draft')
    })

    it('ignores invalid tab in URL', async () => {
        const wrapper = mountSongs('?tab=invalid')
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.filter).toBe('all')
    })

    it('updates URL when filter changes', async () => {
        const wrapper = mountSongs()
        await wrapper.vm.$nextTick()
        wrapper.vm.filter = 'no-audio'
        await wrapper.vm.$nextTick()
        expect(window.history.replaceState).toHaveBeenCalled()
        const calledUrl = window.history.replaceState.mock.calls[0][2]
        expect(calledUrl).toContain('tab=no-audio')
    })

    it('removes tab param when switching to all', async () => {
        const wrapper = mountSongs('?tab=draft')
        await wrapper.vm.$nextTick()
        wrapper.vm.filter = 'all'
        await wrapper.vm.$nextTick()
        const calledUrl = window.history.replaceState.mock.calls.at(-1)[2]
        expect(calledUrl).not.toContain('tab=')
    })

    it('restores ready tab from URL', async () => {
        const wrapper = mountSongs('?tab=ready')
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.filter).toBe('ready')
    })
})

describe('Admin Songs - ready filter', () => {
    it('shows only draft songs with audio and scores', async () => {
        const wrapper = mountSongs()
        await wrapper.vm.$nextTick()
        wrapper.vm.filter = 'ready'
        await wrapper.vm.$nextTick()
        // Song C: draft + audio_full + scores_count > 0
        expect(wrapper.vm.filteredSongs).toHaveLength(1)
        expect(wrapper.vm.filteredSongs[0].id).toBe(3)
    })

    it('excludes published songs from ready tab', async () => {
        const wrapper = mountSongs()
        await wrapper.vm.$nextTick()
        wrapper.vm.filter = 'ready'
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.filteredSongs.every(s => s.status !== 'published')).toBe(true)
    })

    it('excludes songs without audio from ready tab', async () => {
        const wrapper = mountSongs()
        await wrapper.vm.$nextTick()
        wrapper.vm.filter = 'ready'
        await wrapper.vm.$nextTick()
        expect(wrapper.vm.filteredSongs.every(s => s.audio_full)).toBe(true)
    })
})
