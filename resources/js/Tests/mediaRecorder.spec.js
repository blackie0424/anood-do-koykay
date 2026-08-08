import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMicRecorder } from '../recording/mediaRecorder.js'

// jsdom 沒有 MediaRecorder / getUserMedia，用 fake 驗證 wiring。
class FakeMediaRecorder {
    constructor(stream) { this.stream = stream; this.mimeType = 'audio/webm' }
    start() { this.started = true }
    stop() {
        this.ondataavailable?.({ data: new Blob(['chunk'], { type: 'audio/webm' }) })
        this.onstop?.()
    }
}

function makeStream() {
    const stop = vi.fn()
    return { getTracks: () => [{ stop }], _stop: stop }
}

let streams
let getUserMedia
beforeEach(() => {
    streams = []
    getUserMedia = vi.fn(async () => { const s = makeStream(); streams.push(s); return s })
    global.MediaRecorder = FakeMediaRecorder
    global.navigator.mediaDevices = { getUserMedia }
})
afterEach(() => { vi.restoreAllMocks() })

describe('createMicRecorder', () => {
    it('acquire 取得授權後立即釋放該 stream，ready 變 true', async () => {
        const mic = createMicRecorder()
        expect(mic.ready).toBe(false)
        await mic.acquire()
        expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
        expect(streams[0]._stop).toHaveBeenCalled() // 只為授權，立即釋放
        expect(mic.ready).toBe(true)
    })

    it('acquire 具冪等性：重複呼叫不再要求權限', async () => {
        const mic = createMicRecorder()
        await mic.acquire()
        await mic.acquire()
        expect(getUserMedia).toHaveBeenCalledTimes(1)
    })

    it('start 取全新 stream 並開始錄；stop 回傳 Blob 且關閉該段 stream', async () => {
        const mic = createMicRecorder()
        await mic.start()
        const blob = await mic.stop()
        expect(blob).toBeInstanceOf(Blob)
        expect(blob.type).toBe('audio/webm')
        expect(streams[0]._stop).toHaveBeenCalled() // 該段 stream 已關閉
    })

    it('連續錄兩段各取全新 stream（不共用）', async () => {
        const mic = createMicRecorder()
        await mic.start(); await mic.stop()
        await mic.start(); await mic.stop()
        // start 兩次 → 兩條不同 stream，各自關閉
        expect(getUserMedia).toHaveBeenCalledTimes(2)
        expect(streams.length).toBe(2)
        expect(streams[0]).not.toBe(streams[1])
        expect(streams[0]._stop).toHaveBeenCalled()
        expect(streams[1]._stop).toHaveBeenCalled()
    })

    it('未先 acquire 直接 start 也可運作', async () => {
        const mic = createMicRecorder()
        await mic.start()
        expect(getUserMedia).toHaveBeenCalledTimes(1)
        expect(mic.ready).toBe(true)
    })

    it('release 釋放進行中的 stream', async () => {
        const mic = createMicRecorder()
        await mic.start()
        mic.release()
        expect(streams[0]._stop).toHaveBeenCalled()
    })
})
