import { BusinessEngine } from './businessEngine.js'
import { DIGITAL_WORKER_STATUS, WORKER_PRIORITY } from '../contracts/v1/digitalWorker.js'
import {
  WORKER_PIPELINE_ORDER,
  WORKER_PIPELINE_STAGE,
  WORKER_DISPLAY_NAMES,
} from '../contracts/v1/workerOrchestration.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../contracts/v1/aiSalesFollowUp.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../contracts/v1/aiShipmentSpecialist.js'
import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../contracts/v1/aiCollectionSpecialist.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from '../contracts/v1/aiProcurementSpecialist.js'
import {
  evaluateSalesFollowUp,
  buildWorkerTaskFromAssessment,
} from '../services/aiSalesFollowUpService.js'
import {
  evaluateShipmentSpecialist,
  buildWorkerTaskFromShipmentAssessment,
} from '../services/aiShipmentSpecialistService.js'
import {
  evaluateCollectionSpecialist,
  buildWorkerTaskFromCollectionAssessment,
} from '../services/aiCollectionSpecialistService.js'
import {
  evaluateProcurementSpecialist,
  buildWorkerTaskFromProcurementAssessment,
} from '../services/aiProcurementSpecialistService.js'
import { getAllDomainEventsSnapshot } from '../services/mockDomainEventStore.js'
import { listWorkerTasks } from '../services/mockDigitalWorkforceStore.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../contracts/v1/workerTask.js').WorkerTask} WorkerTask */
/** @typedef {import('../contracts/v1/workerTask.js').WorkerTaskHistoryEntry} WorkerTaskHistoryEntry */

/** @type {Record<string, { title: string, description: string, sourceModule: string }>} */
export const ORCHESTRATION_FALLBACK_TASKS = {
  [AI_SHIPMENT_SPECIALIST_WORKER_ID]: {
    title: 'Sevk planı oluştur',
    description: 'Orkestrasyon: AI Sales tamamlandı → sevk planı hazırlanıyor',
    sourceModule: 'Shipment',
  },
  [AI_COLLECTION_SPECIALIST_WORKER_ID]: {
    title: 'Kapora hatırlatması gönder',
    description: 'Orkestrasyon: AI Shipment tamamlandı → tahsilat adımı',
    sourceModule: 'Collection',
  },
  [AI_PROCUREMENT_SPECIALIST_WORKER_ID]: {
    title: 'Eksik ürün sipariş et',
    description: 'Orkestrasyon: AI Collection tamamlandı → tedarik adımı',
    sourceModule: 'Procurement',
  },
}

/** @param {string} workerId */
export function resolveNextWorkerInPipeline(workerId) {
  const idx = WORKER_PIPELINE_ORDER.indexOf(/** @type {typeof WORKER_PIPELINE_ORDER[number]} */ (workerId))
  if (idx < 0 || idx >= WORKER_PIPELINE_ORDER.length - 1) return null
  return WORKER_PIPELINE_ORDER[idx + 1]
}

/**
 * Business Engine snapshot okur — core değişmez.
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
export function readOrderBusinessSnapshot(order, dto, todayIso) {
  return BusinessEngine.computeOrderSnapshot({ order, dto, todayIso })
}

/**
 * @param {string} nextWorkerId
 * @param {import('../contracts/v1/businessEngine.js').OrderBusinessSnapshot} snap
 */
export function isPipelineRouteAllowed(nextWorkerId, snap) {
  if (!snap) return true
  void nextWorkerId
  return snap.priority !== 'LOW' || true
}

/**
 * @param {string} workerId
 * @param {string} orderId
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} dtos
 * @param {string} todayIso
 * @param {string} nowIso
 * @param {string} fromWorkerId
 * @param {string} chainId
 */
export function buildRoutedWorkerTask(
  workerId,
  orderId,
  orders,
  dtos,
  todayIso,
  nowIso,
  fromWorkerId,
  chainId,
) {
  const order = orders.find((o) => o.id === orderId)
  const dto = dtos.find((d) => d.id === orderId)
  if (!order) return null

  const domainEvents = getAllDomainEventsSnapshot()
  const existingTasks = listWorkerTasks()

  if (workerId === AI_SHIPMENT_SPECIALIST_WORKER_ID) {
    const assessment = evaluateShipmentSpecialist(orders, dtos, todayIso, domainEvents, existingTasks).find(
      (a) => a.orderId === orderId && a.eligible,
    )
    if (assessment) {
      const task = buildWorkerTaskFromShipmentAssessment(assessment, nowIso)
      return { task: { ...task, id: `wt-orch-${task.id}` }, assessment }
    }
  }

  if (workerId === AI_COLLECTION_SPECIALIST_WORKER_ID) {
    const assessment = evaluateCollectionSpecialist(orders, dtos, todayIso, domainEvents, existingTasks).find(
      (a) => a.orderId === orderId && a.eligible,
    )
    if (assessment) {
      const task = buildWorkerTaskFromCollectionAssessment(assessment, nowIso)
      return { task: { ...task, id: `wt-orch-${task.id}` }, assessment }
    }
  }

  if (workerId === AI_PROCUREMENT_SPECIALIST_WORKER_ID) {
    const assessment = evaluateProcurementSpecialist(orders, dtos, todayIso, domainEvents, existingTasks).find(
      (a) => a.orderId === orderId && a.eligible,
    )
    if (assessment) {
      const task = buildWorkerTaskFromProcurementAssessment(assessment, nowIso)
      return { task: { ...task, id: `wt-orch-${task.id}` }, assessment }
    }
  }

  if (workerId === AI_SALES_FOLLOW_UP_WORKER_ID) {
    const assessment = evaluateSalesFollowUp(orders, dtos, todayIso, domainEvents, existingTasks).find(
      (a) => a.orderId === orderId && a.eligible,
    )
    if (assessment) {
      const task = buildWorkerTaskFromAssessment(assessment, nowIso)
      return { task: { ...task, id: `wt-orch-${task.id}` }, assessment }
    }
  }

  const fallback = ORCHESTRATION_FALLBACK_TASKS[workerId]
  if (!fallback) return null

  const snap = readOrderBusinessSnapshot(order, dto, todayIso)
  /** @type {WorkerTask} */
  const task = {
    id: `wt-orch-${workerId}-${orderId}-${Date.parse(nowIso)}`,
    workerId,
    title: fallback.title,
    description: `${fallback.description} · ${orderId}`,
    priority: WORKER_PRIORITY.HIGH,
    status: DIGITAL_WORKER_STATUS.WAITING,
    sourceModule: fallback.sourceModule,
    targetModule: snap.kanbanColumnId,
    relatedEntityId: orderId,
    relatedModule: fallback.sourceModule,
    createdAt: nowIso,
    startedAt: null,
    finishedAt: null,
    completedAt: null,
    result: null,
    createdBy: `orchestrator:${fromWorkerId}`,
  }
  return { task, assessment: null }
}

/**
 * @param {WorkerTaskHistoryEntry} completedEntry
 */
export function buildCeoTimelineMessage(completedEntry) {
  const workerLabel = WORKER_DISPLAY_NAMES[completedEntry.workerId] ?? completedEntry.workerId
  const orderRef = completedEntry.relatedEntityId ?? '—'
  const stage = WORKER_PIPELINE_STAGE[completedEntry.workerId]

  if (stage === 'SALES') return `${workerLabel} — Sipariş ${orderRef} tamamlandı.`
  if (stage === 'SHIPMENT') return `${workerLabel} — Sevk planı oluşturdu.`
  if (stage === 'COLLECTION') return `${workerLabel} — Kapora hatırlatması gönderildi.`
  if (stage === 'PROCUREMENT') return `${workerLabel} — Eksik ürün sipariş edildi.`
  return `${workerLabel} — ${completedEntry.title}`
}

/** @param {string} orderId */
export function buildChainCompleteMessage(orderId) {
  return `Operasyon tamamlandı — ${orderId}`
}

/** @param {string} workerId */
export function resolveWorkerActivityTone(workerId) {
  if (workerId === AI_SALES_FOLLOW_UP_WORKER_ID) return 'sales'
  if (workerId === AI_SHIPMENT_SPECIALIST_WORKER_ID) return 'shipment'
  if (workerId === AI_COLLECTION_SPECIALIST_WORKER_ID) return 'collection'
  if (workerId === AI_PROCUREMENT_SPECIALIST_WORKER_ID) return 'procurement'
  return 'neutral'
}
