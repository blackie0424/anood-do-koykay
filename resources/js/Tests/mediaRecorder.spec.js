import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMicRecorder } from '../recording/mediaRecorder.js'

// jsdom 沒有 MediaRecorder / getUserMedia，用 fake 驗證 wiring。
class FakeMediaRecorder {
    constructor() { this.mimeType = 'audio/webm' }
    start() { this.started = true }
    stop() {
        this.ondataavailable?.({ data: new Blob(['chunk'], { type: 'audio/webm' }) })
        this.onstop?.()
    }
}

let trackStop
let getUserMedia
beforeEach(() => {
    trackStop = vi.fn()
    getUserMedia = vi.fn(async () => ({ getTracks: () => [{ stop: trackStop }] }))
    global.MediaRecorder = FakeMediaRecorder
    global.navigator.mediaDevices = { getUserMedia }
})
afterEach(() => { vi.restoreAllMocks() })

describe('createMicRecorder', () => {
    it('acquire 取得一次麥克風，ready 變 true', async () => {
        const mic = createMicRecorder()
        expect(mic.ready).toBe(false)
        await mic.acquire()
        expect(getUserMedia).toHaveBeenCalledWith({ audio: true })
        expect(mic.ready).toBe(true)
    })

    it('acquire 具冪等性：重複呼叫不再要求權限', async () => {
        const mic = createMicRecorder()
        await mic.acquire()
        await mic.acquire()
        expect(getUserMedia).toHaveBeenCalledTimes(1)
    })

    it('start→stop 回傳 Blob，且不釋放 stream（供下段重用）', async () => {
        const mic = createMicRecorder()
        await mic.acquire()
        await mic.start()
        const blob = await mic.stop()
        expect(blob).toBeInstanceOf(Blob)
        expect(blob.type).toBe('audio/webm')
        expect(trackStop).not.toHaveBeenCalled() // stream 保留
        expect(mic.ready).toBe(true)
    })

    it('未先 acquire 直接 start 也會自動取得權限', async () => {
        const mic = createMicRecorder()
        await mic.start()
        expect(getUserMedia).toHaveBeenCalledTimes(1)
    })

    it('連續錄兩段共用同一 stream（getUserMedia 只呼叫一次）', async () => {
        const mic = createMicRecorder()
        await mic.start(); await mic.stop()
        await mic.start(); await mic.stop()
        expect(getUserMedia).toHaveBeenCalledTimes(1)
    })

    it('release 釋放麥克風軌道', async () => {
        const mic = createMicRecorder()
        await mic.acquire()
        mic.release()
        expect(trackStop).toHaveBeenCalled()
        expect(mic.ready).toBe(false)
    })
})
