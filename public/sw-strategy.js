const CACHE_VERSION = 'v1'
const CACHE_NAME = `anood-cache-${CACHE_VERSION}`

const PRECACHE_URLS = [
    '/',
    '/icons/icon-192.png',
    '/icons/icon-512.png',
    '/manifest.json',
]

const STATIC_ASSET_EXTENSIONS = ['.js', '.css', '.png', '.svg']

function isStaticAssetRequest(url) {
    const { pathname } = new URL(url)
    return STATIC_ASSET_EXTENSIONS.some((ext) => pathname.endsWith(ext))
}

function isApiRequest(url) {
    return new URL(url).pathname.startsWith('/api/')
}

function isNavigationRequest(request) {
    return request.mode === 'navigate'
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CACHE_VERSION,
        CACHE_NAME,
        PRECACHE_URLS,
        isStaticAssetRequest,
        isApiRequest,
        isNavigationRequest,
    }
}
