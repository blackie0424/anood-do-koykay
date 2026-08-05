importScripts('./sw-strategy.js')

self.addEventListener('install', (event) => {
    event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)))
    self.skipWaiting()
})

self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches
            .keys()
            .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
            .then(() => self.clients.claim()),
    )
})

self.addEventListener('fetch', (event) => {
    const { request } = event

    if (isApiRequest(request.url)) {
        return
    }

    if (isNavigationRequest(request)) {
        event.respondWith(networkFirst(request))
        return
    }

    if (isStaticAssetRequest(request.url)) {
        event.respondWith(cacheFirst(request))
    }
})
