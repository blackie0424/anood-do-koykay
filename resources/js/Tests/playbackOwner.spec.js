import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
    claimPlayback,
    releasePlayback,
    playExclusive,
    resetPlaybackOwnerForTesting,
} from '../audio/playbackOwner'

function fakeAudio(name = 'a') {
    return { name, pause: vi.fn(), play: vi.fn(() => Promise.resolve()) }
}

beforeEach(() => resetPlaybackOwnerForTesting())

describe('playbackOwner', () => {
    it('第一個音源取得播放權時不會去停任何東西', () => {
        const a = fakeAudio()

        claimPlayback(a)

        expect(a.pause).not.toHaveBeenCalled()
    })

    it('第二個音源取得播放權時會停掉前一個', () => {
        const a = fakeAudio('a')
        const b = fakeAudio('b')

        claimPlayback(a)
        claimPlayback(b)

        expect(a.pause).toHaveBeenCalledTimes(1)
        expect(b.pause).not.toHaveBeenCalled()
    })

    it('同一個音源重複取得播放權不會停掉自己', () => {
        const a = fakeAudio()

        claimPlayback(a)
        claimPlayback(a)
        claimPlayback(a)

        expect(a.pause).not.toHaveBeenCalled()
    })

    it('釋放播放權後，下一個音源不會再去動已釋放的那個', () => {
        const a = fakeAudio('a')
        const b = fakeAudio('b')

        claimPlayback(a)
        releasePlayback(a)
        claimPlayback(b)

        expect(a.pause).not.toHaveBeenCalled()
    })

    it('釋放別人的播放權不會影響現任持有者', () => {
        const a = fakeAudio('a')
        const b = fakeAudio('b')

        claimPlayback(a)
        releasePlayback(b) // b 根本不是持有者
        claimPlayback(b)

        expect(a.pause).toHaveBeenCalledTimes(1)
    })

    // 舊音源可能已經被卸載或處於奇怪狀態，停不掉它不該擋住使用者現在要聽的東西
    it('停掉舊音源失敗時，新音源仍然取得播放權', () => {
        const a = { pause: vi.fn(() => { throw new Error('detached') }) }
        const b = fakeAudio('b')
        const c = fakeAudio('c')

        claimPlayback(a)
        expect(() => claimPlayback(b)).not.toThrow()
        claimPlayback(c)

        expect(b.pause).toHaveBeenCalledTimes(1)
    })

    it('音源沒有 pause 方法時不會爆', () => {
        const a = {}
        const b = fakeAudio('b')

        claimPlayback(a)

        expect(() => claimPlayback(b)).not.toThrow()
    })

    it('傳入 null／undefined 不會改變現任持有者', () => {
        const a = fakeAudio('a')
        const b = fakeAudio('b')

        claimPlayback(a)
        claimPlayback(null)
        claimPlayback(undefined)
        claimPlayback(b)

        expect(a.pause).toHaveBeenCalledTimes(1)
    })
})

describe('playExclusive', () => {
    it('取得播放權並播放，回傳 play() 的結果', async () => {
        const a = fakeAudio('a')
        const b = fakeAudio('b')
        claimPlayback(a)

        const result = playExclusive(b)

        expect(a.pause).toHaveBeenCalledTimes(1)
        expect(b.play).toHaveBeenCalledTimes(1)
        await expect(result).resolves.toBeUndefined()
    })

    it('音源沒有 play 方法時回傳 undefined，不丟例外', () => {
        expect(() => playExclusive({})).not.toThrow()
        expect(playExclusive({})).toBeUndefined()
    })

    it('傳入 null 時不丟例外', () => {
        expect(() => playExclusive(null)).not.toThrow()
    })
})
