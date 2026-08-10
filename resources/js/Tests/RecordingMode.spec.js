import { mount, flushPromises } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import RecordingMode from '../Components/RecordingMode.vue'
import { createMemoryStore } from '../recording/recordingStore.js'

beforeEach(() => { try { sessionStorage.clear() } catch { /* noop */ } })

const SONG = {
    id: 1,
    title_native: 'Do Koykay',
    audio_full: '/audio/1.mp3',
    lines: [
        { id: 10, order: 1, text_native: 'Maomaw', start_time: 2.0, end_time: 6.0 },
        { id: 11, order: 2, text_native: 'Anood', start_time: 6.0, end_time: 9.0 },
    ],
}

function makeMic(blob = new Blob(['x'], { type: 'audio/webm' })) {
    return {
        acquire: vi.fn(async () => {}),
        start: vi.fn(async () => {}),
        stop: vi.fn(async () => blob),
        release: vi.fn(),
    }
}

function makeWrapper(extraOptions = {}) {
    const store = createMemoryStore()
    const mic = makeMic()
    const options = {
        store,
        micRecorder: mic,
        audioFactory: () => ({ play: vi.fn(), pause: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }),
        playStep: vi.fn(() => Promise.resolve()),
        ...extraOptions,
    }
    const wrapper = mount(RecordingMode, { props: { song: SONG, options } })
    return { wrapper, options, store, mic: options.micRecorder }
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

    it('顯示兩條頂部提示（音色說明 + 本地儲存）', () => {
        const { wrapper } = makeWrapper()
        expect(wrapper.text()).toContain('音色會和你的清唱不同')
        expect(wrapper.text()).toContain('錄音存在你的手機裡，不會上傳或與他人分享')
    })
})

describe('RecordingMode — 提示可關閉（sessionStorage）', () => {
    it('按 ✕ 關閉音色提示後該條消失、另一條仍在', async () => {
        const { wrapper } = makeWrapper()
        await wrapper.find('[aria-label="關閉提示：音色說明"]').trigger('click')
        expect(wrapper.text()).not.toContain('音色會和你的清唱不同')
        expect(wrapper.text()).toContain('錄音存在你的手機裡')
    })

    it('關閉後同 session 重新開啟介面不再顯示該條', async () => {
        const first = makeWrapper()
        await first.wrapper.find('[aria-label="關閉提示：本地儲存"]').trigger('click')
        first.wrapper.unmount()
        // 同 session（sessionStorage 未清）重新掛載
        const { wrapper } = makeWrapper()
        expect(wrapper.text()).not.toContain('錄音存在你的手機裡')
        expect(wrapper.text()).toContain('音色會和你的清唱不同') // 未關的仍顯示
    })

    it('sessionStorage 清空（模擬關閉瀏覽器/PWA）後兩條都重新顯示', async () => {
        const first = makeWrapper()
        await first.wrapper.find('[aria-label="關閉提示：音色說明"]').trigger('click')
        await first.wrapper.find('[aria-label="關閉提示：本地儲存"]').trigger('click')
        first.wrapper.unmount()
        sessionStorage.clear() // 模擬重新開啟瀏覽器/PWA
        const { wrapper } = makeWrapper()
        expect(wrapper.text()).toContain('音色會和你的清唱不同')
        expect(wrapper.text()).toContain('錄音存在你的手機裡')
    })

    it('每段預設顯示「開始錄音」', () => {
        const { wrapper } = makeWrapper()
        const btn = wrapper.find('[aria-label="錄音段落 1"]')
        expect(btn.exists()).toBe(true)
        expect(btn.text()).toContain('開始錄音')
    })

    it('關閉按鈕觸發 close 事件', async () => {
        const { wrapper } = makeWrapper()
        await wrapper.find('[aria-label="關閉錄音"]').trigger('click')
        expect(wrapper.emitted('close')).toBeTruthy()
    })
})

describe('RecordingMode — 掛載預取麥克風授權', () => {
    it('onMounted 呼叫 micRecorder.acquire 預取授權', async () => {
        const { mic } = makeWrapper()
        await flushPromises()
        expect(mic.acquire).toHaveBeenCalledTimes(1)
    })
})

describe('RecordingMode — 麥克風授權失敗提示', () => {
    it('prepare 授權失敗時畫面顯示錯誤提示', async () => {
        const store = createMemoryStore()
        const mic = makeMic()
        mic.acquire = vi.fn(async () => { throw new Error('denied') })
        const wrapper = mount(RecordingMode, {
            props: { song: SONG, options: { store, micRecorder: mic, playStep: vi.fn(() => Promise.resolve()) } },
        })
        await flushPromises()
        const alert = wrapper.find('[role="alert"]')
        expect(alert.exists()).toBe(true)
        expect(alert.text()).toContain('無法取得麥克風')
    })

    it('授權正常時不顯示錯誤提示', async () => {
        const { wrapper } = makeWrapper()
        await flushPromises()
        expect(wrapper.find('[role="alert"]').exists()).toBe(false)
    })
})

describe('RecordingMode — toggle 錄音互動', () => {
    it('點一下開始錄音、再點一下停止並出現播放/重新錄音', async () => {
        const { wrapper } = makeWrapper()
        const btn = wrapper.find('[aria-label="錄音段落 1"]')

        await btn.trigger('click')
        await flushPromises()
        expect(wrapper.find('[aria-label="錄音段落 1"]').text()).toContain('錄音中')

        await wrapper.find('[aria-label="錄音段落 1"]').trigger('click')
        await flushPromises()
        expect(wrapper.find('[aria-label="播放段落 1"]').exists()).toBe(true)
        expect(wrapper.find('[aria-label="錄音段落 1"]').text()).toContain('重新錄音')
    })

    it('某段錄音中時，其他段的開始錄音鈕被鎖住', async () => {
        const { wrapper } = makeWrapper()
        await wrapper.find('[aria-label="錄音段落 1"]').trigger('click')
        await flushPromises()

        const other = wrapper.find('[aria-label="錄音段落 2"]')
        expect(other.attributes('disabled')).toBeDefined()
    })
})

describe('RecordingMode — 自聽播放/暫停切換', () => {
    it('點播放後按鈕變暫停，再點恢復播放', async () => {
        const store = createMemoryStore()
        await store.put(1, 11, new Blob(['saved'], { type: 'audio/webm' }))
        const wrapper = mount(RecordingMode, {
            props: {
                song: SONG,
                options: {
                    store,
                    micRecorder: makeMic(),
                    audioFactory: () => ({ play: vi.fn(), pause: vi.fn(), addEventListener: vi.fn() }),
                    playStep: vi.fn(() => Promise.resolve()),
                },
            },
        })
        await flushPromises()

        await wrapper.find('[aria-label="播放段落 2"]').trigger('click')
        expect(wrapper.find('[aria-label="暫停段落 2"]').exists()).toBe(true)
        expect(wrapper.find('[aria-label="暫停段落 2"]').text()).toContain('暫停')

        await wrapper.find('[aria-label="暫停段落 2"]').trigger('click')
        expect(wrapper.find('[aria-label="播放段落 2"]').exists()).toBe(true)
    })
})

describe('RecordingMode — 空錄音提示', () => {
    it('錄到空 blob 時顯示「沒有聲音」提示且不新增播放鈕', async () => {
        const store = createMemoryStore()
        const mic = makeMic(new Blob([], { type: 'audio/webm' }))
        const wrapper = mount(RecordingMode, {
            props: { song: SONG, options: { store, micRecorder: mic, playStep: vi.fn(() => Promise.resolve()) } },
        })
        await flushPromises()
        await wrapper.find('[aria-label="錄音段落 1"]').trigger('click')
        await flushPromises()
        await wrapper.find('[aria-label="錄音段落 1"]').trigger('click')
        await flushPromises()

        const alert = wrapper.find('[role="alert"]')
        expect(alert.exists()).toBe(true)
        expect(alert.text()).toContain('沒有聲音')
        expect(wrapper.find('[aria-label="播放段落 1"]').exists()).toBe(false)
    })
})

describe('RecordingMode — 聆聽原音', () => {
    it('有原音且段落有時間軸時顯示聆聽原音鈕', () => {
        const { wrapper } = makeWrapper()
        expect(wrapper.find('[aria-label="聆聽原音段落 1"]').exists()).toBe(true)
    })

    it('audio_full 為空時不顯示聆聽原音鈕', () => {
        const store = createMemoryStore()
        const wrapper = mount(RecordingMode, {
            props: {
                song: { ...SONG, audio_full: null },
                options: { store, micRecorder: makeMic(), playStep: vi.fn(() => Promise.resolve()) },
            },
        })
        expect(wrapper.find('[aria-label="聆聽原音段落 1"]').exists()).toBe(false)
    })

    it('點聆聽原音後切換為暫停，再點恢復', async () => {
        const { wrapper } = makeWrapper()
        await wrapper.find('[aria-label="聆聽原音段落 1"]').trigger('click')
        expect(wrapper.find('[aria-label="暫停原音段落 1"]').exists()).toBe(true)
        await wrapper.find('[aria-label="暫停原音段落 1"]').trigger('click')
        expect(wrapper.find('[aria-label="聆聽原音段落 1"]').exists()).toBe(true)
    })
})

describe('RecordingMode — 無痕模式儲存提示', () => {
    it('IndexedDB 不可寫時顯示無痕模式提示', async () => {
        const store = createMemoryStore()
        store.put = vi.fn(async () => { throw new Error('blocked') })
        const wrapper = mount(RecordingMode, {
            props: { song: SONG, options: { store, micRecorder: makeMic(), playStep: vi.fn(() => Promise.resolve()) } },
        })
        await flushPromises()
        expect(wrapper.text()).toContain('無痕模式下錄音不會被儲存')
    })

    it('儲存正常時不顯示無痕模式提示', async () => {
        const { wrapper } = makeWrapper()
        await flushPromises()
        expect(wrapper.text()).not.toContain('無痕模式下錄音不會被儲存')
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

describe('RecordingMode — 整體播放中鎖住段落按鈕', () => {
    it('整體播放進行中，開始錄音/播放/聆聽原音全部 disabled', async () => {
        let resolveStep
        const store = createMemoryStore()
        await store.put(1, 10, new Blob(['x'], { type: 'audio/webm' }))
        const wrapper = mount(RecordingMode, {
            props: {
                song: SONG,
                options: {
                    store,
                    micRecorder: makeMic(),
                    audioFactory: () => ({ play: vi.fn(), pause: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }),
                    playStep: () => new Promise((r) => { resolveStep = r }),
                },
            },
        })
        await flushPromises()
        await wrapper.find('[aria-label="整體播放我的接唱版本"]').trigger('click')
        await flushPromises()

        expect(wrapper.find('[aria-label="錄音段落 1"]').attributes('disabled')).toBeDefined()
        expect(wrapper.find('[aria-label="播放段落 1"]').attributes('disabled')).toBeDefined()
        expect(wrapper.find('[aria-label="聆聽原音段落 1"]').attributes('disabled')).toBeDefined()

        resolveStep()
        await flushPromises()
    })
})

describe('RecordingMode — 整體播放高亮當前段', () => {
    it('播放中的段落標記 aria-current', async () => {
        let resolveStep
        const { wrapper } = makeWrapper({
            playStep: () => new Promise((r) => { resolveStep = r }),
        })
        await flushPromises()
        await wrapper.find('[aria-label="整體播放我的接唱版本"]').trigger('click')
        await flushPromises()

        const current = wrapper.find('[aria-current="true"]')
        expect(current.exists()).toBe(true)
        expect(current.text()).toContain('Maomaw')

        resolveStep()
        await flushPromises()
    })
})

describe('RecordingMode — 掛載載入既有錄音', () => {
    it('已存在的錄音在掛載後顯示重新錄音與播放鈕', async () => {
        const store = createMemoryStore()
        await store.put(1, 11, new Blob(['saved'], { type: 'audio/webm' }))
        const wrapper = mount(RecordingMode, {
            props: {
                song: SONG,
                options: { store, micRecorder: makeMic(), playStep: vi.fn(() => Promise.resolve()) },
            },
        })
        await flushPromises()
        expect(wrapper.find('[aria-label="播放段落 2"]').exists()).toBe(true)
        expect(wrapper.find('[aria-label="錄音段落 2"]').text()).toContain('重新錄音')
        // 沒有重複的錄音鈕：錄音段落 2 只有一顆
        expect(wrapper.findAll('[aria-label="錄音段落 2"]').length).toBe(1)
    })
})
