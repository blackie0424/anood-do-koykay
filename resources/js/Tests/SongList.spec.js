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

    // 大字體手機：卡片跑版（文字與聆聽鈕溢出白色區塊）
    describe('大字體時不能撐破卡片', () => {
        function card(wrapper) {
            return mount(SongList, {
                props: { songs: paginated(mockSongs) },
                global: { stubs: { Link: { inheritAttrs: false, template: '<a v-bind="$attrs"><slot /></a>' } } },
            })
        }

        it('聆聽鈕的最小尺寸用固定像素，不會隨字體放大成無法壓縮的硬下限', () => {
            const wrapper = card()
            const listen = wrapper.find('a[aria-label="聆聽音樂"]')

            expect(listen.classes()).toContain('min-w-[80px]')
            expect(listen.classes()).toContain('min-h-[80px]')
            // min-w-20 / w-20 這類會隨字體縮放的單位都不該再出現
            for (const cls of ['min-w-20', 'min-h-20', 'w-20', 'h-20']) {
                expect(listen.classes()).not.toContain(cls)
            }
        })

        it('按鈕列可換行，放不下時不會溢出卡片', () => {
            const wrapper = card()
            const row = wrapper.find('a[aria-label="聆聽音樂"]').element.parentElement

            expect(row.className).toContain('flex-wrap')
        })

        it('歌名長單字會斷行，不會衝出白色區塊', () => {
            const wrapper = card()
            const title = wrapper.findAll('p').find((el) => el.text().includes('Do Koykay'))

            expect(title.classes()).toContain('break-words')
        })
    })
})
