import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { playClickSound, warmUpClickSound, resetClickSoundForTesting, useClickSound } from '../composables/useClickSound'

function makeFakeAudioContext() {
    const oscillator = { frequency: {}, connect: vi.fn(), start: vi.fn(), stop: vi.fn() }
    const bufferSource = { buffer: null, connect: vi.fn(), start: vi.fn() }
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
        createBuffer: vi.fn(() => ({})),
        createBufferSource: vi.fn(() => bufferSource),
    }
    const Ctor = vi.fn(() => ctx)
    return { Ctor, ctx, oscillator, gain, bufferSource }
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

    // chung 實測：按同意、按聆聽都沒聲音，直到某首歌真正播放過之後所有
    // 按鈕才突然有聲音——代表 resume() 並沒有真的解鎖 iOS 的音訊輸出。
    // iOS 要求在手勢中「真的播放一個音訊節點」，這裡驗證有做這件事。
    it('第一次播放時會用無聲緩衝解鎖音訊（只 resume 不足以解鎖 iOS）', () => {
        const { Ctor, ctx, bufferSource } = makeFakeAudioContext()
        window.AudioContext = Ctor

        playClickSound()

        expect(ctx.createBuffer).toHaveBeenCalled()
        expect(bufferSource.connect).toHaveBeenCalledWith(ctx.destination)
        expect(bufferSource.start).toHaveBeenCalled()
    })

    // 桌機不需要解鎖，beep 本來就能播；解鎖失敗不該把 beep 一起拖下水
    it('解鎖失敗時仍然照常播放提示音', () => {
        const { Ctor, ctx, oscillator } = makeFakeAudioContext()
        ctx.createBuffer = vi.fn(() => { throw new Error('unsupported') })
        window.AudioContext = Ctor

        playClickSound()

        expect(oscillator.start).toHaveBeenCalled()
    })

    it('解鎖只做一次，之後的點擊不重複', () => {
        const { Ctor, ctx } = makeFakeAudioContext()
        window.AudioContext = Ctor

        playClickSound()
        playClickSound()
        playClickSound()

        expect(ctx.createBuffer).toHaveBeenCalledTimes(1)
    })

    // 先前改成 async 並 await resume() 是錯的：未解鎖時該 Promise 可能遲遲
    // 不 resolve，beep 永遠不會被排程
    it('維持同步：呼叫後音效已排程，不需要等待任何 Promise', () => {
        const { Ctor, oscillator } = makeFakeAudioContext()
        window.AudioContext = Ctor

        playClickSound()

        expect(oscillator.start).toHaveBeenCalled()
    })

    it('解鎖完成後，後續播放不再呼叫 resume', () => {
        const { Ctor, ctx } = makeFakeAudioContext()
        window.AudioContext = Ctor

        playClickSound()  // 這次解鎖
        ctx.resume.mockClear()
        playClickSound()  // 之後不該再解鎖

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

    it('已經解鎖過就不重複解鎖', () => {
        const { Ctor, ctx } = makeFakeAudioContext()
        window.AudioContext = Ctor

        warmUpClickSound()
        warmUpClickSound()

        expect(ctx.createBuffer).toHaveBeenCalledTimes(1)
    })

    // 解鎖必須在使用者手勢中完成；同意畫面不一定出現（sessionStorage 已有
    // 紀錄時不顯示），所以第一次點擊任何按鈕也要能解鎖
    it('沒有經過 warm-up 時，第一次點擊自己會解鎖', () => {
        const { Ctor, ctx } = makeFakeAudioContext()
        window.AudioContext = Ctor

        playClickSound()

        expect(ctx.createBuffer).toHaveBeenCalled()
    })

    it('解鎖不會發出提示音（只播無聲緩衝啟動音訊系統）', () => {
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
