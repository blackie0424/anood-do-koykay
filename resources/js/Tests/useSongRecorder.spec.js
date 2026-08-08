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
