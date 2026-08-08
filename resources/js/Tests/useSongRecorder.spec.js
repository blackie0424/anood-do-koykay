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

// 每次錄音回傳固定 blob 的錄音器
function makeRecorderFactory(blob = fakeBlob()) {
    const started = []
    const factory = vi.fn(async () => ({
        start: vi.fn(() => started.push(true)),
        stop: vi.fn(async () => blob),
    }))
    factory.started = started
    return factory
}

describe('useSongRecorder — 錄音狀態機', () => {
    it('startRecording 設定 recordingLineId', async () => {
        const r = useSongRecorder(SONG, { store: createMemoryStore(), recorderFactory: makeRecorderFactory() })
        await r.startRecording(10)
        expect(r.recordingLineId.value).toBe(10)
        expect(r.isRecording(10)).toBe(true)
    })

    it('已在錄音時再 startRecording 另一段會被忽略', async () => {
        const factory = makeRecorderFactory()
        const r = useSongRecorder(SONG, { store: createMemoryStore(), recorderFactory: factory })
        await r.startRecording(10)
        await r.startRecording(11)
        expect(r.recordingLineId.value).toBe(10)
        expect(factory).toHaveBeenCalledTimes(1)
    })

    it('stopRecording 存 blob、更新 recordings、清空 recordingLineId', async () => {
        const store = createMemoryStore()
        const blob = fakeBlob('take1')
        const r = useSongRecorder(SONG, { store, recorderFactory: makeRecorderFactory(blob) })
        await r.startRecording(10)
        await r.stopRecording()
        expect(r.recordingLineId.value).toBe(null)
        expect(r.hasRecording(10)).toBe(true)
        expect((await store.getAllForSong(1)).get(10)).toBe(blob)
    })

    it('未在錄音時 stopRecording 為 no-op', async () => {
        const store = createMemoryStore()
        const r = useSongRecorder(SONG, { store, recorderFactory: makeRecorderFactory() })
        await r.stopRecording()
        expect(r.hasRecording(10)).toBe(false)
        expect((await store.getAllForSong(1)).size).toBe(0)
    })

    it('getUserMedia 失敗時設 error 且不進入錄音狀態', async () => {
        const failing = vi.fn(async () => { throw new Error('denied') })
        const r = useSongRecorder(SONG, { store: createMemoryStore(), recorderFactory: failing })
        await r.startRecording(10)
        expect(r.recordingLineId.value).toBe(null)
        expect(r.error.value).toBe('mic')
    })

    it('deleteRecording 移除該段（重錄用）', async () => {
        const store = createMemoryStore()
        const r = useSongRecorder(SONG, { store, recorderFactory: makeRecorderFactory() })
        await r.startRecording(10); await r.stopRecording()
        expect(r.hasRecording(10)).toBe(true)
        await r.deleteRecording(10)
        expect(r.hasRecording(10)).toBe(false)
        expect((await store.getAllForSong(1)).size).toBe(0)
    })

    it('load 從 store 載入既有錄音', async () => {
        const store = createMemoryStore()
        await store.put(1, 11, fakeBlob('saved'))
        const r = useSongRecorder(SONG, { store, recorderFactory: makeRecorderFactory() })
        await r.load()
        expect(r.hasRecording(11)).toBe(true)
        expect(r.recordedLineIds.value).toEqual([11])
    })

    it('playSegment 無錄音時回傳 null', () => {
        const r = useSongRecorder(SONG, { store: createMemoryStore(), recorderFactory: makeRecorderFactory() })
        expect(r.playSegment(10)).toBe(null)
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
            recorderFactory: makeRecorderFactory(),
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
            recorderFactory: makeRecorderFactory(),
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
            recorderFactory: makeRecorderFactory(),
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
            recorderFactory: makeRecorderFactory(),
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

    it('stopPlayAll 後續段落不再播放', async () => {
        const store = createMemoryStore()
        const calls = []
        let stop
        const r = useSongRecorder(SONG, {
            store,
            recorderFactory: makeRecorderFactory(),
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
