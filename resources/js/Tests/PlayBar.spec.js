import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, afterEach } from 'vitest'
import PlayBar from '../Components/PlayBar.vue'

afterEach(() => { vi.restoreAllMocks(); delete global.AudioContext })

describe('PlayBar', () => {
    it('playing=false 顯示 ▶／aria 播放；playing=true 顯示 ⏸／aria 暫停', () => {
        const play = mount(PlayBar, { props: { playing: false } })
        expect(play.find('[aria-label="播放"]').exists()).toBe(true)
        expect(play.text()).toContain('▶')

        const pause = mount(PlayBar, { props: { playing: true } })
        expect(pause.find('[aria-label="暫停"]').exists()).toBe(true)
        expect(pause.text()).toContain('⏸')
    })

    it('disabled 時按鈕 disabled 且點擊不 emit', async () => {
        const wrapper = mount(PlayBar, { props: { disabled: true } })
        const btn = wrapper.find('button')
        expect(btn.attributes('disabled')).toBeDefined()
        await btn.trigger('click')
        expect(wrapper.emitted('play')).toBeFalsy()
    })

    it('label 有值時顯示、預設不顯示', () => {
        expect(mount(PlayBar, { props: { label: '點選歌詞播放' } }).text()).toContain('點選歌詞播放')
        expect(mount(PlayBar).text()).not.toContain('點選歌詞播放')
    })

    it('非 stopMode 點擊 emit play', async () => {
        const wrapper = mount(PlayBar)
        await wrapper.find('button').trigger('click')
        expect(wrapper.emitted('play')).toBeTruthy()
        expect(wrapper.emitted('stop')).toBeFalsy()
    })

    it('stopMode 顯示 ⏹／aria 停止播放，點擊 emit stop', async () => {
        const wrapper = mount(PlayBar, { props: { stopMode: true } })
        expect(wrapper.find('[aria-label="停止播放"]').exists()).toBe(true)
        expect(wrapper.text()).toContain('⏹')
        await wrapper.find('button').trigger('click')
        expect(wrapper.emitted('stop')).toBeTruthy()
        expect(wrapper.emitted('play')).toBeFalsy()
    })

    it('點擊後進入 loading（按鈕 disabled + 變灰）', async () => {
        const wrapper = mount(PlayBar, { props: { playing: false } })
        await wrapper.find('button').trigger('click')
        const btn = wrapper.find('button')
        expect(btn.attributes('disabled')).toBeDefined()
        expect(btn.classes()).toContain('bg-stone-400')
    })

    it('loading 中重複點擊不再 emit', async () => {
        const wrapper = mount(PlayBar, { props: { playing: false } })
        await wrapper.find('button').trigger('click')
        await wrapper.find('button').trigger('click')
        expect(wrapper.emitted('play')).toHaveLength(1)
    })

    it('playing prop 改變後離開 loading', async () => {
        const wrapper = mount(PlayBar, { props: { playing: false } })
        await wrapper.find('button').trigger('click')
        expect(wrapper.find('button').attributes('disabled')).toBeDefined()
        await wrapper.setProps({ playing: true }) // 父層操作完成
        expect(wrapper.find('button').attributes('disabled')).toBeUndefined()
    })

    it('點擊播放點擊音效（呼叫 AudioContext）', async () => {
        const osc = { frequency: {}, connect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: null }
        const gain = { gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() }, connect: vi.fn() }
        const AC = vi.fn(() => ({
            createOscillator: () => osc,
            createGain: () => gain,
            destination: {},
            currentTime: 0,
            close: vi.fn(),
        }))
        global.AudioContext = AC
        const wrapper = mount(PlayBar)
        await wrapper.find('button').trigger('click')
        expect(AC).toHaveBeenCalled()
        expect(osc.start).toHaveBeenCalled()
    })

    it('無 AudioContext 時點擊不報錯仍 emit', async () => {
        delete global.AudioContext
        const wrapper = mount(PlayBar)
        await wrapper.find('button').trigger('click')
        expect(wrapper.emitted('play')).toBeTruthy()
    })
})
