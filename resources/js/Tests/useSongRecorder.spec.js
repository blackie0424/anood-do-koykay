import { describe, it, expect, vi } from 'vitest'
import { useSongRecorder } from '../recording/useSongRecorder.js'
import { createMemoryStore } from '../recording/recordingStore.js'

const SONG = {
    id: 1,
    audio_full: '/audio/1.mp3',
    lines: [
        { id: 10, order: 1, start_time: 2.0, end_time: 6.0 },
        { id: 11, order: 2, start_time: 6.0, end_time: 9.0 },
        { id: 12, order: 3, start_time: 9.0, end_time: 12.0 },
    ],
}

function fakeBlob(s = 'x') { return new Blob([s], { type: 'audio/webm' }) }

// 假麥克風錄音器：acquire/start/stop/release 生命週期
function makeMicRecorder(blob = fakeBlob()) {
    return {
        acquire: vi.fn(async () => {}),
        start: vi.fn(async () => {}),
        stop: vi.fn(async () => blob),
        release: vi.fn(),
    }
}
// 相容舊測試呼叫名
const makeRecorderFactory = makeMicRecorder

describe('useSongRecorder — 錄音狀態機（toggle）', () => {
    it('prepare 預取麥克風授權，micReady 變 true', async () => {
        const mic = makeMicRecorder()
        const r = useSongRecorder(SONG, { store: createMemoryStore(), micRecorder: mic })
        await r.prepare()
        expect(mic.acquire).toHaveBeenCalledTimes(1)
        expect(r.micReady.value).toBe(true)
    })

    it('prepare 授權失敗時設 error', async () => {
        const mic = makeMicRecorder()
        mic.acquire = vi.fn(async () => { throw new Error('denied') })
        const r = useSongRecorder(SONG, { store: createMemoryStore(), micRecorder: mic })
        await r.prepare()
        expect(r.micReady.value).toBe(false)
        expect(r.error.value).toBe('mic')
    })

    it('startRecording 設定 recordingLineId 並呼叫 mic.start', async () => {
        const mic = makeMicRecorder()
        const r = useSongRecorder(SONG, { store: createMemoryStore(), micRecorder: mic })
        await r.startRecording(10)
        expect(r.recordingLineId.value).toBe(10)
        expect(r.isRecording(10)).toBe(true)
        expect(mic.start).toHaveBeenCalledTimes(1)
    })

    it('已在錄音時再 startRecording 另一段會被忽略', async () => {
        const mic = makeMicRecorder()
        const r = useSongRecorder(SONG, { store: createMemoryStore(), micRecorder: mic })
        await r.startRecording(10)
        await r.startRecording(11)
        expect(r.recordingLineId.value).toBe(10)
        expect(mic.start).toHaveBeenCalledTimes(1)
    })

    it('stopRecording 存 blob、更新 recordings、清空 recordingLineId', async () => {
        const store = createMemoryStore()
        const blob = fakeBlob('take1')
        const r = useSongRecorder(SONG, { store, micRecorder: makeMicRecorder(blob) })
        await r.startRecording(10)
        await r.stopRecording()
        expect(r.recordingLineId.value).toBe(null)
        expect(r.hasRecording(10)).toBe(true)
        expect((await store.getAllForSong(1)).get(10)).toBe(blob)
    })

    it('toggle 重新錄音會覆蓋舊錄音', async () => {
        const store = createMemoryStore()
        const b1 = fakeBlob('take1')
        const b2 = fakeBlob('take2')
        const mic = makeMicRecorder(b1)
        const r = useSongRecorder(SONG, { store, micRecorder: mic })
        await r.startRecording(10); await r.stopRecording()
        mic.stop = vi.fn(async () => b2)
        await r.startRecording(10); await r.stopRecording()
        expect((await store.getAllForSong(1)).get(10)).toBe(b2)
    })

    it('未在錄音時 stopRecording 為 no-op', async () => {
        const store = createMemoryStore()
        const r = useSongRecorder(SONG, { store, micRecorder: makeMicRecorder() })
        await r.stopRecording()
        expect(r.hasRecording(10)).toBe(false)
        expect((await store.getAllForSong(1)).size).toBe(0)
    })

    it('mic.start 失敗時設 error 且不進入錄音狀態', async () => {
        const mic = makeMicRecorder()
        mic.start = vi.fn(async () => { throw new Error('denied') })
        const r = useSongRecorder(SONG, { store: createMemoryStore(), micRecorder: mic })
        await r.startRecording(10)
        expect(r.recordingLineId.value).toBe(null)
        expect(r.error.value).toBe('mic')
    })

    it('dispose 釋放麥克風', async () => {
        const mic = makeMicRecorder()
        const r = useSongRecorder(SONG, { store: createMemoryStore(), micRecorder: mic })
        r.dispose()
        expect(mic.release).toHaveBeenCalled()
    })

    it('deleteRecording 移除該段（重錄用）', async () => {
        const store = createMemoryStore()
        const r = useSongRecorder(SONG, { store, micRecorder: makeMicRecorder() })
        await r.startRecording(10); await r.stopRecording()
        expect(r.hasRecording(10)).toBe(true)
        await r.deleteRecording(10)
        expect(r.hasRecording(10)).toBe(false)
        expect((await store.getAllForSong(1)).size).toBe(0)
    })

    it('load 從 store 載入既有錄音', async () => {
        const store = createMemoryStore()
        await store.put(1, 11, fakeBlob('saved'))
        const r = useSongRecorder(SONG, { store, micRecorder: makeMicRecorder() })
        await r.load()
        expect(r.hasRecording(11)).toBe(true)
        expect(r.recordedLineIds.value).toEqual([11])
    })

    it('playSegment 無錄音時回傳 null', () => {
        const r = useSongRecorder(SONG, { store: createMemoryStore(), micRecorder: makeMicRecorder() })
        expect(r.playSegment(10)).toBe(null)
    })

    it('錄到空 blob 時不儲存並設 error=empty', async () => {
        const store = createMemoryStore()
        const mic = makeMicRecorder(new Blob([], { type: 'audio/webm' }))
        const r = useSongRecorder(SONG, { store, micRecorder: mic })
        await r.startRecording(10); await r.stopRecording()
        expect(r.hasRecording(10)).toBe(false)
        expect((await store.getAllForSong(1)).size).toBe(0)
        expect(r.error.value).toBe('empty')
    })

    it('playSegment 設 previewLineId；再點同段 toggle 暫停', async () => {
        const store = createMemoryStore()
        const audioFactory = () => ({ play: vi.fn(), pause: vi.fn(), addEventListener: vi.fn() })
        const r = useSongRecorder(SONG, { store, micRecorder: makeMicRecorder(), audioFactory })
        await r.startRecording(10); await r.stopRecording()
        r.playSegment(10)
        expect(r.previewLineId.value).toBe(10)
        r.playSegment(10)
        expect(r.previewLineId.value).toBe(null)
    })
})

describe('useSongRecorder — 聆聽原音 playReference', () => {
    function fakeAudioFactory() {
        const created = []
        const factory = (src) => {
            const a = { src, currentTime: 0, play: vi.fn(() => Promise.resolve()), pause: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() }
            created.push(a)
            return a
        }
        factory.created = created
        return factory
    }

    it('playReference 設 referencePreviewLineId、依 start_time 定位播放', () => {
        const af = fakeAudioFactory()
        const r = useSongRecorder(SONG, { store: createMemoryStore(), micRecorder: makeMicRecorder(), audioFactory: af })
        r.playReference(SONG.lines[0]) // start_time 2.0
        expect(r.referencePreviewLineId.value).toBe(10)
        const audio = af.created.at(-1)
        expect(audio.src).toBe('/audio/1.mp3')
        expect(audio.currentTime).toBe(2.0)
        expect(audio.play).toHaveBeenCalled()
    })

    it('再點同段 toggle 暫停', () => {
        const af = fakeAudioFactory()
        const r = useSongRecorder(SONG, { store: createMemoryStore(), micRecorder: makeMicRecorder(), audioFactory: af })
        r.playReference(SONG.lines[0])
        r.playReference(SONG.lines[0])
        expect(r.referencePreviewLineId.value).toBe(null)
    })

    it('end_time 為 null 時用下一段 start_time 當結尾（不提前結束）', () => {
        const af = fakeAudioFactory()
        const song = { ...SONG, lines: [
            { id: 10, order: 1, start_time: 2.0, end_time: null },
            { id: 11, order: 2, start_time: 6.0, end_time: 9.0 },
        ] }
        const r = useSongRecorder(song, { store: createMemoryStore(), micRecorder: makeMicRecorder(), audioFactory: af })
        r.playReference(song.lines[0])
        const audio = af.created.at(-1)
        // 模擬時間推進：未到 6.0 不結束，到 6.0 才結束
        const onTime = audio.addEventListener.mock.calls.find(c => c[0] === 'timeupdate')[1]
        audio.currentTime = 5.9; onTime()
        expect(r.referencePreviewLineId.value).toBe(10)
        audio.currentTime = 6.0; onTime()
        expect(r.referencePreviewLineId.value).toBe(null)
    })

    it('audio_full 為空時不播放', () => {
        const af = fakeAudioFactory()
        const song = { ...SONG, audio_full: null }
        const r = useSongRecorder(song, { store: createMemoryStore(), micRecorder: makeMicRecorder(), audioFactory: af })
        expect(r.playReference(song.lines[0])).toBe(null)
        expect(r.referencePreviewLineId.value).toBe(null)
    })

    it('play() 被拒時不卡住，狀態回復', async () => {
        const af = (src) => ({ src, currentTime: 0, play: vi.fn(() => Promise.reject(new Error('x'))), pause: vi.fn(), addEventListener: vi.fn(), removeEventListener: vi.fn() })
        const r = useSongRecorder(SONG, { store: createMemoryStore(), micRecorder: makeMicRecorder(), audioFactory: af })
        r.playReference(SONG.lines[0])
        await new Promise((res) => setTimeout(res, 0))
        expect(r.referencePreviewLineId.value).toBe(null)
    })

    it('互斥：聆聽原音會停自聽；自聽會停原音', async () => {
        const af = fakeAudioFactory()
        const store = createMemoryStore()
        const r = useSongRecorder(SONG, { store, micRecorder: makeMicRecorder(), audioFactory: af })
        await r.startRecording(10); await r.stopRecording()

        r.playSegment(10)
        expect(r.previewLineId.value).toBe(10)
        r.playReference(SONG.lines[1]) // 開始原音 → 停自聽
        expect(r.previewLineId.value).toBe(null)
        expect(r.referencePreviewLineId.value).toBe(11)

        r.playSegment(10) // 開始自聽 → 停原音
        expect(r.referencePreviewLineId.value).toBe(null)
        expect(r.previewLineId.value).toBe(10)
    })

    it('互斥：開始錄音會停原音', async () => {
        const af = fakeAudioFactory()
        const r = useSongRecorder(SONG, { store: createMemoryStore(), micRecorder: makeMicRecorder(), audioFactory: af })
        r.playReference(SONG.lines[0])
        expect(r.referencePreviewLineId.value).toBe(10)
        await r.startRecording(11)
        expect(r.referencePreviewLineId.value).toBe(null)
    })
})

// 可被測試驅動事件的假 audio
class FakeAudio {
    constructor(src) {
        this.src = src
        this.currentTime = 0
        this.paused = true
        this.playCalls = 0
        this.listeners = {}
        this.playImpl = () => Promise.resolve()
    }
    addEventListener(ev, cb) { (this.listeners[ev] ||= []).push(cb) }
    removeEventListener(ev, cb) { this.listeners[ev] = (this.listeners[ev] || []).filter(f => f !== cb) }
    play() { this.playCalls++; this.paused = false; return this.playImpl() }
    pause() { this.paused = true }
    emit(ev) { (this.listeners[ev] || []).slice().forEach(cb => cb()) }
    seekTo(t) { this.currentTime = t; this.emit('timeupdate') }
    end() { this.emit('ended') }
}

const flush = () => new Promise((r) => setTimeout(r, 0))

const SONG5 = {
    id: 5,
    audio_full: '/audio/5.mp3',
    lines: [
        { id: 1, order: 1, start_time: 0, end_time: 2 },
        { id: 2, order: 2, start_time: 2, end_time: 4 },
        { id: 3, order: 3, start_time: 4, end_time: 6 },
        { id: 4, order: 4, start_time: 6, end_time: 8 },
        { id: 5, order: 5, start_time: 8, end_time: 10 },
    ],
}

describe('useSongRecorder — 整體播放真實推進（跳段）', () => {
    it('有錄/有錄/沒錄/有錄/沒錄：播完原唱切片後正確推進到下一段', async () => {
        const store = createMemoryStore()
        await store.put(5, 1, fakeBlob())
        await store.put(5, 2, fakeBlob())
        await store.put(5, 4, fakeBlob())

        const audios = []
        const r = useSongRecorder(SONG5, {
            store,
            micRecorder: makeMicRecorder(),
            audioFactory: (src) => { const a = new FakeAudio(src); audios.push(a); return a },
        })
        await r.load()

        const done = r.playAll()
        // 段1 user
        await flush(); expect(r.playingLineId.value).toBe(1); audios[0].end()
        // 段2 user
        await flush(); expect(r.playingLineId.value).toBe(2); audios[1].end()
        // 段3 reference（原唱切片，audio_full）
        await flush(); expect(r.playingLineId.value).toBe(3)
        const ref = audios[2]
        expect(ref.src).toBe('/audio/5.mp3')
        ref.seekTo(6) // 到 end=6 → 推進
        // 段4 user（關鍵：切片後要能推進到這裡）
        await flush(); expect(r.playingLineId.value).toBe(4); audios[3].end()
        // 段5 reference（重用同一個 reference audio）
        await flush(); expect(r.playingLineId.value).toBe(5)
        ref.seekTo(10)

        await done
        expect(r.isPlayingAll.value).toBe(false)
        expect(r.playingLineId.value).toBe(null)
    })

    it('某段 play() 被拒時不卡住，仍推進到下一段', async () => {
        const store = createMemoryStore()
        await store.put(5, 1, fakeBlob())
        await store.put(5, 2, fakeBlob())

        const audios = []
        const r = useSongRecorder({ ...SONG5, lines: SONG5.lines.slice(0, 2) }, {
            store,
            micRecorder: makeMicRecorder(),
            audioFactory: (src) => {
                const a = new FakeAudio(src)
                if (audios.length === 0) a.playImpl = () => Promise.reject(new Error('blocked'))
                audios.push(a)
                return a
            },
        })
        await r.load()

        const done = r.playAll()
        // 段1 的 play() 被拒 → 不需 end 事件也要推進
        await flush(); expect(r.playingLineId.value).toBe(2); audios[1].end()
        await done
        expect(r.isPlayingAll.value).toBe(false)
    })

    it('reference 段落 ended（切片到檔尾）也會推進', async () => {
        const store = createMemoryStore()
        const audios = []
        const r = useSongRecorder({ ...SONG5, lines: SONG5.lines.slice(0, 1) }, {
            store,
            micRecorder: makeMicRecorder(),
            audioFactory: (src) => { const a = new FakeAudio(src); audios.push(a); return a },
        })
        await r.load()
        const done = r.playAll()
        await flush(); expect(r.playingLineId.value).toBe(1)
        audios[0].end() // 未到 end 就檔案播完
        await done
        expect(r.isPlayingAll.value).toBe(false)
    })
})

describe('useSongRecorder — 整體播放（playAll）', () => {
    it('依計畫順序播放：未錄走 reference、已錄走 user', async () => {
        const store = createMemoryStore()
        const calls = []
        const r = useSongRecorder(SONG, {
            store,
            micRecorder: makeMicRecorder(),
            playStep: (s) => { calls.push(s); return Promise.resolve() },
        })
        // 錄第 2 段
        await r.startRecording(11); await r.stopRecording()

        await r.playAll()

        expect(calls.map(c => [c.lineId, c.source])).toEqual([
            [10, 'reference'],
            [11, 'user'],
            [12, 'reference'],
        ])
        expect(r.isPlayingAll.value).toBe(false)
    })

    it('經完整錄音流程存下的段落，playAll 計畫分類為 user（Safari 跳段回歸）', async () => {
        const store = createMemoryStore()
        const calls = []
        const r = useSongRecorder(SONG, {
            store,
            micRecorder: makeMicRecorder(new Blob(['mp4data'], { type: 'audio/mp4' })),
            playStep: (s) => { calls.push(s); return Promise.resolve() },
        })
        // 用完整 startRecording/stopRecording 流程錄第 10、12 段
        await r.startRecording(10); await r.stopRecording()
        await r.startRecording(12); await r.stopRecording()

        await r.playAll()

        const map = Object.fromEntries(calls.map((c) => [c.lineId, c.source]))
        expect(map[10]).toBe('user')
        expect(map[11]).toBe('reference')
        expect(map[12]).toBe('user')
    })

    it('stopPlayAll 後續段落不再播放', async () => {
        const store = createMemoryStore()
        const calls = []
        let stop
        const r = useSongRecorder(SONG, {
            store,
            micRecorder: makeMicRecorder(),
            playStep: (s) => {
                calls.push(s)
                if (s.lineId === 10) stop()
                return Promise.resolve()
            },
        })
        stop = () => r.stopPlayAll()
        await r.playAll()
        expect(calls.length).toBe(1)
    })
})
