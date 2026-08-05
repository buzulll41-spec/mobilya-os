import { ApiClientError } from './apiClient.js'

const DEFAULT_RETRYABLE = new Set(['network', 'timeout'])

/**
 * @param {unknown} err
 * @param {Set<string>} [retryableKinds]
 */
export function isRetryableApiError(err, retryableKinds = DEFAULT_RETRYABLE) {
  if (!(err instanceof ApiClientError)) return false
  return retryableKinds.has(err.kind)
}

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {{
 *   maxAttempts?: number
 *   delayMs?: number
 *   backoff?: number
 *   shouldRetry?: (err: unknown, attempt: number) => boolean
 *   onRetry?: (err: unknown, attempt: number) => void
 * }} [options]
 * @returns {Promise<T>}
 */
export async function withApiRetry(fn, options = {}) {
  const maxAttempts = options.maxAttempts ?? 3
  const delayMs = options.delayMs ?? 800
  const backoff = options.backoff ?? 1.5
  const shouldRetry = options.shouldRetry ?? ((err) => isRetryableApiError(err))

  let lastError
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await fn()
    } catch (err) {
      lastError = err
      if (attempt >= maxAttempts || !shouldRetry(err, attempt)) throw err
      options.onRetry?.(err, attempt)
      const wait = Math.round(delayMs * backoff ** (attempt - 1))
      await new Promise((resolve) => setTimeout(resolve, wait))
    }
  }
  throw lastError
}

/**
 * @template T
 * @param {() => Promise<T>} fn
 * @param {Parameters<typeof withApiRetry>[1]} [options]
 */
export function createRetryingRequest(fn, options) {
  return () => withApiRetry(fn, options)
}
