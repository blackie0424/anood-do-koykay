import { describe, it, expect } from 'vitest'
import {
    CACHE_NAME,
    PRECACHE_URLS,
    isStaticAssetRequest,
    isApiRequest,
    isNavigationRequest,
} from '../../../public/sw-strategy.js'

describe('isStaticAssetRequest', () => {
    it('.js 檔案回傳 true', () => {
        expect(isStaticAssetRequest('https://anood.pongsonotao.org/build/app.js')).toBe(true)
    })

    it('.css 檔案回傳 true', () => {
        expect(isStaticAssetRequest('https://anood.pongsonotao.org/build/app.css')).toBe(true)
    })

    it('.png 檔案回傳 true', () => {
        expect(isStaticAssetRequest('https://anood.pongsonotao.org/icons/icon-192.png')).toBe(true)
    })

    it('.svg 檔案回傳 true', () => {
        expect(isStaticAssetRequest('https://anood.pongsonotao.org/icons/icon.svg')).toBe(true)
    })

    it('頁面路徑回傳 false', () => {
        expect(isStaticAssetRequest('https://anood.pongsonotao.org/songs/1')).toBe(false)
    })
})

describe('isApiRequest', () => {
    it('/api/ 開頭的路徑回傳 true', () => {
        expect(isApiRequest('https://anood.pongsonotao.org/api/songs')).toBe(true)
    })

    it('非 /api/ 路徑回傳 false', () => {
        expect(isApiRequest('https://anood.pongsonotao.org/songs')).toBe(false)
    })
})

describe('isNavigationRequest', () => {
    it('mode 為 navigate 時回傳 true', () => {
        expect(isNavigationRequest({ mode: 'navigate' })).toBe(true)
    })

    it('mode 非 navigate 時回傳 false', () => {
        expect(isNavigationRequest({ mode: 'cors' })).toBe(false)
    })
})

describe('PRECACHE_URLS', () => {
    it('包含首頁、icon 與 manifest', () => {
        expect(PRECACHE_URLS).toContain('/')
        expect(PRECACHE_URLS).toContain('/icons/icon-192.png')
        expect(PRECACHE_URLS).toContain('/icons/icon-512.png')
        expect(PRECACHE_URLS).toContain('/manifest.json')
    })
})

describe('CACHE_NAME', () => {
    it('帶有版本號', () => {
        expect(CACHE_NAME).toMatch(/^anood-cache-v\d+$/)
    })
})
