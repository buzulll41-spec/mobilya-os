/**
 * FAZ 40 — ERP Memory (short-term worker + order scoped).
 * In-memory store; ileride Prisma tablosuna taşınabilir.
 */

export type MemoryEntry = {
  id: string
  workerId: string
  orderId: string
  summary: string
  runId: string
  createdAt: string
  assessment?: {
    priority: string
    taskTitle: string
    recommendedAction?: string
  }
}

const memoryStore = new Map<string, MemoryEntry[]>()
const MAX_ENTRIES_PER_SCOPE = 20

function scopeKey(workerId: string, orderId: string): string {
  return `${workerId}::${orderId}`
}

export function appendErpMemory(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): MemoryEntry {
  const key = scopeKey(entry.workerId, entry.orderId)
  const list = memoryStore.get(key) ?? []
  const full: MemoryEntry = {
    ...entry,
    id: `mem-${Date.now()}-${list.length}`,
    createdAt: new Date().toISOString(),
  }
  list.unshift(full)
  memoryStore.set(key, list.slice(0, MAX_ENTRIES_PER_SCOPE))
  return full
}

export function getErpMemory(workerId: string, orderId: string): MemoryEntry[] {
  return memoryStore.get(scopeKey(workerId, orderId)) ?? []
}

export function summarizeErpMemory(workerId: string, orderId: string): string {
  const entries = getErpMemory(workerId, orderId)
  if (!entries.length) return '(no prior memory for this order)'
  return entries
    .slice(0, 5)
    .map(
      (e, i) =>
        `${i + 1}. [${e.createdAt.slice(0, 16)}] ${e.summary}${
          e.assessment?.recommendedAction ? ` → ${e.assessment.recommendedAction}` : ''
        }`,
    )
    .join('\n')
}

export function resetErpMemoryStore(): void {
  memoryStore.clear()
}
