import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import BackLink from '../Components/BackLink.vue'
import SongReader from '../Pages/SongReader.vue'
import { noopReaderTouchListener } from '../utils/readerPassiveTouchListeners'

const SONG = {
    id: 1,
    title_native: 'Do Koykay',
    lines: [
        { id: 1, order: 1, text_native: 'Maomaw' },
        { id: 2, order: 2, text_native: 'Anood' },
    ],
}

function mountReader(song = SONG) {
    return mount(SongReader, {
        props: { song },
        global: { stubs: { Link: { inheritAttrs: false, template: '<a v-bind="$attrs"><slot /></a>' } } },
    })
}

describe('SongReader — 返回上一頁', () => {
    beforeEach(() => localStorage.clear())

    it('頂部有返回上一頁，且用的是與播放頁相同的共用元件 BackLink', () => {
        const wrapper = mountReader()

        expect(wrapper.findComponent(BackLink).exists()).toBe(true)
    })

    it('返回元件用預設（淺底深字）色系，與其他頁面一致', () => {
        const wrapper = mountReader()

        expect(wrapper.findComponent(BackLink).classes()).toContain('text-stone-600')
    })

    it('返回元件用大字級，與播放頁一致', () => {
        const wrapper = mountReader()

        expect(wrapper.findComponent(BackLink).props('size')).toBe('lg')
    })
})

describe('SongReader — 基本行為（確認加入返回鍵未影響既有功能）', () => {
    beforeEach(() => localStorage.clear())

    it('顯示第一段歌詞與進度', () => {
        const wrapper = mountReader()

        expect(wrapper.text()).toContain('Maomaw')
        expect(wrapper.text()).toContain('第 1 段 / 共 2 段')
    })

    it('點下一段會前進', async () => {
        const wrapper = mountReader()

        await wrapper.find('button[aria-label="下一段"]').trigger('click')

        expect(wrapper.text()).toContain('Anood')
        expect(wrapper.text()).toContain('第 2 段 / 共 2 段')
    })

    it('A+／A- 在停用雙擊縮放後仍能調整歌詞字體', async () => {
        const wrapper = mountReader()
        const lyric = wrapper.findAll('p').find((el) => el.text() === 'Maomaw')
        const buttons = wrapper.findAll('button')
        const decrease = buttons.find((button) => button.text() === 'A-')
        const increase = buttons.find((button) => button.text() === 'A+')

        expect(lyric.attributes('style')).toContain('font-size: 3.5rem')

        await increase.trigger('click')
        expect(lyric.attributes('style')).toContain('font-size: 4rem')

        await decrease.trigger('click')
        expect(lyric.attributes('style')).toContain('font-size: 3.5rem')
    })

    it('過濾掉空白歌詞行', () => {
        const wrapper = mountReader({
            ...SONG,
            lines: [
                { id: 1, order: 1, text_native: 'Maomaw' },
                { id: 2, order: 2, text_native: '   ' },
            ],
        })

        expect(wrapper.text()).toContain('第 1 段 / 共 1 段')
    })
})

describe('SongReader — 高齡友善配色（避開深色模式）', () => {
    beforeEach(() => localStorage.clear())

    it('用暖色淺底深字，不是深色模式', () => {
        const wrapper = mountReader()
        const root = wrapper.findAll('div').find((d) => d.classes().includes('min-h-dvh')).classes()

        expect(root).toContain('bg-amber-50')
        expect(root).toContain('text-stone-900')
        // 深色模式的底色與字色都不該再出現
        expect(root).not.toContain('bg-stone-900')
        expect(root).not.toContain('text-white')
    })

    it('歌詞主文字用最高對比的深色（實測 16.9:1，遠高於 AAA 的 7:1）', () => {
        const wrapper = mountReader()
        const lyric = wrapper.findAll('p').find((el) => el.text() === 'Maomaw')

        expect(lyric.classes()).toContain('text-stone-900')
    })

    it('主要動作用 blue-700 而非 blue-600（白字對比 5.2:1 → 6.7:1）', () => {
        const wrapper = mountReader()
        const next = wrapper.find('button[aria-label="下一段"]')

        expect(next.classes()).toContain('bg-blue-700')
        expect(next.classes()).toContain('text-white')
        expect(next.classes()).not.toContain('bg-blue-600')
    })

    it('控制項不再使用半透明白（bg-white/xx），那只在深色底上成立', () => {
        const wrapper = mountReader()
        const html = wrapper.html()

        expect(html).not.toContain('bg-white/10')
        expect(html).not.toContain('bg-white/20')
        expect(html).not.toContain('bg-white/50')
    })
})

describe('SongReader — 上一段／下一段只留箭頭圖示', () => {
    beforeEach(() => localStorage.clear())

    it('兩顆按鈕只顯示箭頭，不顯示「上一段」「下一段」文字', () => {
        const wrapper = mountReader()
        const prevBtn = wrapper.find('button[aria-label="上一段"]')
        const nextBtn = wrapper.find('button[aria-label="下一段"]')

        expect(prevBtn.text()).toBe('←')
        expect(nextBtn.text()).toBe('→')
        expect(wrapper.text()).not.toContain('上一段')
        expect(wrapper.text()).not.toContain('下一段')
    })

    it('文字拿掉後仍有無障礙名稱，螢幕閱讀器讀得到用途', () => {
        const wrapper = mountReader()

        expect(wrapper.find('button[aria-label="上一段"]').exists()).toBe(true)
        expect(wrapper.find('button[aria-label="下一段"]').exists()).toBe(true)
    })

    it('箭頭字級有上限，不會跟著系統字體無限放大', () => {
        const wrapper = mountReader()

        expect(wrapper.find('button[aria-label="上一段"]').classes()).toContain('text-[min(1.5rem,30px)]')
        expect(wrapper.find('button[aria-label="下一段"]').classes()).toContain('text-[min(1.75rem,34px)]')
    })

    it('最後一段的「結束」保留文字（不同性質的動作，沒有通用圖示）', async () => {
        const wrapper = mountReader()
        await wrapper.find('button[aria-label="下一段"]').trigger('click')

        expect(wrapper.text()).toContain('結束')
        expect(wrapper.find('button[aria-label="下一段"]').exists()).toBe(false)
    })

    it('第一段時上一段為停用狀態', () => {
        const wrapper = mountReader()

        expect(wrapper.find('button[aria-label="上一段"]').attributes('disabled')).toBeDefined()
    })

    it('按鈕列停用雙擊縮放，涵蓋原生停用的上一段按鈕', () => {
        const wrapper = mountReader()
        const prevBtn = wrapper.find('button[aria-label="上一段"]')
        const nextBtn = wrapper.find('button[aria-label="下一段"]')
        const controls = prevBtn.element.parentElement

        expect(controls).toBe(nextBtn.element.parentElement)
        expect(controls.classList).toContain('touch-manipulation')
    })
})

describe('SongReader — 暫時觸控診斷', () => {
    const diagnosticEvents = ['touchstart', 'touchend', 'pointerdown', 'pointerup', 'click', 'dblclick']
    let originalVisualViewport

    beforeEach(() => {
        vi.useFakeTimers()
        originalVisualViewport = Object.getOwnPropertyDescriptor(window, 'visualViewport')
    })

    afterEach(() => {
        vi.useRealTimers()
        if (originalVisualViewport) {
            Object.defineProperty(window, 'visualViewport', originalVisualViewport)
        } else {
            delete window.visualViewport
        }
        vi.restoreAllMocks()
    })

    function stubVisualViewport() {
        const visualViewport = {
            scale: 1,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
        }
        Object.defineProperty(window, 'visualViewport', {
            configurable: true,
            value: visualViewport,
        })
        return visualViewport
    }

    async function enableDiagnostics(wrapper) {
        await wrapper.find('[data-reader-diagnostics-trigger]').trigger('pointerdown')
        vi.advanceTimersByTime(2000)
        await wrapper.vm.$nextTick()
    }

    it('預設關閉時只有常駐 no-op，不註冊面板記錄器或 visualViewport 監聽器', () => {
        const addEventListener = vi.spyOn(document, 'addEventListener')
        const visualViewport = stubVisualViewport()

        const wrapper = mountReader()

        expect(wrapper.find('[aria-label="觸控診斷"]').exists()).toBe(false)
        for (const type of diagnosticEvents) {
            const registrations = addEventListener.mock.calls.filter(([eventType]) => eventType === type)
            expect(registrations).toHaveLength(1)
            expect(registrations[0][1]).toBe(noopReaderTouchListener)
        }
        expect(visualViewport.addEventListener).not.toHaveBeenCalled()
        wrapper.unmount()
    })

    it('長按頁碼兩秒才開啟，所有診斷監聽器都是 passive', async () => {
        const addEventListener = vi.spyOn(document, 'addEventListener')
        const removeEventListener = vi.spyOn(document, 'removeEventListener')
        const visualViewport = stubVisualViewport()
        const wrapper = mountReader()

        await wrapper.find('[data-reader-diagnostics-trigger]').trigger('pointerdown')
        vi.advanceTimersByTime(1999)
        await wrapper.vm.$nextTick()
        expect(wrapper.find('[aria-label="觸控診斷"]').exists()).toBe(false)

        vi.advanceTimersByTime(1)
        await wrapper.vm.$nextTick()

        const trigger = wrapper.find('[data-reader-diagnostics-trigger]')
        const panel = wrapper.find('[aria-label="觸控診斷"]')
        const clear = wrapper.find('button[aria-label="清除觸控診斷"]')
        expect(trigger.classes()).toContain('select-none')
        expect(trigger.classes()).toContain('[-webkit-touch-callout:none]')
        expect(panel.classes()).toContain('pointer-events-none')
        expect(clear.classes()).toContain('pointer-events-auto')
        for (const type of diagnosticEvents) {
            const registration = addEventListener.mock.calls.find(
                ([eventType, handler]) => (
                    eventType === type && handler !== noopReaderTouchListener
                ),
            )
            expect(registration?.[2]).toMatchObject({ capture: true, passive: true })
        }
        for (const type of ['resize', 'scroll']) {
            expect(visualViewport.addEventListener).toHaveBeenCalledWith(
                type,
                expect.any(Function),
                expect.objectContaining({ passive: true }),
            )
        }

        wrapper.unmount()
        for (const type of diagnosticEvents) {
            const removal = removeEventListener.mock.calls.find(
                ([eventType, handler]) => (
                    eventType === type && handler !== noopReaderTouchListener
                ),
            )
            expect(removal?.[2]).toMatchObject({ capture: true, passive: true })
        }
        expect(visualViewport.removeEventListener).toHaveBeenCalledTimes(2)
    })

    it('touchend 後 400ms 將新的 visualViewport scale 補記在同一筆，並可清除', async () => {
        const addEventListener = vi.spyOn(document, 'addEventListener')
        const visualViewport = stubVisualViewport()
        const wrapper = mountReader()
        await enableDiagnostics(wrapper)

        const touchendHandler = addEventListener.mock.calls.find(
            ([type, handler]) => type === 'touchend' && handler !== noopReaderTouchListener,
        )[1]
        touchendHandler({
            type: 'touchend',
            target: wrapper.find('button[aria-label="上一段"]').element,
            changedTouches: [{ clientX: 10, clientY: 20 }],
            defaultPrevented: false,
            cancelable: true,
        })
        await wrapper.vm.$nextTick()

        expect(wrapper.find('[aria-label="觸控診斷"]').text()).toContain('touchend')
        expect(wrapper.find('[aria-label="觸控診斷"]').text()).not.toContain('scale@+400ms')

        visualViewport.scale = 1.5
        vi.advanceTimersByTime(400)
        await wrapper.vm.$nextTick()

        expect(wrapper.find('[aria-label="觸控診斷"]').text()).toContain('scale@+400ms=1.5')

        await wrapper.find('button[aria-label="清除觸控診斷"]').trigger('click')
        expect(wrapper.find('[aria-label="觸控診斷"]').text()).not.toContain('touchend')
        wrapper.unmount()
    })


    it('可切換 A/B/C/D 監聽組合，關閉面板後還原正式 D 組合', async () => {
        const addEventListener = vi.spyOn(document, 'addEventListener')
        const removeEventListener = vi.spyOn(document, 'removeEventListener')
        stubVisualViewport()
        const wrapper = mountReader()
        await enableDiagnostics(wrapper)

        expect(wrapper.find('[aria-label="觸控診斷"]').text()).toContain('目前組合：D')

        addEventListener.mockClear()
        removeEventListener.mockClear()
        await wrapper.find('button[aria-label="切換觸控監聽器組合 A"]').trigger('click')
        expect(wrapper.find('[aria-label="觸控診斷"]').text()).toContain('A 無事件紀錄')
        expect(addEventListener).not.toHaveBeenCalled()
        for (const type of diagnosticEvents) {
            expect(removeEventListener).toHaveBeenCalledWith(
                type,
                expect.any(Function),
                expect.objectContaining({ capture: true, passive: true }),
            )
        }

        addEventListener.mockClear()
        removeEventListener.mockClear()
        await wrapper.find('button[aria-label="切換觸控監聽器組合 B"]').trigger('click')
        for (const type of ['touchstart', 'touchend', 'pointerdown', 'pointerup']) {
            expect(addEventListener).toHaveBeenCalledWith(
                type,
                expect.any(Function),
                expect.objectContaining({ capture: true, passive: true }),
            )
        }
        for (const type of ['click', 'dblclick']) {
            expect(addEventListener.mock.calls.some(([eventType]) => eventType === type)).toBe(false)
        }

        addEventListener.mockClear()
        removeEventListener.mockClear()
        await wrapper.find('button[aria-label="切換觸控監聽器組合 C"]').trigger('click')
        for (const type of ['click', 'dblclick']) {
            expect(addEventListener).toHaveBeenCalledWith(
                type,
                expect.any(Function),
                expect.objectContaining({ capture: true, passive: true }),
            )
        }
        for (const type of ['touchstart', 'touchend', 'pointerdown', 'pointerup']) {
            expect(addEventListener.mock.calls.some(([eventType]) => eventType === type)).toBe(false)
        }

        addEventListener.mockClear()
        removeEventListener.mockClear()
        await wrapper.find('button[aria-label="關閉觸控診斷"]').trigger('click')
        for (const type of diagnosticEvents) {
            expect(addEventListener).toHaveBeenCalledWith(
                type,
                noopReaderTouchListener,
                expect.objectContaining({ capture: true, passive: true }),
            )
        }

        wrapper.unmount()
    })
})
