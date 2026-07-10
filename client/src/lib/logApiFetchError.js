import { ApiClientError } from './apiClient.js'
import { recordErrorCenterEntry } from './errorCenterStore.js'

/**
 * Tüm API fetch hatalarını Error Center'a kaydeder.
 * @param {unknown} err
 * @param {string} [method]
 * @param {string} [url]
 */
export function logApiFetchError(err, method, url) {
  if (!(err instanceof ApiClientError)) return

  const category =
    err.kind === 'network' || err.kind === 'timeout'
      ? 'network'
      : err.kind === 'parse'
        ? 'validation'
        : 'api'

  const detail = [method, url].filter(Boolean).join(' ')
  const message = detail ? `[${detail}] ${err.message}` : err.message

  recordErrorCenterEntry({
    category,
    message,
    stack: err.stack,
    pageId:
      typeof window !== 'undefined' && window.location.hash
        ? window.location.hash.replace(/^#\/?/, '').split('?')[0] || 'home'
        : undefined,
  })
}
