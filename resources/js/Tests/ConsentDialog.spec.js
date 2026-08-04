import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import ConsentModal from '../Components/ConsentModal.vue'

function overlay() {
    return document.querySelector('[data-testid="consent-overlay"]')
}

describe('ConsentModal', () => {
    let wrapper

    beforeEach(() => {
        sessionStorage.clear()
    })

    afterEach(() => {
        wrapper?.unmount()
    })

    it('shows dialog when no consent in sessionStorage', async () => {
        wrapper = mount(ConsentModal, { attachTo: document.body })
        await wrapper.vm.$nextTick()
        expect(overlay()).not.toBeNull()
    })

    it('hides dialog when consent already stored', async () => {
        sessionStorage.setItem('consent_accepted', '1')
        wrapper = mount(ConsentModal, { attachTo: document.body })
        await wrapper.vm.$nextTick()
        expect(overlay()).toBeNull()
    })

    it('hides dialog and sets sessionStorage on accept', async () => {
        wrapper = mount(ConsentModal, { attachTo: document.body })
        await wrapper.vm.$nextTick()
        overlay().querySelector('[data-testid="consent-accept"]').click()
        await wrapper.vm.$nextTick()
        expect(sessionStorage.getItem('consent_accepted')).toBe('1')
        expect(overlay()).toBeNull()
    })

    it('calls window.close on decline and shows fallback message after timeout', async () => {
        const closeSpy = vi.spyOn(window, 'close').mockImplementation(() => {})
        vi.useFakeTimers()

        wrapper = mount(ConsentModal, { attachTo: document.body })
        await wrapper.vm.$nextTick()
        overlay().querySelector('[data-testid="consent-decline"]').click()
        expect(closeSpy).toHaveBeenCalled()

        vi.advanceTimersByTime(300)
        expect(document.body.innerHTML).toContain('感謝您，您可以關閉此頁面')

        // body.innerHTML 已被覆蓋，Vue 元件不存在，跳過 unmount
        wrapper = null
        closeSpy.mockRestore()
        vi.useRealTimers()
    })
})
