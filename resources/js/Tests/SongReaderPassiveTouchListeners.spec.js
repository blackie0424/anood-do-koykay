import { mount } from '@vue/test-utils'
import { describe, it, expect, afterEach, vi } from 'vitest'
import SongReader from '../Pages/SongReader.vue'
import {
    READER_PASSIVE_EVENT_TYPES,
    READER_PASSIVE_LISTENER_OPTIONS,
    noopReaderTouchListener,
} from '../utils/readerPassiveTouchListeners'

const SONG = {
    id: 1,
    title_native: 'Do Koykay',
    lines: [
        { id: 1, order: 1, text_native: 'Maomaw' },
        { id: 2, order: 2, text_native: 'Anood' },
    ],
}

function mountReader() {
    return mount(SongReader, {
        props: { song: SONG },
        global: {
            stubs: {
                Link: { inheritAttrs: false, template: '<a v-bind="$attrs"><slot /></a>' },
            },
        },
    })
}

afterEach(() => vi.restoreAllMocks())

describe('SongReader — 常駐被動觸控監聽器', () => {
    it('事件種類與監聽選項固定為真機驗證過的組合', () => {
        expect(READER_PASSIVE_EVENT_TYPES).toEqual([
            'touchstart',
            'touchend',
            'pointerdown',
            'pointerup',
            'click',
            'dblclick',
        ])
        expect(READER_PASSIVE_LISTENER_OPTIONS).toEqual({
            capture: true,
            passive: true,
        })
    })

    it('掛載時註冊、卸載時以相同 handler 與 passive options 移除六種事件', () => {
        const addEventListener = vi.spyOn(document, 'addEventListener')
        const removeEventListener = vi.spyOn(document, 'removeEventListener')

        const wrapper = mountReader()

        for (const type of READER_PASSIVE_EVENT_TYPES) {
            expect(addEventListener).toHaveBeenCalledWith(
                type,
                noopReaderTouchListener,
                READER_PASSIVE_LISTENER_OPTIONS,
            )
        }

        wrapper.unmount()

        for (const type of READER_PASSIVE_EVENT_TYPES) {
            expect(removeEventListener).toHaveBeenCalledWith(
                type,
                noopReaderTouchListener,
                READER_PASSIVE_LISTENER_OPTIONS,
            )
        }
    })

    it('handler 是純 no-op，不阻止預設行為', () => {
        const event = new Event('touchstart', { cancelable: true })
        const preventDefault = vi.spyOn(event, 'preventDefault')
        const stopPropagation = vi.spyOn(event, 'stopPropagation')

        expect(noopReaderTouchListener(event)).toBeUndefined()
        expect(preventDefault).not.toHaveBeenCalled()
        expect(stopPropagation).not.toHaveBeenCalled()
        expect(event.defaultPrevented).toBe(false)
    })
})
