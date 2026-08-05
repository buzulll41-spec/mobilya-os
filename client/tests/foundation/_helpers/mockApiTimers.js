import { vi } from 'vitest'

/**
 * mockApi fakeLatency timer’larını ilerleterek async işi tamamlar.
 * Akışlar birden fazla fazda (ör. executeRefreshOrdersFlow → fetchDomainEventsAndTasks)
 * yeni timer planlayabilir; bu yüzden tek/çift flush yerine promise settle olana kadar
 * timer + microtask flush döngüsü uygulanır.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function runWithMockApiTimers(fn) {
  vi.useFakeTimers()
  try {
    let settled = false
    /** @type {T} */
    let value
    /** @type {unknown} */
    let failure
    let failed = false
    const p = fn().then(
      (r) => {
        value = r
        settled = true
      },
      (e) => {
        failure = e
        failed = true
        settled = true
      },
    )
    for (let i = 0; i < 50 && !settled; i++) {
      await vi.runAllTimersAsync()
      await Promise.resolve()
    }
    await p
    if (failed) throw failure
    return value
  } finally {
    vi.useRealTimers()
  }
}
