import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import AppButton from '../Components/AppButton.vue'
import BackLink from '../Components/BackLink.vue'
import PlayBar from '../Components/PlayBar.vue'
import ReportModal from '../Components/ReportModal.vue'
import ConsentModal from '../Components/ConsentModal.vue'
import SongList from '../Pages/SongList.vue'
import SongPlayer from '../Pages/SongPlayer.vue'
import SongReader from '../Pages/SongReader.vue'
import { resetClickSoundForTesting } from '../composables/useClickSound'

vi.mock('axios', () => ({ default: { post: vi.fn(), get: vi.fn() } }))

if (typeof Element !== 'undefined') {
    Element.prototype.scrollIntoView = Element.prototype.scrollIntoView || (() => {})
}
if (typeof HTMLMediaElement !== 'undefined') {
    HTMLMediaElement.prototype.pause = () => {}
    HTMLMediaElement.prototype.load = () => {}
}

const SONG = {
    id: 1,
    title_native: 'Do Koykay',
    title_zh: '飛魚之歌',
    book_number: '044',
    audio_full: '/audio/1.mp3',
    lines: [{ id: 1, order: 1, text_native: 'Maomaw', start_time: 2.0, end_time: 6.0 }],
}

const PAGINATED = { data: [SONG], meta: { current_page: 1, last_page: 1, total: 1, per_page: 20 }, links: {} }

beforeEach(() => {
    resetClickSoundForTesting()
    global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }
})
afterEach(() => resetClickSoundForTesting())

// 前台每個可點擊元素都應該經過 AppButton，才會有統一的音效與按壓回饋。
// 這組測試防止日後有人直接寫 <button> 而繞過共用元件。
describe('點擊回饋整合 — 前台元件都改用 AppButton', () => {
    const cases = [
        ['BackLink', () => mount(BackLink)],
        ['PlayBar', () => mount(PlayBar)],
        ['ReportModal', () => mount(ReportModal, { props: { songId: 1 } })],
        ['SongList', () => mount(SongList, { props: { songs: PAGINATED } })],
        ['SongPlayer', () => mount(SongPlayer, { props: { song: SONG } })],
        ['SongReader', () => mount(SongReader, { props: { song: SONG } })],
    ]

    // 不斷言精確數量（會隨 UI 調整而脆弱），改斷言真正的不變式：
    // 畫面上不能有繞過 AppButton 的裸 <button>。
    for (const [name, factory] of cases) {
        it(`${name} 沒有繞過 AppButton 的裸 <button>`, () => {
            const wrapper = factory()
            const appButtons = wrapper.findAllComponents(AppButton)
            const bare = wrapper.findAll('button').filter(
                (b) => !appButtons.some((a) => a.element === b.element)
            )

            expect(bare).toHaveLength(0)
        })

        it(`${name} 至少有一個 AppButton（確認真的有遷移）`, () => {
            expect(factory().findAllComponents(AppButton).length).toBeGreaterThan(0)
        })
    }

    // ConsentModal 用 Teleport 送到 body，元件樹查不到，改由 DOM 驗證
    // 按鈕帶有 AppButton 才會加上的按壓回饋樣式
    it('ConsentModal 的兩顆按鈕都經過 AppButton', () => {
        sessionStorage.clear()
        const wrapper = mount(ConsentModal, { attachTo: document.body })
        const overlay = document.querySelector('[data-testid="consent-overlay"]')
        const buttons = [...overlay.querySelectorAll('button')]

        expect(buttons).toHaveLength(2)
        for (const b of buttons) {
            expect(b.className).toContain('active:scale-[0.97]')
        }
        wrapper.unmount()
    })
})

// 點歌詞行是「開始播放音樂」，這時發出 beep 會跟音樂撞在一起；
// 覆蓋層與遮罩同理，它們語意上也不是按鈕。
describe('點擊回饋整合 — 刻意不發聲的區域', () => {
    it('歌詞行不是 AppButton（點了會開始播放音樂，不該再發 beep）', () => {
        const wrapper = mount(SongPlayer, { props: { song: SONG } })
        const lyric = wrapper.findAll('p').find((p) => p.text() === 'Maomaw')
        const inButton = wrapper.findAllComponents(AppButton)
            .some((b) => b.element.contains(lyric.element))

        expect(inButton).toBe(false)
    })

    it('「點擊開始播放」覆蓋層不是 AppButton', () => {
        const wrapper = mount(SongPlayer, { props: { song: SONG } })
        const overlay = wrapper.find('[aria-label="點擊開始播放"]')

        expect(overlay.exists()).toBe(true)
        expect(overlay.element.tagName).not.toBe('BUTTON')
    })
})

// PlayBar 內部會在處理中忽略點擊，這時不該發聲——聽到聲音卻沒反應會誤導
describe('點擊回饋整合 — 被忽略的點擊不發聲', () => {
    it('PlayBar 停用時點擊不發聲也不送出事件', async () => {
        const ctx = { state: 'running', currentTime: 0, destination: {}, resume: vi.fn(),
            createOscillator: vi.fn(() => ({ frequency: {}, connect: vi.fn(), start: vi.fn(), stop: vi.fn() })),
            createGain: vi.fn(() => ({ gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() })) }
        window.AudioContext = vi.fn(() => ctx)

        const wrapper = mount(PlayBar, { props: { disabled: true } })
        await wrapper.findComponent(AppButton).trigger('click')

        expect(ctx.createOscillator).not.toHaveBeenCalled()
        expect(wrapper.emitted('play')).toBeFalsy()
    })
})
