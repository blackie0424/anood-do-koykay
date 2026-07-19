import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { useContentProtection } from '../composables/useContentProtection'

describe('useContentProtection', () => {
    let addSpy, removeSpy

    beforeEach(() => {
        addSpy = vi.spyOn(document, 'addEventListener')
        removeSpy = vi.spyOn(document, 'removeEventListener')
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('registers event listeners on enable', () => {
        const { enable } = useContentProtection()
        enable()
        const events = addSpy.mock.calls.map(c => c[0])
        expect(events).toContain('contextmenu')
        expect(events).toContain('keydown')
        expect(events).toContain('dragstart')
    })

    it('removes event listeners on disable', () => {
        const { enable, disable } = useContentProtection()
        enable()
        disable()
        const events = removeSpy.mock.calls.map(c => c[0])
        expect(events).toContain('contextmenu')
        expect(events).toContain('keydown')
        expect(events).toContain('dragstart')
    })

    it('blocks F12', () => {
        const { enable } = useContentProtection()
        enable()
        const event = new KeyboardEvent('keydown', { key: 'F12', cancelable: true })
        document.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(true)
    })

    it('blocks Ctrl+S', () => {
        const { enable } = useContentProtection()
        enable()
        const event = new KeyboardEvent('keydown', { key: 's', ctrlKey: true, cancelable: true })
        document.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(true)
    })

    it('blocks Ctrl+U', () => {
        const { enable } = useContentProtection()
        enable()
        const event = new KeyboardEvent('keydown', { key: 'u', ctrlKey: true, cancelable: true })
        document.dispatchEvent(event)
        expect(event.defaultPrevented).toBe(true)
    })
})
