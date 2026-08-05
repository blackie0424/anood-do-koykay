import { describe, it, expect, afterEach, vi } from 'vitest'
import {
    CACHE_NAME,
    PRECACHE_URLS,
    isStaticAssetRequest,
    isApiRequest,
    isNavigationRequest,
    cacheFirst,
    networkFirst,
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

describe('cacheFirst', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('cache hit 時直接回傳快取，不打網路', async () => {
        const cachedResponse = { cached: true }
        const fetchMock = vi.fn()
        vi.stubGlobal('caches', {
            match: vi.fn().mockResolvedValue(cachedResponse),
            open: vi.fn(),
        })
        vi.stubGlobal('fetch', fetchMock)

        const result = await cacheFirst({ url: '/build/app.js' })

        expect(result).toBe(cachedResponse)
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('cache miss 時打網路並把回應寫入 cache', async () => {
        const response = { clone: vi.fn().mockReturnValue('cloned-response') }
        const mockCache = { put: vi.fn() }
        vi.stubGlobal('caches', {
            match: vi.fn().mockResolvedValue(undefined),
            open: vi.fn().mockResolvedValue(mockCache),
        })
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

        const request = { url: '/build/app.js' }
        const result = await cacheFirst(request)

        expect(mockCache.put).toHaveBeenCalledWith(request, 'cloned-response')
        expect(result).toBe(response)
    })
})

describe('networkFirst', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
    })

    it('網路成功時寫入 cache 並回傳', async () => {
        const response = { clone: vi.fn().mockReturnValue('cloned-response') }
        const mockCache = { put: vi.fn() }
        vi.stubGlobal('caches', {
            match: vi.fn(),
            open: vi.fn().mockResolvedValue(mockCache),
        })
        vi.stubGlobal('fetch', vi.fn().mockResolvedValue(response))

        const request = { url: '/songs/1' }
        const result = await networkFirst(request)

        expect(mockCache.put).toHaveBeenCalledWith(request, 'cloned-response')
        expect(result).toBe(response)
    })

    it('網路失敗時 fallback 到 cache', async () => {
        const cachedResponse = { cached: true }
        vi.stubGlobal('caches', {
            match: vi.fn().mockResolvedValue(cachedResponse),
            open: vi.fn(),
        })
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

        const result = await networkFirst({ url: '/songs/1' })

        expect(result).toBe(cachedResponse)
    })

    it('網路失敗且 cache 也沒有時拋錯', async () => {
        vi.stubGlobal('caches', {
            match: vi.fn().mockResolvedValue(undefined),
            open: vi.fn(),
        })
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline')))

        await expect(networkFirst({ url: '/songs/1' })).rejects.toThrow('offline')
    })
})
