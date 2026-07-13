import { mount } from '@vue/test-utils'
import { describe, it, expect } from 'vitest'
import SongList from '../Pages/SongList.vue'

const mockSongs = [
    { id: 1, title_native: 'Do Koykay', title_zh: '飛魚之歌', audio_full: '/audio/1.mp3' },
    { id: 2, title_native: 'Anood', title_zh: '海浪', audio_full: null },
]

describe('SongList', () => {
    it('renders song titles', () => {
        const wrapper = mount(SongList, {
            props: { songs: mockSongs },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })
        expect(wrapper.text()).toContain('Do Koykay')
        expect(wrapper.text()).toContain('Anood')
    })

    it('renders chinese titles', () => {
        const wrapper = mount(SongList, {
            props: { songs: mockSongs },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })
        expect(wrapper.text()).toContain('飛魚之歌')
    })

    it('shows empty message when no songs', () => {
        const wrapper = mount(SongList, {
            props: { songs: [] },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })
        expect(wrapper.text()).toContain('尚無歌曲')
    })

    it('renders a play link for each song', () => {
        const wrapper = mount(SongList, {
            props: { songs: mockSongs },
            global: { stubs: { Link: { template: '<a><slot /></a>' } } },
        })
        expect(wrapper.findAll('a[aria-label="進入歌曲"]')).toHaveLength(2)
    })
})
