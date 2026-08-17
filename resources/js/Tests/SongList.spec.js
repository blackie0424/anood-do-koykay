import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach } from 'vitest'
import SongList from '../Pages/SongList.vue'

const mockSongs = [
    { id: 1, title_native: 'Do Koykay', title_zh: '飛魚之歌', audio_full: '/audio/1.mp3' },
    { id: 2, title_native: 'Anood', title_zh: '海浪', audio_full: null },
]

function paginated(data, overrides = {}) {
    return {
        data,
        meta: { current_page: 1, last_page: 1, total: data.length, per_page: 20, ...overrides },
        links: {},
    }
}

describe('SongList', () => {
    beforeEach(() => {
        global.IntersectionObserver = class {
            observe() {}
            unobserve() {}
            disconnect() {}
        }
    })

    it('renders song titles', () => {
        const wrapper = mount(SongList, {
            props: { songs: paginated(mockSongs) },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })
        expect(wrapper.text()).toContain('Do Koykay')
        expect(wrapper.text()).toContain('Anood')
    })

    it('renders chinese titles', () => {
        const wrapper = mount(SongList, {
            props: { songs: paginated(mockSongs) },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })
        expect(wrapper.text()).toContain('飛魚之歌')
    })

    it('shows empty message when no songs', () => {
        const wrapper = mount(SongList, {
            props: { songs: paginated([]) },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })
        expect(wrapper.text()).toContain('尚無歌曲')
    })

    it('renders listen link only for songs with audio', () => {
        const wrapper = mount(SongList, {
            props: { songs: paginated(mockSongs) },
            global: { stubs: { Link: { inheritAttrs: false, template: '<a v-bind="$attrs"><slot /></a>' } } },
        })
        expect(wrapper.findAll('a[aria-label="聆聽音樂"]')).toHaveLength(1)
    })

    // 大字體手機：裡面的「▶」和「聆聽」會超出固定 80px 的圓，
    // 固定尺寸會裁掉或撐破外框，改用最小尺寸讓圓形跟著長大
    it('聆聽鈕用最小尺寸而非固定尺寸，大字體時不會裁切內容', () => {
        const wrapper = mount(SongList, {
            props: { songs: paginated(mockSongs) },
            global: { stubs: { Link: { inheritAttrs: false, template: '<a v-bind="$attrs"><slot /></a>' } } },
        })
        const listen = wrapper.find('a[aria-label="聆聽音樂"]')

        expect(listen.classes()).toContain('min-w-20')
        expect(listen.classes()).toContain('min-h-20')
        expect(listen.classes()).not.toContain('w-20')
        expect(listen.classes()).not.toContain('h-20')
    })
})
