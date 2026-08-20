import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import ConsentModal from '../Components/ConsentModal.vue'
import { warmUpClickSound } from '../composables/useClickSound'

// ConsentModal 直接匯入這個函式，ESM 的 live binding 無法用 spyOn 攔截，改用模組 mock
vi.mock('../composables/useClickSound', () => ({
    warmUpClickSound: vi.fn(),
    playClickSound: vi.fn(),
    useClickSound: () => ({ warmUpClickSound: vi.fn(), playClickSound: vi.fn() }),
}))

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

    it('按鈕文字維持簡短版本（大字體手機上才不會撐版）', async () => {
        wrapper = mount(ConsentModal, { attachTo: document.body })
        await wrapper.vm.$nextTick()

        const accept = overlay().querySelector('[data-testid="consent-accept"]')
        const decline = overlay().querySelector('[data-testid="consent-decline"]')

        expect(accept.textContent.trim()).toBe('✅ 我同意')
        expect(decline.textContent.trim()).toBe('❌ 不同意')
    })

    // ── 版面：大字體手機上同意鈕不能被推出畫面 ──────────────────
    // chung 回報：手機字體調大時，條款內容把 modal 撐高超出視窗，同意鈕跑到
    // 畫面外點不到。jsdom 算不出實際版面，這裡驗證造成該結果的版面結構。

    it('條款內容區是獨立的捲動容器，內容再長也不會把 modal 撐高', async () => {
        wrapper = mount(ConsentModal, { attachTo: document.body })
        await wrapper.vm.$nextTick()

        const content = overlay().querySelector('[data-testid="consent-content"]')

        expect(content).not.toBeNull()
        expect(content.className).toContain('overflow-y-auto')
        // flex 項目預設不會縮到比內容小，沒有 min-h-0 就不會真的出現捲軸
        expect(content.className).toContain('min-h-0')
    })

    it('modal 有高度上限且為直向 flex，內容才有地方可以捲', async () => {
        wrapper = mount(ConsentModal, { attachTo: document.body })
        await wrapper.vm.$nextTick()

        const dialog = overlay().querySelector('[role="dialog"]')

        expect(dialog.className).toContain('max-h-[90vh]')
        expect(dialog.className).toContain('flex-col')
    })

    it('兩顆按鈕都在捲動區之外，永遠留在 modal 底部可見', async () => {
        wrapper = mount(ConsentModal, { attachTo: document.body })
        await wrapper.vm.$nextTick()

        const content = overlay().querySelector('[data-testid="consent-content"]')
        const accept = overlay().querySelector('[data-testid="consent-accept"]')
        const decline = overlay().querySelector('[data-testid="consent-decline"]')

        expect(content.contains(accept)).toBe(false)
        expect(content.contains(decline)).toBe(false)
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

describe('ConsentModal — 解鎖點擊音效', () => {
    let wrapper

    beforeEach(() => { sessionStorage.clear(); vi.clearAllMocks() })
    afterEach(() => { wrapper?.unmount(); wrapper = null })

    it('按下同意時解鎖音效（這是使用者在本站的第一個手勢）', async () => {
        wrapper = mount(ConsentModal, { attachTo: document.body })
        await wrapper.vm.$nextTick()

        overlay().querySelector('[data-testid="consent-accept"]').click()

        expect(warmUpClickSound).toHaveBeenCalled()
    })

    // 同意狀態存在 sessionStorage，重新整理後 modal 不會再出現
    // （ConsentModal.vue:10），這時沒有任何 warm-up 時機——所以
    // playClickSound 內部仍必須自己等 resume，否則重新整理後的第一次點擊
    // 會沒聲音。這條測試把「warm-up 不是 100% 會發生」這個前提固定下來。
    it('已同意過時 modal 不出現，因此不會有 warm-up 時機', async () => {
        sessionStorage.setItem('consent_accepted', '1')

        wrapper = mount(ConsentModal, { attachTo: document.body })
        await wrapper.vm.$nextTick()

        expect(overlay()).toBeNull()
        expect(warmUpClickSound).not.toHaveBeenCalled()
    })
})
