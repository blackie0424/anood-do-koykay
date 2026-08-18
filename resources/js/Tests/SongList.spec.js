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

        it('書號獨立一行，不與歌名擠在同一行（大字級下書號會吃掉近半寬度）', () => {
            const withBookNumber = [{ ...mockSongs[0], book_number: '064' }]
            const wrapper = mount(SongList, {
                props: { songs: paginated(withBookNumber) },
                global: { stubs: { Link: { inheritAttrs: false, template: '<a v-bind="$attrs"><slot /></a>' } } },
            })
            const bookNumber = wrapper.findAll('p').find((el) => el.text() === '[064]')
            const title = wrapper.findAll('p').find((el) => el.text() === 'Do Koykay')

            expect(bookNumber).toBeDefined()
            expect(title).toBeDefined()
            // 兩者是各自獨立的段落，不是同一個節點裡的兩段文字
            expect(bookNumber.element).not.toBe(title.element)
            expect(title.text()).not.toContain('[064]')
        })

        it('卡片內距用固定像素，不會隨字體放大而吃掉歌名寬度', () => {
            const wrapper = card()
            const cardEl = wrapper.find('a[aria-label="聆聽音樂"]').element.closest('.bg-white')

            expect(cardEl.className).toContain('p-[24px]')
            expect(cardEl.className).not.toContain('p-6')
        })

        it('歌名多行時讓斷行平均分佈（text-wrap: balance）', () => {
            const wrapper = card()
            const title = wrapper.findAll('p').find((el) => el.text() === 'Do Koykay')

            expect(title.classes()).toContain('[text-wrap:balance]')
        })

        it('歌名長單字會斷行，不會衝出白色區塊', () => {
            const wrapper = card()
            const title = wrapper.findAll('p').find((el) => el.text() === 'Do Koykay')

            expect(title.classes()).toContain('break-words')
        })
    })
})
