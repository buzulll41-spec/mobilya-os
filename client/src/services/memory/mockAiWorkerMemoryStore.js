/**
 * FAZ 41 — Client-side AI worker memory (mock persistence).
 */

import {
  MEMORY_IMPORTANCE,
  WORKER_CODE_LABELS,
  WORKER_ID_TO_CODE,
} from '../../contracts/v1/aiWorkerMemory.js'
import {
  buildDemoSeedMemories,
  buildMemoriesFromDomainEvent,
} from './memoryFromDomainEvent.js'
import { initialOrders } from '../../data/seedOrders.js'

/** @typedef {import('../../contracts/v1/aiWorkerMemory.js').AIWorkerMemoryDto} AIWorkerMemoryDto */

/** @type {AIWorkerMemoryDto[]} */
let memories = []

/** @type {Set<string>} */
const dedupeKeys = new Set()

let infrastructureReady = false

function cloneMemory(/** @type {AIWorkerMemoryDto} */ m) {
  return { ...m }
}

function resolveOrderContext(/** @type {string} */ orderId) {
  const order = initialOrders.find((o) => o.id === orderId)
  if (!order) return { orderLabel: orderId }
  return {
    customerName: order.customer,
    customerId: order.customer,
    orderLabel: order.id,
  }
}

/**
 * @param {import('./memoryFromDomainEvent.js').CreateMemoryDraft} draft
 * @returns {AIWorkerMemoryDto | null}
 */
function persistDraft(draft) {
  const key =
    draft.dedupeKey ??
    `${draft.workerCode}:${draft.entityType}:${draft.entityId}:${draft.sourceEvent ?? draft.title}`
  if (dedupeKeys.has(key)) {
    return memories.find((m) => m.sourceEvent === draft.sourceEvent && m.workerCode === draft.workerCode) ?? null
  }

  const now = new Date().toISOString()
  /** @type {AIWorkerMemoryDto} */
  const row = {
    id: `mem-${Date.now()}-${memories.length}`,
    workerCode: draft.workerCode,
    entityType: draft.entityType,
    entityId: draft.entityId,
    memoryType: draft.memoryType,
    title: draft.title,
    content: draft.content,
    importance: draft.importance,
    sourceEvent: draft.sourceEvent ?? null,
    active: true,
    createdAt: now,
    updatedAt: now,
  }

  dedupeKeys.add(key)
  memories = [row, ...memories]
  return row
}

/**
 * @param {import('../../contracts/v1/domainEvent.js').DomainEventDto} event
 */
export function ingestMemoryFromDomainEvent(event) {
  const ctx = resolveOrderContext(event.aggregateId)
  const drafts = buildMemoriesFromDomainEvent(event, ctx)
  return drafts.map((d) => persistDraft(d)).filter(Boolean)
}

function seedDemoMemories() {
  for (const draft of buildDemoSeedMemories()) {
    persistDraft(draft)
  }
}

/**
 * @param {import('../../contracts/v1/domainEvent.js').DomainEventDto[]} [events]
 */
export function bootstrapAiWorkerMemoryStore(events = []) {
  memories = []
  dedupeKeys.clear()
  infrastructureReady = false

  for (const evt of events) {
    ingestMemoryFromDomainEvent(evt)
  }
  seedDemoMemories()
  infrastructureReady = true
}

export function resetMockAiWorkerMemoryStore(events = []) {
  bootstrapAiWorkerMemoryStore(events)
}

export function isMemoryInfrastructureReady() {
  return infrastructureReady
}

/** @param {boolean} value */
export function setMemoryInfrastructureReadyForTests(value) {
  infrastructureReady = value
}

/** @returns {AIWorkerMemoryDto[]} */
export function getAllMemoriesSnapshot() {
  return memories.map(cloneMemory)
}

/**
 * @param {{ workerCode?: string, workerId?: string, active?: boolean, importance?: string, limit?: number }} [filters]
 */
export function listMemories(filters = {}) {
  const workerCode = filters.workerCode
    ?? (filters.workerId ? WORKER_ID_TO_CODE[filters.workerId] : undefined)

  let rows = memories.filter((m) => (filters.active === false ? true : m.active))
  if (workerCode) rows = rows.filter((m) => m.workerCode === workerCode)
  if (filters.importance) rows = rows.filter((m) => m.importance === filters.importance)
  rows = rows.slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  if (filters.limit) rows = rows.slice(0, filters.limit)
  return rows.map(cloneMemory)
}

/**
 * @param {{
 *   workerId: string
 *   orderId?: string
 *   customerName?: string
 *   limit?: number
 * }} query
 */
export function listMemoriesForWorkerContext(query) {
  const workerCode = WORKER_ID_TO_CODE[query.workerId] ?? query.workerId
  const entityIds = [query.orderId, query.customerName].filter(Boolean)
  let rows = listMemories({ workerCode, limit: 200 })

  if (entityIds.length) {
    const scoped = rows.filter((m) => entityIds.includes(m.entityId))
    if (scoped.length) rows = scoped
  }

  return rows.slice(0, query.limit ?? 12)
}

/**
 * @param {typeof query} query
 */
export function buildWorkerMemoryContextText(query) {
  const items = listMemoriesForWorkerContext(query)
  if (!items.length) return '(no persistent ERP memories for this worker context)'
  return items
    .map(
      (m, i) =>
        `${i + 1}. [${m.importance}] ${m.memoryType} · ${m.title}\n   ${m.content} (${m.createdAt.slice(0, 10)})`,
    )
    .join('\n')
}

/** @param {string} id */
export function deactivateMemory(id) {
  const idx = memories.findIndex((m) => m.id === id)
  if (idx < 0) return null
  memories[idx] = { ...memories[idx], active: false, updatedAt: new Date().toISOString() }
  return cloneMemory(memories[idx])
}

/** @param {string} id */
export function deleteMemory(id) {
  const before = memories.length
  memories = memories.filter((m) => m.id !== id)
  return memories.length < before
}

/**
 * @param {number} [limit]
 * @returns {import('../../mappers/executive/ceoExperienceModel.js').CeoLearnedInsightVm[]}
 */
export function buildCeoLearnedInsights(limit = 6) {
  return listMemories({ limit: 50 })
    .filter((m) => m.importance === MEMORY_IMPORTANCE.CRITICAL || m.importance === MEMORY_IMPORTANCE.HIGH)
    .slice(0, limit)
    .map((m) => ({
      id: m.id,
      workerCode: m.workerCode,
      workerLabel: WORKER_CODE_LABELS[m.workerCode] ?? m.workerCode,
      message: formatCeoLearnedMessage(m),
      importance: m.importance,
      entityLabel: `${m.memoryType} · ${m.entityId}`,
      createdAt: m.createdAt,
    }))
}

/** @param {AIWorkerMemoryDto} memory */
export function formatCeoLearnedMessage(memory) {
  const workerLabel = WORKER_CODE_LABELS[memory.workerCode] ?? memory.workerCode
  const entity =
    memory.memoryType === 'SUPPLIER' || memory.memoryType === 'CUSTOMER'
      ? `${memory.entityId}'ın`
      : `${memory.entityId} için`
  return `${workerLabel}, ${entity} ${memory.content.replace(/\.$/, '')} öğrendi.`
}

/**
 * @param {AIWorkerMemoryDto} memory
 */
/**
 * FAZ 44 — Persist assessment outcome after digital employee run.
 * @param {string} workerId
 * @param {import('../../contracts/v1/aiWorkerRunner.js').AiWorkerAssessmentDto | null | undefined} assessment
 * @param {string} sourceRunId
 */
export function createMemoryFromDigitalEmployeeRun(workerId, assessment, sourceRunId) {
  if (!assessment?.orderId) return null
  const workerCode = WORKER_ID_TO_CODE[workerId]
  if (!workerCode) return null

  const importance =
    assessment.priority === 'CRITICAL'
      ? MEMORY_IMPORTANCE.CRITICAL
      : assessment.priority === 'HIGH'
        ? MEMORY_IMPORTANCE.HIGH
        : MEMORY_IMPORTANCE.NORMAL

  return persistDraft({
    workerCode,
    entityType: 'ORDER',
    entityId: assessment.orderId,
    memoryType: 'TASK',
    title: assessment.taskTitle,
    content: assessment.recommendedAction ?? assessment.taskDescription ?? assessment.taskTitle,
    importance,
    sourceEvent: `digital-employee:${sourceRunId}`,
    dedupeKey: `${workerCode}:digital-employee:${sourceRunId}`,
  })
}

export function buildWorkerMemoryRowVm(memory) {
  return {
    id: memory.id,
    dateLabel: memory.createdAt.slice(0, 10),
    typeLabel: memory.memoryType,
    title: memory.title,
    importance: memory.importance,
    importanceLabel:
      memory.importance === 'CRITICAL'
        ? 'Kritik'
        : memory.importance === 'HIGH'
          ? 'Yüksek'
          : memory.importance === 'LOW'
            ? 'Düşük'
            : 'Normal',
    importanceTone:
      memory.importance === 'CRITICAL'
        ? 'critical'
        : memory.importance === 'HIGH'
          ? 'warning'
          : memory.importance === 'LOW'
            ? 'muted'
            : 'info',
    relatedRecord: `${memory.entityType} · ${memory.entityId}`,
    content: memory.content,
  }
}

export {}
