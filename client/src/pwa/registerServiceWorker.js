import { PWA_SERVICE_WORKER_PATH } from '../contracts/v1/mobilePwa.js'

/** Service worker kaydı — PWA offline kabuğu. */
export function registerServiceWorker() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) return

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
