/**
 * Meyve Birleştir servis çalışanı — oyunu çevrimdışı açılabilir yapar.
 *
 * Yalnızca oyunun kendi dosyalarına dokunur (merge.html, assets/merge-*.js|css,
 * merge ikonları). Aynı origindeki ana uygulamanın istekleri hiç ele geçirilmez;
 * böylece İş İmparatorluğu tarafı bu önbellekten etkilenmez.
 */

const CACHE = 'meyve-birlestir-v2'

self.addEventListener('install', (event) => {
  self.skipWaiting()
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      cache.addAll(['./merge.html', './merge.webmanifest', './merge-icon-192.png', './merge-icon-512.png']).catch(() => undefined),
    ),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('meyve-birlestir-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// Sayfa, karma (hash) içeren varlık adreslerini kurulumdan sonra bildirir;
// böylece ilk açılıştan sonra tamamen çevrimdışı çalışır.
self.addEventListener('message', (event) => {
  const data = event.data
  if (!data || data.type !== 'cache' || !Array.isArray(data.urls)) return
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        data.urls.map((url) =>
          cache
            .match(url, { ignoreVary: true })
            .then((hit) => (hit ? undefined : cache.add(url).catch(() => undefined))),
        ),
      ),
    ),
  )
})

function isGameRequest(request) {
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return false
  if (request.mode === 'navigate') return url.pathname.endsWith('/merge.html')
  return /merge/i.test(url.pathname)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return
  const url = new URL(request.url)
  if (url.origin !== self.location.origin) return

  const game = isGameRequest(request)
  // Önbellekte olmayan ve oyuna ait olmayan istekleri hiç ele geçirme
  if (!game && !url.pathname.includes('/assets/')) return

  event.respondWith(
    (async () => {
      // Vary başlıkları eşleşmese de önbellekteki kopyayı kabul et
      const hit = await caches.match(request, { ignoreVary: true })
      if (hit) {
        if (game) event.waitUntil(refresh(request))
        return hit
      }
      if (!game) return fetch(request)
      try {
        const response = await fetch(request)
        if (response && response.ok) {
          const cache = await caches.open(CACHE)
          await cache.put(request, response.clone())
        }
        return response
      } catch (err) {
        if (request.mode === 'navigate') {
          const shell = await caches.match('./merge.html', { ignoreVary: true })
          if (shell) return shell
        }
        throw err
      }
    })(),
  )
})

async function refresh(request) {
  try {
    const response = await fetch(request)
    if (response && response.ok) {
      const cache = await caches.open(CACHE)
      await cache.put(request, response.clone())
    }
  } catch {
    /* çevrimdışıyız — önbellekteki sürüm iş görür */
  }
}
