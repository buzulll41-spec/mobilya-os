import { DEMO_TODAY } from '../data/constants.js'
import { formatTry } from '../data/dashboardHelpers.js'
import { DOMAIN_EVENT_TYPE } from '../contracts/v1/domainEventTypes.js'
import { AUDIT_MODULE } from '../contracts/v1/auditModule.js'
import { DIGITAL_WORKER_STATUS, WORKER_PRIORITY } from '../contracts/v1/digitalWorker.js'
import {
  AI_COLLECTION_SPECIALIST_WORKER_ID,
  COLLECTION_SPECIALIST_SOURCE_MODULE,
} from '../contracts/v1/aiCollectionSpecialist.js'
import { BusinessEngine } from '../engine/businessEngine.js'
import { recordAuditEvent } from '../lib/audit/recordAuditEvent.js'
import { appendDomainEvent } from '../services/mockDomainEventStore.js'
import { getPaymentTransactionsForSalesOrder } from '../services/mockPaymentStore.js'
import { moneyToNumber } from '../mappers/moneyHelpers.js'
import { remainingBalance } from '../utils/orderFinance.js'
import { isCollectionOverdue } from '../mappers/collection/collectionCommandCenterModel.js'
import { mapListItemToCollectionRowVM } from '../mappers/payment/mapListItemToCollectionRowVM.js'
import {
  applyPredictionScoreToWorkerAssessment,
  buildWorkerRuntimeCtx,
} from './prediction/predictionWorkerBlend.js'
import { recordWorkerDecisionQuality } from './decision/DecisionQualityService.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../contracts/v1/workerTask.js').WorkerTask} WorkerTask */
/** @typedef {import('../contracts/v1/aiCollectionSpecialist.js').CollectionSpecialistAssessment} CollectionSpecialistAssessment */
/** @typedef {import('../contracts/v1/aiCollectionSpecialist.js').CollectionSpecialistPriority} CollectionSpecialistPriority */

const MIN_ORDER_AGE_DAYS = 30
const APPROACHING_VADE_DAYS = 7

/**
 * @param {Order} order
 * @returns {import('../contracts/v1/collectionRowVm.js').CollectionRowVM}
 */
function toCollectionRowFromOrder(order) {
  const total = order.totalAmount ?? order.amount ?? 0
  const paid = order.paidAmount ?? 0
  return {
    id: order.id,
    customer: order.customer,
    product: order.product,
    status: order.status,
    amount: total,
    paidAmount: paid,
    paid: order.paid === true,
    orderDate: order.orderDate,
    dueDate: order.dueDate ?? null,
    shipmentDate: order.shipmentDate ?? null,
    phone: order.phone ?? '',
    paymentProgress: total > 0 ? Math.round((paid / total) * 100) : 0,
    hasOverdueBalance: Boolean(order.dueDate && order.dueDate < DEMO_TODAY && !order.paid),
    lastPaymentAt: null,
    riskSignalOverduePartialShipment: false,
  }
}

/** @param {string} fromIso @param {string} toIso */
function daysBetween(fromIso, toIso) {
  const a = new Date(`${fromIso}T12:00:00`).getTime()
  const b = new Date(`${toIso}T12:00:00`).getTime()
  return Math.floor((b - a) / 86_400_000)
}

/** @param {number} score */
function priorityFromScore(score) {
  if (score >= 80) return /** @type {CollectionSpecialistPriority} */ ('CRITICAL')
  if (score >= 60) return 'HIGH'
  if (score >= 35) return 'NORMAL'
  return 'LOW'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
function orderRemaining(order, dto) {
  return dto ? moneyToNumber(dto.remainingAmount ?? dto.amountDue) : remainingBalance(order)
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
function orderPaid(order, dto) {
  return dto ? moneyToNumber(dto.amountPaid) : order.paidAmount ?? 0
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
export function isCollectionSpecialistEligible(order, dto, todayIso = DEMO_TODAY) {
  if (order.status === 'İptal') return false
  const remaining = orderRemaining(order, dto)
  if (remaining <= 0.009) return false

  const collectionRow = dto ? mapListItemToCollectionRowVM(dto) : toCollectionRowFromOrder(order)
  const vadeDate = order.dueDate
  const vadeApproaching =
    Boolean(vadeDate) &&
    vadeDate >= todayIso &&
    daysBetween(todayIso, vadeDate) <= APPROACHING_VADE_DAYS
  const vadePast = Boolean(vadeDate && vadeDate < todayIso)
  const deliveredOpen =
    order.status === 'Teslim Edildi' || dto?.displayStatus === 'Teslim Edildi'
  const overdue = isCollectionOverdue(collectionRow, todayIso) || dto?.hasOverdueBalance === true

  return vadeApproaching || vadePast || (deliveredOpen && remaining > 0.009) || overdue
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {import('../contracts/v1/businessEngine.js').OrderBusinessSnapshot} snap
 * @param {string} todayIso
 */
export function computeCollectionSpecialistRisk(order, dto, snap, todayIso) {
  /** @type {string[]} */
  const reasons = []
  const beMax = Math.max(
    snap.riskScores.collection,
    snap.riskScores.shipment,
    snap.riskScores.supply,
    snap.riskScores.ssh,
    snap.riskScores.operations,
  )

  let bonus = 0
  const remaining = orderRemaining(order, dto)
  const deliveredOpen =
    (order.status === 'Teslim Edildi' || dto?.displayStatus === 'Teslim Edildi') &&
    remaining > 0.009
  const vadePast = Boolean(order.dueDate && order.dueDate < todayIso)
  const collectionRow = dto ? mapListItemToCollectionRowVM(dto) : toCollectionRowFromOrder(order)
  const overdueBalance = isCollectionOverdue(collectionRow, todayIso) || dto?.hasOverdueBalance
  const orderAgeDays = order.orderDate ? daysBetween(order.orderDate, todayIso) : 0

  if (deliveredOpen) {
    bonus += 40
    reasons.push('Teslim edilmiş · kalan ödeme')
  }
  if (vadePast || overdueBalance) {
    bonus += 50
    reasons.push('Vadesi geçmiş')
  }
  if (orderAgeDays >= MIN_ORDER_AGE_DAYS) {
    bonus += 30
    reasons.push('30 günden eski')
  }

  if (reasons.length === 0 && snap.riskScores.collection >= 50) {
    reasons.push('Business Engine tahsilat riski')
  }

  const score = Math.min(100, beMax + bonus)
  return {
    score,
    priority: priorityFromScore(score),
    reasons,
    remaining,
    deliveredOpen,
    vadePast,
    orderAgeDays,
    paymentCount: getPaymentTransactionsForSalesOrder(order.id).length,
  }
}

/**
 * @param {{ reasons: string[], deliveredOpen: boolean, vadePast: boolean }} risk
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
export function resolveCollectionTaskTitle(risk, order, dto, todayIso = DEMO_TODAY) {
  const collectionRow = dto ? mapListItemToCollectionRowVM(dto) : toCollectionRowFromOrder(order)
  const overdue = risk.vadePast || isCollectionOverdue(collectionRow, todayIso) || dto?.hasOverdueBalance

  if (overdue && risk.reasons.includes('Vadesi geçmiş')) return 'Vadesi geçmiş'
  if (overdue) return 'Tahsilat gecikti'
  if (risk.deliveredOpen) return 'Kalan ödeme alınmalı'

  const vadeSoon =
    order.dueDate &&
    order.dueDate >= todayIso &&
    daysBetween(todayIso, order.dueDate) <= APPROACHING_VADE_DAYS
  if (vadeSoon) return 'Müşteri aranmalı'

  return 'Kalan ödeme alınmalı'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {{ reasons: string[], remaining: number }} risk
 */
export function buildCollectionTaskDescription(order, dto, risk) {
  const total = dto ? moneyToNumber(dto.totalAmount) : order.totalAmount ?? order.amount ?? 0
  const paid = orderPaid(order, dto)
  const payments = getPaymentTransactionsForSalesOrder(order.id)
  const postedCount = payments.filter((p) => p.status === 'POSTED').length

  return [
    `Sipariş: ${order.id}`,
    `Müşteri: ${dto?.customerDisplayName ?? order.customer}`,
    `Telefon: ${order.phone ?? '—'}`,
    `Toplam: ${formatTry(total)}`,
    `Kapora: ${formatTry(paid)}`,
    `Kalan: ${formatTry(risk.remaining)}`,
    `Vade: ${order.dueDate ?? '—'}`,
    `Tahsilat geçmişi: ${postedCount} kayıt`,
    `Risk nedeni: ${risk.reasons.join(', ') || '—'}`,
  ].join(' · ')
}

/**
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} listItemDtos
 * @param {string} [todayIso]
 * @param {DomainEventDto[]} [_domainEvents]
 * @param {WorkerTask[]} [_existingTasks]
 */
export function evaluateCollectionSpecialist(
  orders,
  listItemDtos,
  todayIso = DEMO_TODAY,
  _domainEvents = [],
  _existingTasks = [],
) {
  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))
  const snapshots = BusinessEngine.computeOrderSnapshots(orders, listItemDtos, todayIso)
  const runtimeCtx = buildWorkerRuntimeCtx(orders, listItemDtos, todayIso)

  /** @type {CollectionSpecialistAssessment[]} */
  const assessments = []

  for (const order of orders) {
    const dto = dtoById.get(order.id)
    const eligible = isCollectionSpecialistEligible(order, dto, todayIso)
    const snap = snapshots.get(order.id)
    if (!snap) continue

    const risk = computeCollectionSpecialistRisk(order, dto, snap, todayIso)
    const score = applyPredictionScoreToWorkerAssessment(risk.score, order.id, 'collection', runtimeCtx)
    const taskTitle = resolveCollectionTaskTitle(risk, order, dto, todayIso)
    const taskDescription = buildCollectionTaskDescription(order, dto, risk)

    assessments.push({
      orderId: order.id,
      customerName: dto?.customerDisplayName ?? order.customer,
      phone: order.phone ?? '',
      priority: priorityFromScore(score),
      score,
      reasons: risk.reasons,
      taskTitle,
      taskDescription,
      eligible,
      businessSnapshot: snap,
    })

    if (eligible && score >= 35) {
      recordWorkerDecisionQuality(
        { orderId: order.id, score, taskTitle, occurredAt: `${todayIso}T09:00:00.000Z` },
        AI_COLLECTION_SPECIALIST_WORKER_ID,
        runtimeCtx,
      )
    }
  }

  return assessments
}

/**
 * @param {CollectionSpecialistAssessment} assessment
 * @param {string} nowIso
 */
export function buildWorkerTaskFromCollectionAssessment(assessment, nowIso) {
  return {
    id: `wt-coll-${assessment.orderId}-${Date.parse(nowIso)}`,
    workerId: AI_COLLECTION_SPECIALIST_WORKER_ID,
    title: assessment.taskTitle,
    description: assessment.taskDescription,
    priority: WORKER_PRIORITY.HIGH,
    status: DIGITAL_WORKER_STATUS.WAITING,
    sourceModule: COLLECTION_SPECIALIST_SOURCE_MODULE,
    targetModule: 'collection',
    relatedEntityId: assessment.orderId,
    relatedModule: COLLECTION_SPECIALIST_SOURCE_MODULE,
    createdAt: nowIso,
    startedAt: null,
    finishedAt: null,
    completedAt: null,
    result: null,
    createdBy: 'AI Collection Specialist',
  }
}

/**
 * @param {WorkerTask} task
 * @param {CollectionSpecialistAssessment} assessment
 */
export function recordCollectionSpecialistTaskAudit(task, assessment) {
  recordAuditEvent({
    id: `audit-${task.id}`,
    type: DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_CREATED,
    aggregateId: assessment.orderId,
    correlationId: task.id,
    occurredAt: task.createdAt,
    module: AUDIT_MODULE.COLLECTION,
    recordId: task.id,
    newValue: task.title,
    description: `AI Collection Specialist görevi: ${task.title}`,
    extraPayload: {
      workerId: AI_COLLECTION_SPECIALIST_WORKER_ID,
      priority: assessment.priority,
      score: assessment.score,
      reasons: assessment.reasons,
      sourceModule: COLLECTION_SPECIALIST_SOURCE_MODULE,
    },
  })

  appendDomainEvent({
    id: `evt-${task.id}`,
    type: DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_CREATED,
    aggregateType: 'SalesOrder',
    aggregateId: assessment.orderId,
    occurredAt: task.createdAt,
    correlationId: task.id,
    payloadSchemaVersion: '1',
    payload: {
      title: 'AI Collection Task Created',
      taskTitle: task.title,
      worker: 'AI Collection Specialist',
      description: task.description,
      priority: assessment.priority,
      audit: {
        module: AUDIT_MODULE.COLLECTION,
        recordId: task.id,
        description: `AI Collection Specialist: ${task.title}`,
      },
    },
  })
}

/**
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} listItemDtos
 * @param {string} [todayIso]
 * @param {string} [nowIso]
 * @param {DomainEventDto[]} [domainEvents]
 * @param {WorkerTask[]} [existingTasks]
 */
export function buildCollectionSpecialistTasks(
  orders,
  listItemDtos,
  todayIso = DEMO_TODAY,
  nowIso = `${todayIso}T09:00:00.000Z`,
  domainEvents = [],
  existingTasks = [],
) {
  const assessments = evaluateCollectionSpecialist(
    orders,
    listItemDtos,
    todayIso,
    domainEvents,
    existingTasks,
  )

  /** @type {{ task: WorkerTask, assessment: CollectionSpecialistAssessment }[]} */
  const created = []

  for (const assessment of assessments) {
    if (!assessment.eligible) continue
    if (assessment.priority !== 'HIGH' && assessment.priority !== 'CRITICAL') continue
    const task = buildWorkerTaskFromCollectionAssessment(assessment, nowIso)
    created.push({ task, assessment })
  }

  return created
}

/** @param {CollectionSpecialistAssessment[]} assessments */
export function listAiCollectionSpecialistOrderIds(assessments) {
  return new Set(
    assessments
      .filter(
        (a) =>
          a.eligible && (a.priority === 'HIGH' || a.priority === 'CRITICAL'),
      )
      .map((a) => a.orderId),
  )
}

export const AiCollectionSpecialistService = {
  isCollectionSpecialistEligible,
  evaluateCollectionSpecialist,
  computeCollectionSpecialistRisk,
  buildCollectionSpecialistTasks,
  buildWorkerTaskFromCollectionAssessment,
  recordCollectionSpecialistTaskAudit,
  resolveCollectionTaskTitle,
  listAiCollectionSpecialistOrderIds,
}

export default AiCollectionSpecialistService
