import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { playClickSound, warmUpClickSound, resetClickSoundForTesting, useClickSound } from '../composables/useClickSound'

function makeFakeAudioContext() {
    const oscillator = { frequency: {}, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
    const gain = {
        gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
        connect: vi.fn(),
    }
    const ctx = {
        state: 'running',
        currentTime: 0,
        destination: {},
        resume: vi.fn(),
        createOscillator: vi.fn(() => oscillator),
        createGain: vi.fn(() => gain),
    }
    const Ctor = vi.fn(() => ctx)
    return { Ctor, ctx, oscillator, gain }
}

describe('useClickSound', () => {
    let original

    beforeEach(() => {
        original = window.AudioContext
        resetClickSoundForTesting()
    })

    afterEach(() => {
        window.AudioContext = original
        resetClickSoundForTesting()
    })

    it('播放時會產生短促的 beep', () => {
        const { Ctor, ctx, oscillator } = makeFakeAudioContext()
        window.AudioContext = Ctor

        playClickSound()

        expect(ctx.createOscillator).toHaveBeenCalled()
        expect(oscillator.start).toHaveBeenCalled()
        expect(oscillator.stop).toHaveBeenCalled()
    })

    // 原本 PlayBar 每次點擊都 new 一個 AudioContext，瀏覽器對同時存在的數量
    // 有上限，連續快速點擊會堆積並開始失敗
    it('連續多次播放只建立一個 AudioContext（不會每次都 new）', () => {
        const { Ctor } = makeFakeAudioContext()
        window.AudioContext = Ctor

        playClickSound()
        playClickSound()
        playClickSound()

        expect(Ctor).toHaveBeenCalledTimes(1)
    })

    // iOS 的 AudioContext 剛建立時是 suspended，resume() 是非同步的。
    // 不等它完成就排程音效，第一次點擊會沒聲音（context 還沒真正啟動）。
    it('context 被暫停時會先等 resume 完成，才開始播放', async () => {
        const { Ctor, ctx } = makeFakeAudioContext()
        ctx.state = 'suspended'
        let resolveResume
        ctx.resume = vi.fn(() => new Promise((resolve) => { resolveResume = resolve }))
        window.AudioContext = Ctor

        const pending = playClickSound()

        // resume 尚未完成前不該開始排程音效
        expect(ctx.resume).toHaveBeenCalled()
        expect(ctx.createOscillator).not.toHaveBeenCalled()

        resolveResume()
        await pending

        expect(ctx.createOscillator).toHaveBeenCalled()
    })

    it('resume 失敗時靜默，不往外拋錯', async () => {
        const { Ctor, ctx } = makeFakeAudioContext()
        ctx.state = 'suspended'
        ctx.resume = vi.fn(() => Promise.reject(new Error('not allowed')))
        window.AudioContext = Ctor

        await expect(playClickSound()).resolves.toBeUndefined()
    })

    it('context 正常運作時不需要多餘的 resume，且維持同步播放', () => {
        const { Ctor, ctx } = makeFakeAudioContext()
        window.AudioContext = Ctor

        playClickSound()

        expect(ctx.resume).not.toHaveBeenCalled()
    })

    it('瀏覽器不支援 Web Audio 時靜默失敗，不拋錯', () => {
        window.AudioContext = undefined
        window.webkitAudioContext = undefined

        expect(() => playClickSound()).not.toThrow()
    })

    it('建立 AudioContext 拋錯時靜默失敗，不影響按鈕功能', () => {
        window.AudioContext = vi.fn(() => { throw new Error('blocked by autoplay policy') })

        expect(() => playClickSound()).not.toThrow()
    })

    it('播放途中拋錯也不會往外拋', () => {
        const { Ctor, ctx } = makeFakeAudioContext()
        ctx.createOscillator = vi.fn(() => { throw new Error('boom') })
        window.AudioContext = Ctor

        expect(() => playClickSound()).not.toThrow()
    })

    it('composable 形式回傳同一個播放函式', () => {
        expect(useClickSound().playClickSound).toBe(playClickSound)
    })
})

describe('warmUpClickSound — 在第一個手勢中先解鎖音效', () => {
    let original
    beforeEach(() => { original = window.AudioContext; resetClickSoundForTesting() })
    afterEach(() => { window.AudioContext = original; resetClickSoundForTesting() })

    it('context 為 suspended 時呼叫 resume 解鎖', () => {
        const { Ctor, ctx } = makeFakeAudioContext()
        ctx.state = 'suspended'
        window.AudioContext = Ctor

        warmUpClickSound()

        expect(ctx.resume).toHaveBeenCalled()
    })

    it('context 已在執行時不重複 resume', () => {
        const { Ctor, ctx } = makeFakeAudioContext()
        window.AudioContext = Ctor

        warmUpClickSound()

        expect(ctx.resume).not.toHaveBeenCalled()
    })

    it('解鎖時不播放任何聲音（只是啟動音訊系統）', () => {
        const { Ctor, ctx } = makeFakeAudioContext()
        ctx.state = 'suspended'
        window.AudioContext = Ctor

        warmUpClickSound()

        expect(ctx.createOscillator).not.toHaveBeenCalled()
    })

    it('與後續播放共用同一個 context（不會多建一個）', () => {
        const { Ctor, ctx } = makeFakeAudioContext()
        ctx.state = 'suspended'
        window.AudioContext = Ctor

        warmUpClickSound()
        ctx.state = 'running'
        playClickSound()

        expect(Ctor).toHaveBeenCalledTimes(1)
    })

    it('不支援 Web Audio 時靜默失敗', () => {
        window.AudioContext = undefined
        window.webkitAudioContext = undefined

        expect(() => warmUpClickSound()).not.toThrow()
    })

    it('resume 拋錯時靜默失敗，不影響後續播放', () => {
        const { Ctor, ctx } = makeFakeAudioContext()
        ctx.state = 'suspended'
        ctx.resume = vi.fn(() => { throw new Error('nope') })
        window.AudioContext = Ctor

        expect(() => warmUpClickSound()).not.toThrow()
    })

    it('composable 形式也提供 warmUpClickSound', () => {
        expect(useClickSound().warmUpClickSound).toBe(warmUpClickSound)
    })
})
