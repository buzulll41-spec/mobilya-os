/** @typedef {'runtime' | 'api' | 'boundary' | 'network' | 'validation'} ErrorCategory */

/**
 * @typedef {Object} ErrorCenterEntry
 * @property {string} id
 * @property {ErrorCategory} category
 * @property {string} message
 * @property {string} [stack]
 * @property {string} [userName]
 * @property {string} [userRole]
 * @property {string} [pageId]
 * @property {string} occurredAt
 * @property {boolean} resolved
 * @property {string} [resolvedAt]
 */

/** @type {ErrorCenterEntry[]} */
const errors = []

const MAX_ERRORS = 100

/** @type {Set<() => void>} */
const listeners = new Set()

function bump() {
  for (const l of listeners) l()
}

/** @param {() => void} listener */
export function subscribeErrorCenter(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * @param {{
 *   category?: ErrorCategory
 *   message: string
 *   stack?: string
 *   userName?: string
 *   userRole?: string
 *   pageId?: string
 * }} input
 */
export function recordErrorCenterEntry(input) {
  const entry = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    category: input.category ?? 'runtime',
    message: input.message,
    stack: input.stack,
    userName: input.userName,
    userRole: input.userRole,
    pageId: input.pageId,
    occurredAt: new Date().toISOString(),
    resolved: false,
  }
  errors.unshift(entry)
  if (errors.length > MAX_ERRORS) errors.pop()
  bump()
  if (typeof globalThis !== 'undefined' && globalThis.dispatchEvent) {
    globalThis.dispatchEvent(new CustomEvent('mobilya:error-center', { detail: entry }))
  }
  return entry
}

/** @param {number} [limit] */
export function listErrorCenterEntries(limit = 100) {
  return errors.slice(0, limit)
}

/** @param {string} todayIso YYYY-MM-DD */
export function listTodayErrors(todayIso) {
  return errors.filter((e) => e.occurredAt.slice(0, 10) === todayIso)
}

/** @param {string} id */
export function resolveErrorCenterEntry(id) {
  const entry = errors.find((e) => e.id === id)
  if (!entry || entry.resolved) return null
  entry.resolved = true
  entry.resolvedAt = new Date().toISOString()
  bump()
  return entry
}

export function clearErrorCenterForTests() {
  errors.length = 0
  listeners.clear()
}
