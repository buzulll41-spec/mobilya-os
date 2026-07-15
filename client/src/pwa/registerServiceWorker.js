import { PWA_SERVICE_WORKER_PATH } from '../contracts/v1/mobilePwa.js'

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
    navigator.serviceWorker.register(PWA_SERVICE_WORKER_PATH).catch(() => {
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
