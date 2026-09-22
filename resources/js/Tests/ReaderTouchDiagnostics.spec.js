import { describe, it, expect } from 'vitest'
import {
    appendRecent,
    createDiagnosticEntry,
    describeElement,
    formatDiagnosticEntry,
    withDelayedScale,
} from '../utils/readerTouchDiagnostics'

describe('readerTouchDiagnostics', () => {
    it('描述事件元素的標籤、無障礙名稱與停用狀態', () => {
        const button = document.createElement('button')
        button.setAttribute('aria-label', '上一段')
        button.disabled = true

        expect(describeElement(button)).toBe(
            'BUTTON aria-label="上一段" disabled=true aria-disabled=false',
        )
    })

    it('將事件、時間差、computed touch-action、hit-test 與事件旗標整理成顯示資料', () => {
        const button = document.createElement('button')
        button.setAttribute('aria-label', '上一段')
        button.disabled = true
        const hit = document.createElement('div')
        hit.setAttribute('aria-disabled', 'true')
        const event = {
            type: 'touchend',
            target: button,
            changedTouches: [{ clientX: 12, clientY: 34 }],
            defaultPrevented: false,
            cancelable: true,
        }

        const entry = createDiagnosticEntry(event, {
            id: 7,
            now: 1450,
            previousAt: 1200,
            scale: 1.25,
            getStyle: () => ({ touchAction: 'manipulation' }),
            elementFromPoint: (x, y) => {
                expect([x, y]).toEqual([12, 34])
                return hit
            },
        })

        expect(entry).toMatchObject({
            id: 7,
            at: 1450,
            deltaMs: 250,
            type: 'touchend',
            touchAction: 'manipulation',
            scale: 1.25,
            delayedScale: null,
        })
        expect(formatDiagnosticEntry(entry)).toContain('touchend +250ms')
        expect(formatDiagnosticEntry(entry)).toContain('target=BUTTON aria-label="上一段" disabled=true')
        expect(formatDiagnosticEntry(entry)).toContain('hit=DIV aria-label="-" disabled=false aria-disabled=true')
        expect(formatDiagnosticEntry(entry)).toContain('defaultPrevented=false cancelable=true')
    })

    it('touchend 可在 400ms 後補上同一筆的 scale', () => {
        const entry = {
            id: 3,
            at: 100,
            deltaMs: 0,
            type: 'touchend',
            target: 'BUTTON',
            touchAction: 'manipulation',
            hit: 'BUTTON',
            defaultPrevented: false,
            cancelable: true,
            scale: 1,
            delayedScale: null,
        }

        const updated = withDelayedScale([entry], 3, 1.6)

        expect(updated[0].delayedScale).toBe(1.6)
        expect(formatDiagnosticEntry(updated[0])).toContain('scale@+400ms=1.6')
        expect(entry.delayedScale).toBeNull()
    })

    it('只保留最近 12 筆', () => {
        const entries = Array.from({ length: 12 }, (_, index) => ({ id: index + 1 }))

        expect(appendRecent(entries, { id: 13 }).map(({ id }) => id)).toEqual([
            2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
        ])
    })
})
