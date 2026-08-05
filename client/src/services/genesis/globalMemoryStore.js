import { listMemories } from '../memory/mockAiWorkerMemoryStore.js'

/** @typedef {import('../../contracts/v1/genesis.js').GlobalMemoryEntry} GlobalMemoryEntry */

/** @type {GlobalMemoryEntry[]} */
let companyMemories = []

/** @type {Set<() => void>} */
const listeners = new Set()

function bump() {
  for (const listener of listeners) listener()
}

/** @param {() => void} listener */
export function subscribeGlobalMemoryStore(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * @param {Omit<GlobalMemoryEntry, 'id' | 'occurredAt'> & { occurredAt?: string }} input
 */
export function recordCompanyMemory(input) {
  const entry = {
    id: `gmem-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    occurredAt: input.occurredAt ?? new Date().toISOString(),
    ...input,
  }
  companyMemories.unshift(entry)
  if (companyMemories.length > 500) companyMemories.pop()
  bump()
  return entry
}

/**
 * @param {{ strategy: string, success: boolean, detail?: string }} input
 */
export function recordStrategyOutcome(input) {
  return recordCompanyMemory({
    category: input.success ? 'strategy' : 'failure',
    title: input.strategy,
    detail: input.detail ?? (input.success ? 'Başarılı strateji' : 'Başarısız karar'),
    success: input.success,
  })
}

/** @param {number} [limit] */
export function listCompanyMemories(limit = 50) {
  return companyMemories.slice(0, limit).map((m) => ({ ...m }))
}

/** @param {number} [limit] */
export function listGlobalMemories(limit = 30) {
  const workerMemories = listMemories({ limit }).map((m) => ({
    id: m.id,
    category: /** @type {GlobalMemoryEntry['category']} */ ('historical'),
    title: m.title,
    detail: m.summary ?? m.title,
    success: m.importance !== 'LOW',
    occurredAt: m.createdAt,
  }))
  return [...listCompanyMemories(limit), ...workerMemories].slice(0, limit)
}

export function resetGlobalMemoryStore() {
  companyMemories = []
  listeners.clear()
}

export {}
