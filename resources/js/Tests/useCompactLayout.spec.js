import { mount } from '@vue/test-utils'
import { describe, it, expect, afterEach } from 'vitest'
import { useCompactLayout } from '../composables/useCompactLayout'

// 用最小宿主元件承載 composable（有 onMounted/onBeforeUnmount，需要元件情境）
function mountWith(thresholdRows) {
    return mount({
        setup() {
            return thresholdRows === undefined ? useCompactLayout() : useCompactLayout(thresholdRows)
        },
        template: '<div />',
    })
}

function setViewportHeight(px) {
    Object.defineProperty(window, 'innerHeight', { value: px, configurable: true, writable: true })
}

function setRootFontSize(px) {
    document.documentElement.style.fontSize = `${px}px`
}

describe('useCompactLayout', () => {
    afterEach(() => {
        setViewportHeight(768)
        document.documentElement.style.fontSize = ''
    })

    it('一般手機（畫面裝得下 48 行）不進入精簡模式', () => {
        setViewportHeight(768) // 768 / 16 = 48 行
        const wrapper = mountWith()

        expect(wrapper.vm.isCompact).toBe(false)
    })

    // 放大方式一：瀏覽器縮放 → 字級不變，可視範圍變小
    it('瀏覽器縮放到 200%（可視高度減半）會進入精簡模式', () => {
        setViewportHeight(384) // 384 / 16 = 24 行
        const wrapper = mountWith()

        expect(wrapper.vm.isCompact).toBe(true)
    })

    // 放大方式二：系統／瀏覽器字體設定 → 可視範圍不變，字級變大
    it('系統字體調到 200%（字級加倍）也會進入精簡模式', () => {
        setViewportHeight(768)
        setRootFontSize(32) // 768 / 32 = 24 行
        const wrapper = mountWith()

        expect(wrapper.vm.isCompact).toBe(true)
    })

    it('剛好等於門檻時不算精簡（門檻為「小於」）', () => {
        setViewportHeight(480) // 480 / 16 = 30 行，剛好等於預設門檻
        const wrapper = mountWith()

        expect(wrapper.vm.isCompact).toBe(false)
    })

    it('比門檻少一行就進入精簡模式', () => {
        setViewportHeight(464) // 464 / 16 = 29 行
        const wrapper = mountWith()

        expect(wrapper.vm.isCompact).toBe(true)
    })

    it('可自訂門檻行數', () => {
        setViewportHeight(768) // 48 行
        const wrapper = mountWith(60)

        expect(wrapper.vm.isCompact).toBe(true)
    })

    it('視窗大小改變時會重新判斷', async () => {
        setViewportHeight(768)
        const wrapper = mountWith()
        expect(wrapper.vm.isCompact).toBe(false)

        setViewportHeight(384)
        window.dispatchEvent(new Event('resize'))
        await wrapper.vm.$nextTick()

        expect(wrapper.vm.isCompact).toBe(true)
    })

    it('卸載後不再回應視窗事件（監聽器已移除）', async () => {
        setViewportHeight(768)
        const wrapper = mountWith()
        const before = wrapper.vm.isCompact

        wrapper.unmount()
        setViewportHeight(384)
        window.dispatchEvent(new Event('resize'))

        expect(before).toBe(false)
    })

    it('取不到根字級時用 16px 當預設，不會因此誤判', () => {
        setViewportHeight(768)
        setRootFontSize(0) // 異常值 → parseFloat 得 0，應 fallback 到 16
        const wrapper = mountWith()

        expect(wrapper.vm.isCompact).toBe(false)
    })
})
