import { mount } from '@vue/test-utils'
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import AppButton from '../Components/AppButton.vue'
import { resetClickSoundForTesting } from '../composables/useClickSound'

const LinkStub = { inheritAttrs: false, props: ['href'], template: '<a v-bind="$attrs" :href="href"><slot /></a>' }
const mountBtn = (options = {}) => mount(AppButton, {
    global: { stubs: { Link: LinkStub } },
    ...options,
})

function stubAudio() {
    const oscillator = { frequency: {}, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
    const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }
    const ctx = {
        state: 'running', currentTime: 0, destination: {}, resume: vi.fn(),
        createOscillator: vi.fn(() => oscillator), createGain: vi.fn(() => gain),
        createBuffer: vi.fn(() => ({})),
        createBufferSource: vi.fn(() => ({ buffer: null, connect: vi.fn(), start: vi.fn() })),
    }
    window.AudioContext = vi.fn(() => ctx)
    return ctx
}

describe('AppButton — 點擊音效', () => {
    let original
    beforeEach(() => { original = window.AudioContext; resetClickSoundForTesting() })
    afterEach(() => { window.AudioContext = original; resetClickSoundForTesting() })

    it('點擊時發出音效', async () => {
        const ctx = stubAudio()
        const wrapper = mountBtn()

        await wrapper.trigger('click')

        expect(ctx.createOscillator).toHaveBeenCalled()
    })

    it('停用時點擊不發出音效，也不 emit click', async () => {
        const ctx = stubAudio()
        const wrapper = mountBtn({ props: { disabled: true } })

        await wrapper.trigger('click')

        expect(ctx.createOscillator).not.toHaveBeenCalled()
        expect(wrapper.emitted('click')).toBeFalsy()
    })

    // 點了會立刻開始播放音樂的按鈕，beep 會跟音樂撞在一起
    it('silent 時不發出音效，但仍正常 emit click', async () => {
        const ctx = stubAudio()
        const wrapper = mountBtn({ props: { silent: true } })

        await wrapper.trigger('click')

        expect(ctx.createOscillator).not.toHaveBeenCalled()
        expect(wrapper.emitted('click')).toHaveLength(1)
    })

    it('音效環境不可用時按鈕仍然正常運作', async () => {
        window.AudioContext = undefined
        window.webkitAudioContext = undefined
        const wrapper = mountBtn()

        await wrapper.trigger('click')

        expect(wrapper.emitted('click')).toHaveLength(1)
    })
})

describe('AppButton — 按下的視覺回饋', () => {
    it('所有按鈕都有按壓回饋（縮小 + 陰影內凹）', () => {
        const wrapper = mountBtn()

        expect(wrapper.classes()).toContain('active:scale-[0.97]')
        expect(wrapper.classes()).toContain('active:shadow-inner')
    })
})

describe('AppButton — 渲染成不同標籤', () => {
    it('預設渲染成 button，type 預設 button（避免誤送出表單）', () => {
        const wrapper = mountBtn()

        expect(wrapper.element.tagName).toBe('BUTTON')
        expect(wrapper.attributes('type')).toBe('button')
    })

    it('as=link 渲染成站內連結並帶上 href', () => {
        const wrapper = mountBtn({ props: { as: 'link', href: '/songs/1/reader' } })

        expect(wrapper.element.tagName).toBe('A')
        expect(wrapper.attributes('href')).toBe('/songs/1/reader')
    })

    it('as=a 渲染成一般連結', () => {
        const wrapper = mountBtn({ props: { as: 'a', href: 'https://example.com' } })

        expect(wrapper.element.tagName).toBe('A')
        expect(wrapper.attributes('href')).toBe('https://example.com')
    })

    it('連結不該帶上 type 或 disabled 屬性（那是 button 專用）', () => {
        const wrapper = mountBtn({ props: { as: 'link', href: '/x', disabled: true } })

        expect(wrapper.attributes('type')).toBeUndefined()
        expect(wrapper.attributes('disabled')).toBeUndefined()
    })
})

describe('AppButton — 停用狀態', () => {
    it('button 用原生 disabled 屬性', () => {
        const wrapper = mountBtn({ props: { disabled: true } })

        expect(wrapper.attributes('disabled')).toBeDefined()
    })

    // 連結沒有 disabled 屬性可用，必須自己攔截導覽並標示給輔助科技
    it('連結停用時用 aria-disabled 標示，並攔截點擊', async () => {
        const wrapper = mountBtn({ props: { as: 'link', href: '/x', disabled: true } })

        expect(wrapper.attributes('aria-disabled')).toBe('true')

        await wrapper.trigger('click')
        expect(wrapper.emitted('click')).toBeFalsy()
    })

    it('停用時外觀變淡且顯示不可點的游標', () => {
        const wrapper = mountBtn({ props: { disabled: true } })

        expect(wrapper.classes()).toContain('opacity-40')
        expect(wrapper.classes()).toContain('cursor-not-allowed')
    })
})

describe('AppButton — 樣式預設與自訂', () => {
    it('預設不套任何顏色/尺寸，外觀完全交由呼叫端', () => {
        const wrapper = mountBtn()

        expect(wrapper.classes()).not.toContain('bg-blue-600')
        expect(wrapper.classes().some((c) => c.startsWith('min-w-'))).toBe(false)
    })

    it('variant 提供常用配色', () => {
        expect(mountBtn({ props: { variant: 'primary' } }).classes()).toContain('bg-blue-600')
        expect(mountBtn({ props: { variant: 'secondary' } }).classes()).toContain('bg-stone-200')
        expect(mountBtn({ props: { variant: 'danger' } }).classes()).toContain('bg-rose-600')
    })

    it('size=icon 用固定像素上下限，不隨系統字體無限放大', () => {
        const wrapper = mountBtn({ props: { size: 'icon' } })

        expect(wrapper.classes()).toContain('min-w-[64px]')
        expect(wrapper.classes()).toContain('max-w-[88px]')
        expect(wrapper.classes()).toContain('rounded-full')
    })

    it('呼叫端的 class 會保留（可與預設併用）', () => {
        const wrapper = mountBtn({ props: { variant: 'primary' }, attrs: { class: 'my-custom-class' } })

        expect(wrapper.classes()).toContain('my-custom-class')
        expect(wrapper.classes()).toContain('bg-blue-600')
    })

    it('其他屬性（aria-label 等）會透傳', () => {
        const wrapper = mountBtn({ attrs: { 'aria-label': '播放' } })

        expect(wrapper.attributes('aria-label')).toBe('播放')
    })

    it('內容用 slot 呈現', () => {
        const wrapper = mountBtn({ slots: { default: '▶ 播放' } })

        expect(wrapper.text()).toBe('▶ 播放')
    })
})
