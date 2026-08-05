export const CACHE_VERSION = 'v1'
export const CACHE_NAME = `anood-cache-${CACHE_VERSION}`

export const PRECACHE_URLS = [
    '/',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/manifest.json',
]

const STATIC_ASSET_EXTENSIONS = ['.js', '.css', '.png', '.svg']

export function isStaticAssetRequest(url) {
    const { pathname } = new URL(url)
    return STATIC_ASSET_EXTENSIONS.some((ext) => pathname.endsWith(ext))
}

export function isApiRequest(url) {
    return new URL(url).pathname.startsWith('/api/')
}

export function isNavigationRequest(request) {
    return request.mode === 'navigate'
}
