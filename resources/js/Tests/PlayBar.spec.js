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

    // 大字體（200%/250%）時底部列太佔位：按鈕的 w-16/h-16 是 rem，會跟著
    // 字體等比放大到 128px 以上；狀態文字原本在按鈕上方又多佔一整行。
    describe('大字體時的版面節省', () => {
        it('播放鈕尺寸有像素上限，不會跟著字體無限放大', () => {
            const wrapper = mount(PlayBar)
            const classes = wrapper.find('button').classes()

            expect(classes).toContain('max-w-[96px]')
            expect(classes).toContain('max-h-[96px]')
        })

        it('狀態文字排在按鈕右側（同一列），不再多佔一行', () => {
            const wrapper = mount(PlayBar, { props: { label: '播放中…' } })
            const row = wrapper.find('button').element.parentElement

            expect(row.className).toContain('flex-wrap')
            expect(row.className).not.toContain('flex-col')
            // 按鈕在文字之前 → 文字在右側
            const children = [...row.children]
            expect(children.indexOf(wrapper.find('button').element))
                .toBeLessThan(children.indexOf(wrapper.find('p').element))
        })

        it('文字放不下時可換行，不會擠壓播放鈕', () => {
            const wrapper = mount(PlayBar, { props: { label: '點選歌詞播放' } })

            expect(wrapper.find('button').classes()).toContain('shrink-0')
            expect(wrapper.find('button').element.parentElement.className).toContain('flex-wrap')
        })

        it('沒有 label 時不渲染文字節點', () => {
            const wrapper = mount(PlayBar)

            expect(wrapper.find('p').exists()).toBe(false)
        })
    })
})
