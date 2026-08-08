import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi } from 'vitest'
import RecordingMode from '../Components/RecordingMode.vue'
import { createMemoryStore } from '../recording/recordingStore.js'

const SONG = {
    id: 1,
    title_native: 'Do Koykay',
    audio_full: '/audio/1.mp3',
    lines: [
        { id: 10, order: 1, text_native: 'Maomaw', start_time: 2.0, end_time: 6.0 },
        { id: 11, order: 2, text_native: 'Anood', start_time: 6.0, end_time: 9.0 },
    ],
}

function fakeRecorderFactory() {
    return vi.fn(async () => ({
        start: vi.fn(),
        stop: vi.fn(async () => new Blob(['x'], { type: 'audio/webm' })),
    }))
}

function makeWrapper(extraOptions = {}) {
    const store = createMemoryStore()
    const options = {
        store,
        recorderFactory: fakeRecorderFactory(),
        audioFactory: () => ({ play: vi.fn(), pause: vi.fn(), addEventListener: vi.fn() }),
        playStep: vi.fn(() => Promise.resolve()),
        ...extraOptions,
    }
    const wrapper = mount(RecordingMode, { props: { song: SONG, options } })
    return { wrapper, options, store }
}

describe('RecordingMode — 渲染', () => {
    it('顯示所有段落提詞歌詞', () => {
        const { wrapper } = makeWrapper()
        expect(wrapper.text()).toContain('Maomaw')
        expect(wrapper.text()).toContain('Anood')
    })

    it('顯示音色不一致提示', () => {
        const { wrapper } = makeWrapper()
        expect(wrapper.text()).toContain('音色會和你的清唱不同')
    })

    it('每段都有壓住錄音按鈕', () => {
        const { wrapper } = makeWrapper()
        expect(wrapper.find('[aria-label="錄音段落 1"]').exists()).toBe(true)
        expect(wrapper.find('[aria-label="錄音段落 2"]').exists()).toBe(true)
    })

    it('關閉按鈕觸發 close 事件', async () => {
        const { wrapper } = makeWrapper()
        await wrapper.find('[aria-label="關閉錄音"]').trigger('click')
        expect(wrapper.emitted('close')).toBeTruthy()
    })
})

describe('RecordingMode — 壓住錄音互動', () => {
    it('pointerdown 進入錄音、pointerup 結束並出現播放鈕', async () => {
        const { wrapper } = makeWrapper()
        const btn = wrapper.find('[aria-label="錄音段落 1"]')

        await btn.trigger('pointerdown')
        await flushPromises()
        expect(wrapper.text()).toContain('錄音中')

        await btn.trigger('pointerup')
        await flushPromises()
        expect(wrapper.find('[aria-label="播放段落 1"]').exists()).toBe(true)
    })
})

describe('RecordingMode — 整體播放', () => {
    it('點整體播放呼叫 playStep', async () => {
        const { wrapper, options } = makeWrapper()
        await wrapper.find('[aria-label="整體播放我的接唱版本"]').trigger('click')
        await flushPromises()
        expect(options.playStep).toHaveBeenCalled()
    })
})

describe('RecordingMode — 掛載載入既有錄音', () => {
    it('已存在的錄音在掛載後顯示播放鈕', async () => {
        const store = createMemoryStore()
        await store.put(1, 11, new Blob(['saved'], { type: 'audio/webm' }))
        const wrapper = mount(RecordingMode, {
            props: {
                song: SONG,
                options: { store, recorderFactory: fakeRecorderFactory(), playStep: vi.fn(() => Promise.resolve()) },
            },
        })
        await flushPromises()
        expect(wrapper.find('[aria-label="播放段落 2"]').exists()).toBe(true)
    })
})
