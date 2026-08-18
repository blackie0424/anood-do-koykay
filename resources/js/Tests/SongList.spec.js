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

        it('按鈕列可換行，放不下時不會溢出卡片', () => {
            const wrapper = card()
            const row = wrapper.find('a[aria-label="聆聽音樂"]').element.parentElement

            expect(row.className).toContain('flex-wrap')
        })

        function cardWithBookNumber() {
            return mount(SongList, {
                props: { songs: paginated([{ ...mockSongs[0], book_number: '064' }]) },
                global: { stubs: { Link: { inheritAttrs: false, template: '<a v-bind="$attrs"><slot /></a>' } } },
            })
        }

        it('書號不佔用歌名的寬度（不在標題節點內）', () => {
            const wrapper = cardWithBookNumber()
            const title = wrapper.findAll('p').find((el) => el.text() === 'Do Koykay')

            expect(title).toBeDefined()
            expect(title.text()).not.toContain('[064]')
        })

        it('三顆圓形圖示（頁碼／分享／聆聽）尺寸一致且有上限', () => {
            const wrapper = cardWithBookNumber()
            const icons = [
                wrapper.find('[data-testid="book-number"]'),
                wrapper.find('button[aria-label="分享"]'),
                wrapper.find('a[aria-label="聆聽音樂"]'),
            ]

            for (const icon of icons) {
                expect(icon.exists()).toBe(true)
                expect(icon.classes()).toContain('rounded-full')
                expect(icon.classes()).toContain('min-w-[64px]')
                expect(icon.classes()).toContain('min-h-[64px]')
                // 有上限，才不會跟著系統字體無限放大
                expect(icon.classes()).toContain('max-w-[88px]')
                expect(icon.classes()).toContain('max-h-[88px]')
                // 不得再出現會隨字體縮放的尺寸單位
                for (const bad of ['w-10', 'h-10', 'w-20', 'h-20', 'min-w-20', 'min-h-20', 'min-w-[80px]', 'min-h-[80px]']) {
                    expect(icon.classes()).not.toContain(bad)
                }
            }
        })

        it('頁碼圖示顯示 📖 與頁數', () => {
            const wrapper = cardWithBookNumber()
            const bookNumber = wrapper.find('[data-testid="book-number"]')

            expect(bookNumber.text()).toContain('📖')
            expect(bookNumber.text()).toContain('064')
        })

        it('點頁碼圖示會進入該首歌的歌詞閱讀模式', () => {
            const wrapper = cardWithBookNumber()
            const bookNumber = wrapper.find('[data-testid="book-number"]')

            expect(bookNumber.attributes('href')).toBe('/songs/1/reader')
        })

        it('書號提供可讀的無障礙標籤（📖 本身對輔助科技隱藏）', () => {
            const wrapper = cardWithBookNumber()
            const bookNumber = wrapper.find('[data-testid="book-number"]')

            expect(bookNumber.attributes('aria-label')).toBe('歌本第 064 頁，開啟歌詞閱讀模式')
            expect(bookNumber.find('[aria-hidden="true"]').text()).toBe('📖')
        })

        it('書號與分享、聆聽在同一列（不另外多佔一行）', () => {
            const wrapper = cardWithBookNumber()
            const bookNumber = wrapper.find('[data-testid="book-number"]')
            const listen = wrapper.find('a[aria-label="聆聽音樂"]')

            expect(bookNumber.exists()).toBe(true)
            // 兩者同屬按鈕列這個容器（書號直屬、按鈕在其右側群組內）
            const row = bookNumber.element.parentElement
            expect(row.contains(listen.element)).toBe(true)
        })

        it('書號靠最左、按鈕群組靠右（用 ml-auto 推開）', () => {
            const wrapper = cardWithBookNumber()
            const bookNumber = wrapper.find('[data-testid="book-number"]')
            const row = bookNumber.element.parentElement

            // 書號是列中第一個元素
            expect(row.firstElementChild).toBe(bookNumber.element)
            // 按鈕群組用 ml-auto 靠右
            const buttonGroup = wrapper.find('a[aria-label="聆聽音樂"]').element.parentElement
            expect(buttonGroup.className).toContain('ml-auto')
        })

        it('沒有書號時按鈕群組仍靠右', () => {
            const wrapper = card() // mockSongs 沒有 book_number
            const buttonGroup = wrapper.find('a[aria-label="聆聽音樂"]').element.parentElement

            expect(wrapper.find('[data-testid="book-number"]').exists()).toBe(false)
            expect(buttonGroup.className).toContain('ml-auto')
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
