const CACHE_PREFIX = 'mobilya-os-shell-'
const CACHE_NAME = 'mobilya-os-shell-v6-free-pilot'
const OFFLINE_URL = '/offline.html'
const BG_SYNC_TAG = 'mobilya-os-offline-sync'
const SHELL = ['/', '/#/', '/index.html', OFFLINE_URL, '/favicon.svg', '/pwa-icon-192.svg', '/pwa-icon-512.svg', '/manifest.webmanifest']

function isApiOrAuthRequest(request, url) {
  return (
    request.headers.has('Authorization') ||
    url.pathname.startsWith('/v1/') ||
    url.pathname.startsWith('/api/')
  )
}

function canCacheResponse(response) {
  return Boolean(response) && response.status === 200 && response.type !== 'opaque'
}

async function networkFirst(request, fallbackKey = request) {
  const cache = await caches.open(CACHE_NAME)
  try {
    const response = await fetch(request)
    if (canCacheResponse(response)) {
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return (await cache.match(request)) || (await cache.match(fallbackKey))
  }
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k.startsWith(CACHE_PREFIX) && k !== CACHE_NAME).map((k) => caches.delete(k))),
    ).then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('sync', (event) => {
  if (event.tag !== BG_SYNC_TAG) return
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) =>
      Promise.all(
        clients.map((client) =>
          client.postMessage({ type: 'OFFLINE_SYNC_REQUEST', tag: BG_SYNC_TAG }),
        ),
      ),
    ),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (isApiOrAuthRequest(request, url)) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      networkFirst(request, '/index.html').then(async (response) => {
        if (response) return response
        return (await caches.match(OFFLINE_URL)) || Response.error()
      }),
    )
    return
  }

  if (url.origin !== self.location.origin) {
    event.respondWith(fetch(request))
    return
  }

  if (['script', 'style', 'worker', 'manifest'].includes(request.destination)) {
    event.respondWith(networkFirst(request))
    return
  }

  event.respondWith(
    caches.match(request).then(async (cached) => {
      if (cached) return cached
      const response = await fetch(request)
      if (canCacheResponse(response)) {
        const cache = await caches.open(CACHE_NAME)
        cache.put(request, response.clone())
      }
      return response
    }),
  )
})
