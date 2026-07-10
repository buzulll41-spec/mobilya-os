import { COLLABORATION_MESSAGE_TYPE } from '../../contracts/v1/collaboration.js'
import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiCollectionSpecialist.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiProcurementSpecialist.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../../contracts/v1/aiSalesFollowUp.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../../contracts/v1/aiShipmentSpecialist.js'
import { AI_COMPANY_MANAGER_WORKER_ID } from '../../contracts/v1/aiCompanyManager.js'

/** @typedef {import('../../contracts/v1/collaboration.js').WorkerCollaborationMessageDto} WorkerCollaborationMessageDto */
/** @typedef {import('../../contracts/v1/collaboration.js').CollaborationGraphEdgeDto} CollaborationGraphEdgeDto */

export const PIPELINE_WORKER_IDS = [
  AI_SALES_FOLLOW_UP_WORKER_ID,
  AI_SHIPMENT_SPECIALIST_WORKER_ID,
  AI_COLLECTION_SPECIALIST_WORKER_ID,
  AI_PROCUREMENT_SPECIALIST_WORKER_ID,
  AI_COMPANY_MANAGER_WORKER_ID,
]

export const WORKER_LABELS = {
  [AI_SALES_FOLLOW_UP_WORKER_ID]: 'Sales AI',
  [AI_SHIPMENT_SPECIALIST_WORKER_ID]: 'Shipment AI',
  [AI_COLLECTION_SPECIALIST_WORKER_ID]: 'Collection AI',
  [AI_PROCUREMENT_SPECIALIST_WORKER_ID]: 'Procurement AI',
  [AI_COMPANY_MANAGER_WORKER_ID]: 'Executive AI',
}

const DOMAIN_TO_WORKER = {
  sales: AI_SALES_FOLLOW_UP_WORKER_ID,
  shipment: AI_SHIPMENT_SPECIALIST_WORKER_ID,
  collection: AI_COLLECTION_SPECIALIST_WORKER_ID,
  procurement: AI_PROCUREMENT_SPECIALIST_WORKER_ID,
}

const MESSAGE_PRIORITY = {
  [COLLABORATION_MESSAGE_TYPE.RISK_ALERT]: 5,
  [COLLABORATION_MESSAGE_TYPE.WAIT]: 4,
  [COLLABORATION_MESSAGE_TYPE.PRIORITY_CHANGE]: 4,
  [COLLABORATION_MESSAGE_TYPE.TASK_TRANSFER]: 3,
  [COLLABORATION_MESSAGE_TYPE.REQUEST_HELP]: 3,
  [COLLABORATION_MESSAGE_TYPE.CONTINUE]: 2,
  [COLLABORATION_MESSAGE_TYPE.INFO]: 1,
}

let seq = 0

/**
 * @param {string} fromWorkerId
 * @param {string} toWorkerId
 * @param {keyof typeof COLLABORATION_MESSAGE_TYPE} type
 * @param {{ reason: string, orderId?: string, status?: string, occurredAt?: string }} payload
 * @returns {WorkerCollaborationMessageDto}
 */
export function createCollaborationMessage(fromWorkerId, toWorkerId, type, payload) {
  seq += 1
  return {
    id: `collab-${Date.now()}-${seq}`,
    fromWorkerId,
    toWorkerId,
    fromWorkerLabel: WORKER_LABELS[fromWorkerId] ?? fromWorkerId,
    toWorkerLabel: WORKER_LABELS[toWorkerId] ?? toWorkerId,
    type,
    reason: payload.reason,
    orderId: payload.orderId,
    status: payload.status,
    occurredAt: payload.occurredAt ?? new Date().toISOString(),
    priority: MESSAGE_PRIORITY[type] ?? 2,
  }
}

/**
 * @param {{
 *   domains: ReturnType<import('../company-manager/PriorityEngine.js').scoreOperationalDomains>
 *   dominant: string
 *   conflicts: import('../company-manager/ConflictResolver.js').WorkerConflict[]
 *   ranked?: import('../../contracts/v1/businessEngine.js').OrderBusinessSnapshot[]
 *   todayIso: string
 * }} ctx
 * @returns {WorkerCollaborationMessageDto[]}
 */
export function detectCollaborationSignals(ctx) {
  const { domains, dominant, conflicts, ranked = [], todayIso } = ctx
  const occurredAt = `${todayIso}T09:15:00.000Z`
  const topOrder = ranked[0]?.orderId
  /** @type {WorkerCollaborationMessageDto[]} */
  const messages = []

  if (domains.collection.pressure >= 2 || domains.collection.score >= 3) {
    messages.push(
      createCollaborationMessage(
        AI_COLLECTION_SPECIALIST_WORKER_ID,
        AI_SHIPMENT_SPECIALIST_WORKER_ID,
        COLLABORATION_MESSAGE_TYPE.WAIT,
        { reason: 'Tahsilat riski HIGH · sevkiyat beklet', orderId: topOrder, occurredAt },
      ),
    )
  }

  if (domains.procurement.pressure >= 2 || dominant === 'procurement') {
    messages.push(
      createCollaborationMessage(
        AI_PROCUREMENT_SPECIALIST_WORKER_ID,
        AI_SALES_FOLLOW_UP_WORKER_ID,
        COLLABORATION_MESSAGE_TYPE.RISK_ALERT,
        { reason: 'Termin gecikecek · müşteriyi bilgilendir', orderId: topOrder, occurredAt },
      ),
    )
  }

  if (domains.sales.pressure >= 1 && domains.collection.pressure <= 1) {
    messages.push(
      createCollaborationMessage(
        AI_SALES_FOLLOW_UP_WORKER_ID,
        AI_COLLECTION_SPECIALIST_WORKER_ID,
        COLLABORATION_MESSAGE_TYPE.INFO,
        { reason: 'Müşteri ödeme yaptı', status: 'PAID', orderId: topOrder, occurredAt },
      ),
    )
    messages.push(
      createCollaborationMessage(
        AI_COLLECTION_SPECIALIST_WORKER_ID,
        AI_SHIPMENT_SPECIALIST_WORKER_ID,
        COLLABORATION_MESSAGE_TYPE.CONTINUE,
        { reason: 'Tahsilat CLOSED · sevkiyat devam', orderId: topOrder, occurredAt },
      ),
    )
  }

  for (const conflict of conflicts.slice(0, 2)) {
    messages.push(
      createCollaborationMessage(
        conflict.workerIds?.[0] ?? conflict.workerId ?? AI_COLLECTION_SPECIALIST_WORKER_ID,
        AI_COMPANY_MANAGER_WORKER_ID,
        COLLABORATION_MESSAGE_TYPE.REQUEST_HELP,
        { reason: conflict.message, orderId: conflict.orderId, occurredAt },
      ),
    )
  }

  const overload = conflicts.find((c) => c.kind === 'QUEUE_OVERLOAD')
  if (overload?.workerId) {
    const transferTarget =
      overload.workerId === AI_SHIPMENT_SPECIALIST_WORKER_ID
        ? AI_COLLECTION_SPECIALIST_WORKER_ID
        : AI_SHIPMENT_SPECIALIST_WORKER_ID
    messages.push(
      createCollaborationMessage(
        overload.workerId,
        transferTarget,
        COLLABORATION_MESSAGE_TYPE.TASK_TRANSFER,
        { reason: 'Kuyruk yoğun · görev devri', occurredAt },
      ),
    )
  }

  const dominantWorker = DOMAIN_TO_WORKER[dominant] ?? AI_COMPANY_MANAGER_WORKER_ID
  messages.push(
    createCollaborationMessage(
      AI_COMPANY_MANAGER_WORKER_ID,
      dominantWorker,
      COLLABORATION_MESSAGE_TYPE.PRIORITY_CHANGE,
      { reason: `${dominant} domain öncelikli`, status: 'HIGH', occurredAt },
    ),
  )

  return dedupeMessages(messages)
}

/** @param {WorkerCollaborationMessageDto[]} messages */
function dedupeMessages(messages) {
  const seen = new Set()
  return messages.filter((m) => {
    const key = `${m.fromWorkerId}|${m.toWorkerId}|${m.type}|${m.reason}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * @param {WorkerCollaborationMessageDto} message
 * @returns {string[]}
 */
export function resolveCollaborationEffects(message) {
  switch (message.type) {
    case COLLABORATION_MESSAGE_TYPE.WAIT:
      return [`${message.toWorkerLabel}: sevkiyat beklet (${message.reason})`]
    case COLLABORATION_MESSAGE_TYPE.CONTINUE:
      return [`${message.toWorkerLabel}: sevkiyat devam (${message.reason})`]
    case COLLABORATION_MESSAGE_TYPE.RISK_ALERT:
      return [`${message.toWorkerLabel}: müşteri iletişimi (${message.reason})`]
    case COLLABORATION_MESSAGE_TYPE.TASK_TRANSFER:
      return [`${message.toWorkerLabel}: görev devralındı`]
    case COLLABORATION_MESSAGE_TYPE.PRIORITY_CHANGE:
      return [`${message.toWorkerLabel}: öncelik yükseltildi`]
    case COLLABORATION_MESSAGE_TYPE.REQUEST_HELP:
      return [`Executive: koordinasyon devralındı`]
    default:
      return [message.reason]
  }
}

/**
 * @param {WorkerCollaborationMessageDto[]} messages
 * @returns {CollaborationGraphEdgeDto[]}
 */
export function buildCollaborationGraph(messages) {
  /** @type {Map<string, CollaborationGraphEdgeDto>} */
  const edges = new Map()

  for (const msg of messages) {
    const id = `${msg.fromWorkerId}->${msg.toWorkerId}:${msg.type}`
    const existing = edges.get(id)
    if (existing) {
      existing.weight += 1
    } else {
      edges.set(id, {
        id,
        fromWorkerId: msg.fromWorkerId,
        toWorkerId: msg.toWorkerId,
        messageType: msg.type,
        weight: 1,
      })
    }
  }

  return [...edges.values()]
}

/** @param {WorkerCollaborationMessageDto[]} messages */
export function sortMessagesByPriority(messages) {
  return [...messages].sort((a, b) => b.priority - a.priority || b.occurredAt.localeCompare(a.occurredAt))
}

/**
 * @param {WorkerCollaborationMessageDto[]} messages
 * @param {string} workerId
 */
export function countHelpRequests(messages, workerId) {
  return messages.filter(
    (m) => m.fromWorkerId === workerId && m.type === COLLABORATION_MESSAGE_TYPE.REQUEST_HELP,
  ).length
}

/**
 * @param {CollaborationGraphEdgeDto[]} graph
 * @returns {string}
 */
export function findBusiestTeamLabel(graph) {
  if (!graph.length) return 'Sales ↔ Shipment'
  const top = [...graph].sort((a, b) => b.weight - a.weight)[0]
  const from = WORKER_LABELS[top.fromWorkerId] ?? top.fromWorkerId
  const to = WORKER_LABELS[top.toWorkerId] ?? top.toWorkerId
  return `${from} ↔ ${to}`
}

/**
 * @param {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto[]} decisions
 * @param {WorkerCollaborationMessageDto[]} messages
 */
export function rankDecisionsByCollaboration(decisions, messages) {
  const sorted = sortMessagesByPriority(messages)
  const topTargets = new Set(sorted.slice(0, 5).map((m) => m.toWorkerId))

  return [...decisions].sort((a, b) => {
    const workerA = a.targetWorkerId ?? a.workerId ?? AI_COMPANY_MANAGER_WORKER_ID
    const workerB = b.targetWorkerId ?? b.workerId ?? AI_COMPANY_MANAGER_WORKER_ID
    const boostA = topTargets.has(workerA) ? 1 : 0
    const boostB = topTargets.has(workerB) ? 1 : 0
    return boostB - boostA
  })
}

export function resetCollaborationEngineSeqForTests() {
  seq = 0
}

export {}
