import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import ReportModal from '../Components/ReportModal.vue'

vi.mock('axios', () => ({
    default: { post: vi.fn().mockResolvedValue({ data: { ok: true } }) },
}))

import axios from 'axios'

function overlay() {
    return document.querySelector('[data-testid="report-overlay"]')
}

describe('ReportModal', () => {
    let wrapper

    beforeEach(() => {
        vi.clearAllMocks()
    })

    afterEach(() => {
        wrapper?.unmount()
    })

    it('modal hidden initially', async () => {
        wrapper = mount(ReportModal, { props: { songId: 1 }, attachTo: document.body })
        expect(overlay()).toBeNull()
    })

    it('opens modal on button click', async () => {
        wrapper = mount(ReportModal, { props: { songId: 1 }, attachTo: document.body })
        await wrapper.find('[data-testid="report-btn"]').trigger('click')
        expect(overlay()).not.toBeNull()
    })

    it('shows error when submitting without selecting type', async () => {
        wrapper = mount(ReportModal, { props: { songId: 1 }, attachTo: document.body })
        await wrapper.find('[data-testid="report-btn"]').trigger('click')
        overlay().querySelector('[data-testid="report-submit"]').click()
        await wrapper.vm.$nextTick()
        expect(overlay().querySelector('[data-testid="report-error"]')).not.toBeNull()
        expect(axios.post).not.toHaveBeenCalled()
    })

    it('shows error when other selected without note', async () => {
        wrapper = mount(ReportModal, { props: { songId: 1 }, attachTo: document.body })
        await wrapper.find('[data-testid="report-btn"]').trigger('click')
        overlay().querySelector('[data-testid="report-type-other"]').click()
        await wrapper.vm.$nextTick()
        overlay().querySelector('[data-testid="report-submit"]').click()
        await wrapper.vm.$nextTick()
        expect(overlay().querySelector('[data-testid="report-error"]')).not.toBeNull()
    })

    it('submits successfully and shows thanks', async () => {
        wrapper = mount(ReportModal, { props: { songId: 1 }, attachTo: document.body })
        await wrapper.find('[data-testid="report-btn"]').trigger('click')
        overlay().querySelector('[data-testid="report-type-lyrics_timing"]').click()
        await wrapper.vm.$nextTick()
        overlay().querySelector('[data-testid="report-submit"]').click()
        await wrapper.vm.$nextTick()
        await new Promise(r => setTimeout(r, 10))
        await wrapper.vm.$nextTick()
        expect(axios.post).toHaveBeenCalledWith('/api/songs/1/reports', {
            report_type: 'lyrics_timing',
            note: null,
        })
        expect(overlay().querySelector('[data-testid="report-thanks"]')).not.toBeNull()
    })

    it('shows time fields only for lyrics_missing type', async () => {
        wrapper = mount(ReportModal, { props: { songId: 1 }, attachTo: document.body })
        await wrapper.find('[data-testid="report-btn"]').trigger('click')
        expect(overlay().querySelector('[data-testid="report-time-from"]')).toBeNull()
        overlay().querySelector('[data-testid="report-type-lyrics_missing"]').click()
        await wrapper.vm.$nextTick()
        expect(overlay().querySelector('[data-testid="report-time-from"]')).not.toBeNull()
    })

    // 大字體手機：欄位變高時送出鈕仍要在視線內，不用一路捲到底才看得到
    it('表單欄位是獨立捲動區，送出鈕在捲動區之外', async () => {
        wrapper = mount(ReportModal, { props: { songId: 1 }, attachTo: document.body })
        await wrapper.find('[data-testid="report-btn"]').trigger('click')

        const fields = overlay().querySelector('[data-testid="report-fields"]')
        const submit = overlay().querySelector('[data-testid="report-submit"]')

        expect(fields).not.toBeNull()
        expect(fields.className).toContain('overflow-y-auto')
        expect(fields.className).toContain('min-h-0')
        expect(fields.contains(submit)).toBe(false)
    })
})
