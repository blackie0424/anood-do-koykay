import { mount } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'

vi.mock('@inertiajs/vue3', () => ({
    usePage: () => ({ props: { auth: { user: { role: 'admin' } } } }),
    Link: { template: '<a><slot /></a>' },
    useForm: () => ({
        email: '',
        password: '',
        errors: {},
        processing: false,
        post: vi.fn(),
    }),
    router: { reload: vi.fn() },
}))

vi.mock('axios', () => ({ default: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn() } }))

const AdminLayoutStub = { template: '<div><slot /></div>' }
const stubs = { AdminLayout: AdminLayoutStub }

// ── Admin/SongMedia ──────────────────────────────────────────────────

describe('Admin/SongMedia', () => {
    it('mount 不拋錯，顯示標題', async () => {
        const { default: SongMedia } = await import('../Pages/Admin/SongMedia.vue')
        const song = {
            id: 1,
            title_native: 'Do Koykay',
            score_image: null,
            audio_full: null,
            audio_start: null,
            audio_end: null,
            scores: [],
        }
        const wrapper = mount(SongMedia, {
            props: { song },
            global: { stubs },
        })
        expect(wrapper.text()).toContain('Do Koykay')
    })
})

// ── Admin/SongEdit ──────────────────────────────────────────────────

describe('Admin/SongEdit', () => {
    it('create mode：mount 不拋錯，顯示新增歌曲', async () => {
        const { default: SongEdit } = await import('../Pages/Admin/SongEdit.vue')
        const wrapper = mount(SongEdit, {
            props: { song: null },
            global: { stubs },
        })
        expect(wrapper.text()).toContain('新增歌曲')
    })

    it('edit mode：mount 不拋錯，顯示編輯歌曲', async () => {
        const { default: SongEdit } = await import('../Pages/Admin/SongEdit.vue')
        const wrapper = mount(SongEdit, {
            props: { song: { id: 1, title_native: 'Anood', title_zh: '', status: 'draft', book_number: '5' } },
            global: { stubs },
        })
        expect(wrapper.text()).toContain('編輯歌曲')
    })
})

// ── Admin/Users ──────────────────────────────────────────────────────

describe('Admin/Users', () => {
    it('mount 不拋錯，顯示使用者管理標題', async () => {
        const { default: Users } = await import('../Pages/Admin/Users.vue')
        const wrapper = mount(Users, {
            props: { users: [] },
            global: { stubs },
        })
        expect(wrapper.text()).toContain('使用者管理')
    })
})

// ── Admin/Reports ─────────────────────────────────────────────────────

describe('Admin/Reports', () => {
    it('mount 不拋錯，顯示問題回報標題', async () => {
        const { default: Reports } = await import('../Pages/Admin/Reports.vue')
        const wrapper = mount(Reports, {
            props: { reports: [] },
            global: { stubs },
        })
        expect(wrapper.text()).toContain('問題回報')
    })
})

// ── Auth/Login ────────────────────────────────────────────────────────

describe('Auth/Login', () => {
    it('mount 不拋錯，顯示登入表單', async () => {
        const { default: Login } = await import('../Pages/Auth/Login.vue')
        const wrapper = mount(Login, {
            props: {},
            global: { stubs },
        })
        expect(wrapper.text()).toContain('後台管理登入')
    })
})
