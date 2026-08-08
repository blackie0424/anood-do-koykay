import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createMediaRecorderFactory } from '../recording/mediaRecorder.js'

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
beforeEach(() => {
    trackStop = vi.fn()
    global.MediaRecorder = FakeMediaRecorder
    global.navigator.mediaDevices = {
        getUserMedia: vi.fn(async () => ({ getTracks: () => [{ stop: trackStop }] })),
    }
})
afterEach(() => { vi.restoreAllMocks() })

describe('createMediaRecorderFactory', () => {
    it('createRecorder 取得麥克風並回傳 start/stop', async () => {
        const createRecorder = createMediaRecorderFactory()
        const recorder = await createRecorder()
        expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalledWith({ audio: true })
        expect(typeof recorder.start).toBe('function')
        expect(typeof recorder.stop).toBe('function')
    })

    it('stop() 收集 chunks 回傳 Blob 並釋放麥克風軌道', async () => {
        const createRecorder = createMediaRecorderFactory()
        const recorder = await createRecorder()
        recorder.start()
        const blob = await recorder.stop()
        expect(blob).toBeInstanceOf(Blob)
        expect(blob.type).toBe('audio/webm')
        expect(trackStop).toHaveBeenCalled()
    })
})
