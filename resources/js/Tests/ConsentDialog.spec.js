import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import ConsentDialog from '../components/ConsentDialog.vue'

function overlay() {
    return document.querySelector('[data-testid="consent-overlay"]')
}

describe('ConsentDialog', () => {
    let wrapper

    beforeEach(() => {
        sessionStorage.clear()
    })

    afterEach(() => {
        wrapper?.unmount()
    })

    it('shows dialog when no consent in sessionStorage', async () => {
        wrapper = mount(ConsentDialog, { attachTo: document.body })
        await wrapper.vm.$nextTick()
        expect(overlay()).not.toBeNull()
    })

    it('hides dialog when consent already stored', async () => {
        sessionStorage.setItem('anood_consent_accepted', '1')
        wrapper = mount(ConsentDialog, { attachTo: document.body })
        await wrapper.vm.$nextTick()
        expect(overlay()).toBeNull()
    })

    it('hides dialog and sets sessionStorage on accept', async () => {
        wrapper = mount(ConsentDialog, { attachTo: document.body })
        await wrapper.vm.$nextTick()
        overlay().querySelector('[data-testid="consent-accept"]').click()
        await wrapper.vm.$nextTick()
        expect(sessionStorage.getItem('anood_consent_accepted')).toBe('1')
        expect(overlay()).toBeNull()
    })

    it('navigates away on decline', async () => {
        const originalLocation = window.location
        delete window.location
        window.location = { href: '' }

        wrapper = mount(ConsentDialog, { attachTo: document.body })
        await wrapper.vm.$nextTick()
        overlay().querySelector('[data-testid="consent-decline"]').click()
        expect(window.location.href).toBe('about:blank')

        window.location = originalLocation
    })
})
