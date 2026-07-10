import { vi } from 'vitest'

/**
 * mockApi fakeLatency timer’larını ilerleterek async işi tamamlar.
 * executeRefreshOrdersFlow ikinci fazda (fetchDomainEventsAndTasks) yeni timer planlar;
 * tek runAllTimersAsync yetmez — bir microtask turu + ikinci flush gerekir.
 * @template T
 * @param {() => Promise<T>} fn
 * @returns {Promise<T>}
 */
export async function runWithMockApiTimers(fn) {
  vi.useFakeTimers()
  try {
    const p = fn()
    await vi.runAllTimersAsync()
    await Promise.resolve()
    await vi.runAllTimersAsync()
    return await p
  } finally {
    vi.useRealTimers()
  }
}
