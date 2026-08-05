import { describe, it, expect, beforeEach } from 'vitest'
import { hideSplash } from '../utils/splash'

describe('hideSplash', () => {
    beforeEach(() => {
        document.body.innerHTML = ''
    })

    it('加上 splash-hidden class', () => {
        document.body.innerHTML = '<div id="app-splash"></div>'

        hideSplash()

        expect(document.getElementById('app-splash').classList.contains('splash-hidden')).toBe(true)
    })

    it('transitionend 後從 DOM 移除', () => {
        document.body.innerHTML = '<div id="app-splash"></div>'

        hideSplash()
        document.getElementById('app-splash').dispatchEvent(new Event('transitionend'))

        expect(document.getElementById('app-splash')).toBeNull()
    })

    it('沒有 #app-splash 時不報錯', () => {
        expect(() => hideSplash()).not.toThrow()
    })
})
