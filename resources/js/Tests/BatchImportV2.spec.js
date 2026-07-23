import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import BatchImport from '../Pages/Admin/BatchImport.vue'

vi.mock('@inertiajs/vue3', () => ({
    usePage: () => ({ props: { auth: { user: { role: 'admin' } } } }),
    Link: { template: '<a href="#"><slot /></a>' },
    router: { reload: vi.fn() },
}))

vi.mock('axios', () => ({ default: { post: vi.fn() } }))

const AdminLayoutStub = { template: '<div><slot /></div>' }

function mountBatchImport() {
    return mount(BatchImport, {
        global: { stubs: { AdminLayout: AdminLayoutStub } },
    })
}

function makeResult(page, status = 'waiting') {
    return {
        file: new File([''], `page${page}.jpg`, { type: 'image/jpeg' }),
        page,
        status,
        url: null,
        matched_songs: [],
        selectedSongId: null,
        attachError: '',
    }
}

describe('BatchImport v2 — tab 切換', () => {
    it('預設顯示作業 A', () => {
        const wrapper = mountBatchImport()
        expect(wrapper.vm.activeTab).toBe('A')
        expect(wrapper.find('[data-testid="tab-A-panel"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="tab-B-panel"]').exists()).toBe(false)
    })

    it('點擊 tab B 切換到作業 B', async () => {
        const wrapper = mountBatchImport()
        await wrapper.find('[data-testid="tab-B"]').trigger('click')
        expect(wrapper.vm.activeTab).toBe('B')
        expect(wrapper.find('[data-testid="tab-B-panel"]').exists()).toBe(true)
        expect(wrapper.find('[data-testid="tab-A-panel"]').exists()).toBe(false)
    })
})

describe('BatchImport v2 — 作業 B 三種狀態', () => {
    beforeEach(() => { vi.clearAllMocks() })

    it('auto：單首對應時顯示自動對應成功', async () => {
        const axios = (await import('axios')).default
        vi.mocked(axios.post).mockResolvedValueOnce({
            data: {
                url: 'https://cdn.example.com/5.jpg',
                matched_songs: [{ id: 1, title_native: 'Do Koykay' }],
                auto_attached: true,
            },
        })

        const wrapper = mountBatchImport()
        wrapper.vm.scoreResults = [makeResult(5)]
        await wrapper.vm.processScores()

        expect(wrapper.vm.scoreResults[0].status).toBe('auto')
        expect(wrapper.vm.scoreResults[0].matched_songs).toHaveLength(1)
    })

    it('multi：多首對應時顯示候選清單且不自動掛上', async () => {
        const axios = (await import('axios')).default
        vi.mocked(axios.post).mockResolvedValueOnce({
            data: {
                url: 'https://cdn.example.com/5.jpg',
                matched_songs: [
                    { id: 1, title_native: 'Song A' },
                    { id: 2, title_native: 'Song B' },
                ],
                auto_attached: false,
            },
        })

        const wrapper = mountBatchImport()
        wrapper.vm.scoreResults = [makeResult(5)]
        await wrapper.vm.processScores()

        expect(wrapper.vm.scoreResults[0].status).toBe('multi')
        expect(wrapper.vm.scoreResults[0].matched_songs).toHaveLength(2)
        expect(wrapper.vm.scoreResults[0].selectedSongId).toBe(1)
    })

    it('none：無對應歌曲時顯示找不到', async () => {
        const axios = (await import('axios')).default
        vi.mocked(axios.post).mockResolvedValueOnce({
            data: {
                url: 'https://cdn.example.com/99.jpg',
                matched_songs: [],
                auto_attached: false,
            },
        })

        const wrapper = mountBatchImport()
        wrapper.vm.scoreResults = [makeResult(99)]
        await wrapper.vm.processScores()

        expect(wrapper.vm.scoreResults[0].status).toBe('none')
    })

    it('attachScore：multi 確認掛上後 status 變 attached', async () => {
        const axios = (await import('axios')).default
        vi.mocked(axios.post).mockResolvedValueOnce({ data: { attached: true } })

        const wrapper = mountBatchImport()
        const result = { ...makeResult(5), status: 'multi', url: 'https://cdn.example.com/5.jpg', selectedSongId: 1, matched_songs: [{ id: 1, title_native: 'Song A' }] }
        wrapper.vm.scoreResults = [result]

        await wrapper.vm.attachScore(wrapper.vm.scoreResults[0])
        expect(wrapper.vm.scoreResults[0].status).toBe('attached')
    })

    it('extractPage 從檔名正確解析頁碼', () => {
        const wrapper = mountBatchImport()
        expect(wrapper.vm.extractPage('anood no tao 5.png')).toBe(5)
        expect(wrapper.vm.extractPage('anood no tao 30.png')).toBe(30)
        expect(wrapper.vm.extractPage('page99.jpg')).toBe(99)
        expect(wrapper.vm.extractPage('nopage.jpg')).toBe(null)
    })
})
