import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import Songs from '../Pages/Admin/Songs.vue'

let role = 'admin'

vi.mock('@inertiajs/vue3', () => ({
    usePage: () => ({ props: { auth: { user: { role } } } }),
    Link: { template: '<a href="#"><slot /></a>' },
    router: { reload: vi.fn() },
}))

vi.mock('axios', () => ({ default: { delete: vi.fn() } }))

const AdminLayoutStub = { template: '<div><slot /></div>' }

// 手建資料，預期數字為固定值：
// 全部 6／無音訊 2（id 2、5）／無歌譜 3（id 2、4、5）／草稿 4（id 2、3、4、5）
// 待發布 1（id 3：非已發布、有音訊、有歌譜）／未審核 2（id 4、5）／已發布 2（id 1、6）
const songs = [
    { id: 1, title_native: 'Alpha', title_zh: '甲', audio_full: '/1.mp3', scores_count: 1, status: 'published', book_number: '001' },
    { id: 2, title_native: 'Beta', title_zh: '乙', audio_full: null, scores_count: 0, status: 'draft', book_number: '002' },
    { id: 3, title_native: 'Gamma', title_zh: '丙', audio_full: '/3.mp3', scores_count: 2, status: 'draft', book_number: '003' },
    { id: 4, title_native: 'Delta', title_zh: '丁', audio_full: '/4.mp3', scores_count: 0, status: 'pending_review', book_number: '004' },
    { id: 5, title_native: 'Epsilon', title_zh: '戊', audio_full: null, scores_count: 0, status: 'pending_review', book_number: '005' },
    { id: 6, title_native: 'Zeta', title_zh: '己', audio_full: '/6.mp3', scores_count: 1, status: 'published', book_number: '006' },
]

function mountSongs(list = songs, userRole = 'admin') {
    role = userRole
    Object.defineProperty(window, 'location', {
        value: { href: 'http://localhost/admin/songs', search: '' },
        writable: true,
        configurable: true,
    })
    window.history.replaceState = vi.fn()
    return mount(Songs, {
        props: { songs: list },
        global: { stubs: { AdminLayout: AdminLayoutStub } },
    })
}

const optionTexts = (w) => w.findAll('select option').map(o => o.text())

describe('Admin Songs - 篩選數量', () => {
    it('每個選項帶出該類別的歌曲數', () => {
        const w = mountSongs()
        expect(optionTexts(w)).toEqual([
            '全部 (6)',
            '無音訊 (2)',
            '無歌譜 (3)',
            '草稿 (4)',
            '待發布 (1)',
            '未審核 (2)',
            '已發布 (2)',
        ])
    })

    it('搜尋不改變選項數量，但「共 N 首」跟著變', async () => {
        const w = mountSongs()
        await w.find('input[type="search"]').setValue('Alpha')
        expect(optionTexts(w)).toContain('全部 (6)')
        expect(optionTexts(w)).toContain('無音訊 (2)')
        expect(w.text()).toContain('共 1 首')
    })

    it('選了篩選後「共 N 首」等於該選項數量', async () => {
        const w = mountSongs()
        await w.find('select').setValue('no-score')
        expect(w.text()).toContain('共 3 首')
    })

    it('沒有任何歌曲的類別顯示 (0)，沒有結果時顯示「共 0 首」與「尚無歌曲」', async () => {
        const onlyPublished = [songs[0], songs[5]]
        const w = mountSongs(onlyPublished)
        expect(optionTexts(w)).toEqual([
            '全部 (2)',
            '無音訊 (0)',
            '無歌譜 (0)',
            '草稿 (0)',
            '待發布 (0)',
            '未審核 (0)',
            '已發布 (2)',
        ])
        await w.find('select').setValue('draft')
        expect(w.text()).toContain('共 0 首')
        expect(w.text()).toContain('尚無歌曲')
    })

    it('歌曲清單為空時全部 (0)、共 0 首', () => {
        const w = mountSongs([])
        expect(optionTexts(w)[0]).toBe('全部 (0)')
        expect(w.text()).toContain('共 0 首')
    })

    it('編輯者看到與管理員相同的數量', () => {
        const admin = optionTexts(mountSongs(songs, 'admin'))
        const editor = optionTexts(mountSongs(songs, 'editor'))
        expect(editor).toEqual(admin)
    })
})
