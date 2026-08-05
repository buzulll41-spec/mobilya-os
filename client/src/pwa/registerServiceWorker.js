import { PWA_SERVICE_WORKER_PATH } from '../contracts/v1/mobilePwa.js'
import { BUILD_STATUS } from '../constants/buildStatus.js'
import { toastInfo } from '../lib/toastBus.js'

/** Service worker kaydı — PWA offline kabuğu. */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

  const isProd = Boolean(import.meta?.env?.PROD)
  if (!isProd) {
    // Dev ortamında stale SW/cache eski bundle döndürebilir; her açılışta temizle.
    void navigator.serviceWorker
      .getRegistrations()
      .then((regs) => Promise.all(regs.map((r) => r.unregister())))
      .catch(() => {
        /* best effort */
      })

    if ('caches' in window) {
      void caches
        .keys()
        .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
        .catch(() => {
          /* best effort */
        })
    }
    return
  }

  window.addEventListener('load', () => {
    const swUrl = `${PWA_SERVICE_WORKER_PATH}?build=${encodeURIComponent(`${BUILD_STATUS.version}-${BUILD_STATUS.timestamp}`)}`
    let refreshing = false

    function activateWaitingWorker(registration) {
      const waiting = registration.waiting
      if (!waiting) return
      toastInfo(`Yeni surum hazir (v${BUILD_STATUS.version}). Uygulama guncelleniyor...`)
      waiting.postMessage({ type: 'SKIP_WAITING' })
    }

    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (refreshing) return
      refreshing = true
      window.location.reload()
    })

    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'OFFLINE_SYNC_REQUEST') {
        toastInfo('Cevrimdisi isler senkronize ediliyor...')
      }
    })

    navigator.serviceWorker
      .register(swUrl, { updateViaCache: 'none' })
      .then((registration) => {
        activateWaitingWorker(registration)

        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              activateWaitingWorker(registration)
            }
          })
        })

        if ('sync' in registration) {
          registration.sync.register('mobilya-os-offline-sync').catch(() => undefined)
        }

        return registration.update().catch(() => undefined)
      })
      .catch(() => {
        /* SW opsiyonel — geliştirme ortamında sessiz */
      })
  })
}

/** @param {HTMLElement | null} node */
export function dismissSplashScreen(node) {
  if (!node) return
  node.classList.add('mos-splash--hide')
  window.setTimeout(() => node.remove(), 320)
}
