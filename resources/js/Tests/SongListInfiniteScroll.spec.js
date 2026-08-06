import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import SongList from '../Pages/SongList.vue'

vi.mock('axios', () => ({
    default: { get: vi.fn() },
}))

import axios from 'axios'

function paginated(data, overrides = {}) {
    return {
        data,
        meta: { current_page: 1, last_page: 1, total: data.length, per_page: 20, ...overrides },
        links: {},
    }
}

const SONG = (id, overrides = {}) => ({
    id,
    title_native: `Song ${id}`,
    title_zh: `歌曲 ${id}`,
    book_number: String(id).padStart(3, '0'),
    audio_full: null,
    ...overrides,
})

let observedCallback = null

function stubIntersectionObserver() {
    global.IntersectionObserver = class {
        constructor(callback) {
            observedCallback = callback
        }
        observe() {}
        unobserve() {}
        disconnect() {}
    }
}

async function flush() {
    await Promise.resolve()
    await Promise.resolve()
}

describe('SongList — infinite scroll', () => {
    beforeEach(() => {
        stubIntersectionObserver()
        vi.clearAllMocks()
    })

    it('捲到底部且還有下一頁時，打 API 載入下一頁並附加到清單', async () => {
        const page1 = [SONG(1), SONG(2)]
        const page2 = [SONG(3)]
        axios.get.mockResolvedValue({ data: paginated(page2, { current_page: 2, last_page: 2, total: 3 }) })

        const wrapper = mount(SongList, {
            props: { songs: paginated(page1, { current_page: 1, last_page: 2, total: 3 }) },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })

        observedCallback([{ isIntersecting: true }])
        await flush()

        expect(axios.get).toHaveBeenCalledWith('/api/songs', { params: { page: 2 } })
        expect(wrapper.text()).toContain('Song 3')
    })

    it('已經是最後一頁時，不再打 API', async () => {
        const page1 = [SONG(1)]

        mount(SongList, {
            props: { songs: paginated(page1, { current_page: 1, last_page: 1, total: 1 }) },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })

        observedCallback([{ isIntersecting: true }])
        await flush()

        expect(axios.get).not.toHaveBeenCalled()
    })
})

describe('SongList — 搜尋', () => {
    beforeEach(() => {
        stubIntersectionObserver()
        vi.clearAllMocks()
        vi.useFakeTimers()
    })

    afterEach(() => {
        vi.useRealTimers()
    })

    it('輸入關鍵字 debounce 300ms 後才打 API', async () => {
        axios.get.mockResolvedValue({ data: paginated([SONG(1)]) })

        const wrapper = mount(SongList, {
            props: { songs: paginated([SONG(1), SONG(2)]) },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })

        await wrapper.find('input[type="search"]').setValue('Song 1')
        expect(axios.get).not.toHaveBeenCalled()

        vi.advanceTimersByTime(299)
        expect(axios.get).not.toHaveBeenCalled()

        vi.advanceTimersByTime(1)
        expect(axios.get).toHaveBeenCalledWith('/api/songs', { params: { q: 'Song 1' } })
    })

    it('搜尋結果取代清單，不做 infinite scroll', async () => {
        axios.get.mockResolvedValue({ data: paginated([SONG(9, { title_native: 'Matched Song' })]) })

        const wrapper = mount(SongList, {
            props: { songs: paginated([SONG(1), SONG(2)], { last_page: 3 }) },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })

        await wrapper.find('input[type="search"]').setValue('Matched')
        vi.advanceTimersByTime(300)
        await flush()

        expect(wrapper.text()).toContain('Matched Song')
        expect(wrapper.text()).not.toContain('Song 1')

        vi.clearAllMocks()
        observedCallback?.([{ isIntersecting: true }])
        await flush()
        expect(axios.get).not.toHaveBeenCalled()
    })

    it('清空搜尋框後恢復原本的 infinite scroll 清單', async () => {
        axios.get.mockResolvedValue({ data: paginated([SONG(9, { title_native: 'Matched Song' })]) })

        const wrapper = mount(SongList, {
            props: { songs: paginated([SONG(1), SONG(2)]) },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })

        await wrapper.find('input[type="search"]').setValue('Matched')
        vi.advanceTimersByTime(300)
        await flush()
        expect(wrapper.text()).toContain('Matched Song')

        await wrapper.find('input[type="search"]').setValue('')
        await flush()

        expect(wrapper.text()).toContain('Song 1')
        expect(wrapper.text()).not.toContain('Matched Song')
    })

    it('搜尋中顯示 loading 狀態', async () => {
        let resolveRequest
        axios.get.mockReturnValue(new Promise((resolve) => { resolveRequest = resolve }))

        const wrapper = mount(SongList, {
            props: { songs: paginated([SONG(1)]) },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })

        await wrapper.find('input[type="search"]').setValue('Song')
        vi.advanceTimersByTime(300)
        await flush()

        expect(wrapper.text()).toContain('搜尋中')

        resolveRequest({ data: paginated([SONG(1)]) })
        await flush()
        expect(wrapper.text()).not.toContain('搜尋中')
    })

    it('搜尋無結果時顯示找不到符合的歌曲', async () => {
        axios.get.mockResolvedValue({ data: paginated([]) })

        const wrapper = mount(SongList, {
            props: { songs: paginated([SONG(1)]) },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })

        await wrapper.find('input[type="search"]').setValue('不存在')
        vi.advanceTimersByTime(300)
        await flush()

        expect(wrapper.text()).toContain('找不到符合的歌曲')
    })
})
