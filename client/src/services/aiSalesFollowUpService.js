import { DEMO_TODAY } from '../data/constants.js'
import { formatTry } from '../data/dashboardHelpers.js'
import { DOMAIN_EVENT_TYPE } from '../contracts/v1/domainEventTypes.js'
import { AUDIT_MODULE } from '../contracts/v1/auditModule.js'
import { DIGITAL_WORKER_STATUS, WORKER_PRIORITY } from '../contracts/v1/digitalWorker.js'
import {
  AI_SALES_FOLLOW_UP_WORKER_ID,
  SALES_FOLLOW_UP_SOURCE_MODULE,
} from '../contracts/v1/aiSalesFollowUp.js'
import { BusinessEngine } from '../engine/businessEngine.js'
import { recordAuditEvent } from '../lib/audit/recordAuditEvent.js'
import { appendDomainEvent } from '../services/mockDomainEventStore.js'
import { moneyToNumber } from '../mappers/moneyHelpers.js'
import { isTerminOverdue, remainingBalance } from '../utils/orderFinance.js'
import {
  applyPredictionScoreToWorkerAssessment,
  buildWorkerRuntimeCtx,
} from './prediction/predictionWorkerBlend.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../contracts/v1/workerTask.js').WorkerTask} WorkerTask */
/** @typedef {import('../contracts/v1/aiSalesFollowUp.js').SalesFollowUpAssessment} SalesFollowUpAssessment */
/** @typedef {import('../contracts/v1/aiSalesFollowUp.js').SalesFollowUpPriority} SalesFollowUpPriority */

const MIN_ORDER_AGE_DAYS = 7

const WAITING_STATUSES = new Set([
  'Bekleniyor',
  'Üretimde',
  'Geldi',
  'Eksik Var',
  'Hazır',
  'Sevke Hazır',
  'Kısmi Geldi',
  'Yeni',
  'Yolda',
  'Sevk Planlandı',
  'Yola Çıktı',
  'Teslim Onayı Bekliyor',
])

/** @param {string} fromIso @param {string} toIso */
function daysBetween(fromIso, toIso) {
  const a = new Date(`${fromIso}T12:00:00`).getTime()
  const b = new Date(`${toIso}T12:00:00`).getTime()
  return Math.floor((b - a) / 86_400_000)
}

/** @param {number} score */
function priorityFromScore(score) {
  if (score >= 80) return /** @type {SalesFollowUpPriority} */ ('CRITICAL')
  if (score >= 60) return 'HIGH'
  if (score >= 35) return 'NORMAL'
  return 'LOW'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
function hasDeposit(order, dto) {
  const paid = dto ? moneyToNumber(dto.amountPaid) : order.paidAmount ?? 0
  return paid > 0.009 || order.paid === true
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
export function isSalesFollowUpEligible(order, dto, todayIso = DEMO_TODAY) {
  if (order.status === 'İptal' || order.status === 'Teslim Edildi') return false
  if (dto?.displayStatus === 'Teslim Edildi') return false
  if (!hasDeposit(order, dto)) return false
  if (!order.orderDate || daysBetween(order.orderDate, todayIso) < MIN_ORDER_AGE_DAYS) return false
  if (!WAITING_STATUSES.has(order.status ?? '')) return false
  return true
}

/**
 * @param {string} orderId
 * @param {DomainEventDto[]} [domainEvents]
 * @param {WorkerTask[]} [existingTasks]
 */
export function countCustomerFollowUpCalls(orderId, domainEvents = [], existingTasks = []) {
  const callEvents = domainEvents.filter(
    (e) =>
      e.aggregateId === orderId &&
      (e.type === DOMAIN_EVENT_TYPE.AI_SALES_CALL_LOGGED ||
        e.type === 'sales.follow_up.call_logged'),
  ).length
  const completedTasks = existingTasks.filter(
    (t) =>
      t.workerId === AI_SALES_FOLLOW_UP_WORKER_ID &&
      t.relatedEntityId === orderId &&
      t.status === DIGITAL_WORKER_STATUS.COMPLETED,
  ).length
  return callEvents + completedTasks
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {import('../contracts/v1/businessEngine.js').OrderBusinessSnapshot} snap
 * @param {string} todayIso
 * @param {DomainEventDto[]} [domainEvents]
 * @param {WorkerTask[]} [existingTasks]
 */
export function computeSalesFollowUpRisk(order, dto, snap, todayIso, domainEvents = [], existingTasks = []) {
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
  const total = dto ? moneyToNumber(dto.totalAmount) : order.totalAmount ?? order.amount ?? 0
  const paid = dto ? moneyToNumber(dto.amountPaid) : order.paidAmount ?? 0
  const depositPct = total > 0 ? (paid / total) * 100 : 0

  const terminPassed = Boolean(order.dueDate && order.dueDate < todayIso)
  const deliveryDelayed =
    (order.shipmentDate && order.shipmentDate < todayIso && order.status !== 'Teslim Edildi') ||
    isTerminOverdue(order, todayIso)

  if (terminPassed) {
    bonus += 40
    reasons.push('Termin geçmiş')
  }
  if (deliveryDelayed) {
    bonus += 20
    reasons.push('Teslim gecikmesi')
  }
  if (depositPct > 0 && depositPct < 10) {
    bonus += 15
    reasons.push('Kapora %10 altı')
  }

  const callCount = countCustomerFollowUpCalls(order.id, domainEvents, existingTasks)
  if (callCount >= 2) {
    bonus += 10
    reasons.push('Müşteri 2 kez aranmış')
  }

  if (reasons.length === 0 && beMax >= 60) {
    reasons.push(snap.nextAction.replace(/\.$/, '') || 'Business Engine risk sinyali')
  }

  const score = Math.min(100, beMax + bonus)
  return {
    score,
    priority: priorityFromScore(score),
    reasons,
    callCount,
    depositPct,
    beMax,
  }
}

/**
 * @param {{ reasons: string[], depositPct: number }} risk
 * @param {Order} order
 * @param {string} todayIso
 */
export function resolveSalesFollowUpTaskTitle(risk, order, todayIso = DEMO_TODAY) {
  const terminPassed = Boolean(order.dueDate && order.dueDate < todayIso)
  const shipmentLate =
    Boolean(order.shipmentDate && order.shipmentDate < todayIso) && order.status !== 'Teslim Edildi'

  if (terminPassed || shipmentLate || risk.reasons.includes('Termin geçmiş') || risk.reasons.includes('Teslim gecikmesi')) {
    return 'Teslim tarihi gecikti'
  }
  if (order.dueDate === todayIso || order.dueDate === addOneDay(todayIso)) {
    return 'Termin teyidi alınmalı'
  }
  return 'Müşteri aranmalı'
}

/** @param {string} iso */
function addOneDay(iso) {
  const d = new Date(`${iso}T12:00:00`)
  d.setDate(d.getDate() + 1)
  return d.toISOString().slice(0, 10)
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {{ reasons: string[], depositPct: number }} risk
 */
export function buildSalesFollowUpTaskDescription(order, dto, risk) {
  const total = dto ? moneyToNumber(dto.totalAmount) : order.totalAmount ?? order.amount ?? 0
  const paid = dto ? moneyToNumber(dto.amountPaid) : order.paidAmount ?? 0
  const remaining = dto ? moneyToNumber(dto.remainingAmount ?? dto.amountDue) : remainingBalance(order)

  return [
    `Sipariş: ${order.id}`,
    `Müşteri: ${dto?.customerDisplayName ?? order.customer}`,
    `Telefon: ${order.phone ?? '—'}`,
    `Termin: ${order.dueDate ?? '—'}`,
    `Kapora: ${formatTry(paid)} (%${Math.round(risk.depositPct)})`,
    `Kalan ödeme: ${formatTry(remaining)}`,
    `Risk nedeni: ${risk.reasons.join(', ') || '—'}`,
  ].join(' · ')
}

/**
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} listItemDtos
 * @param {string} [todayIso]
 * @param {DomainEventDto[]} [domainEvents]
 * @param {WorkerTask[]} [existingTasks]
 */
export function evaluateSalesFollowUp(
  orders,
  listItemDtos,
  todayIso = DEMO_TODAY,
  domainEvents = [],
  existingTasks = [],
) {
  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))
  const snapshots = BusinessEngine.computeOrderSnapshots(orders, listItemDtos, todayIso)
  const runtimeCtx = buildWorkerRuntimeCtx(orders, listItemDtos, todayIso)

  /** @type {SalesFollowUpAssessment[]} */
  const assessments = []

  for (const order of orders) {
    const dto = dtoById.get(order.id)
    const eligible = isSalesFollowUpEligible(order, dto, todayIso)
    const snap = snapshots.get(order.id)
    if (!snap) continue

    const risk = computeSalesFollowUpRisk(
      order,
      dto,
      snap,
      todayIso,
      domainEvents,
      existingTasks,
    )
    const score = applyPredictionScoreToWorkerAssessment(risk.score, order.id, 'sales', runtimeCtx)

    const taskTitle = resolveSalesFollowUpTaskTitle(risk, order, todayIso)
    const taskDescription = buildSalesFollowUpTaskDescription(order, dto, risk)

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
  }

  return assessments
}

/**
 * @param {SalesFollowUpAssessment} assessment
 * @param {string} nowIso
 */
export function buildWorkerTaskFromAssessment(assessment, nowIso) {
  return {
    id: `wt-sales-${assessment.orderId}-${Date.parse(nowIso)}`,
    workerId: AI_SALES_FOLLOW_UP_WORKER_ID,
    title: assessment.taskTitle,
    description: assessment.taskDescription,
    priority: WORKER_PRIORITY.HIGH,
    status: DIGITAL_WORKER_STATUS.WAITING,
    sourceModule: SALES_FOLLOW_UP_SOURCE_MODULE,
    targetModule: assessment.businessSnapshot.kanbanColumnId,
    relatedEntityId: assessment.orderId,
    relatedModule: SALES_FOLLOW_UP_SOURCE_MODULE,
    createdAt: nowIso,
    startedAt: null,
    finishedAt: null,
    completedAt: null,
    result: null,
    createdBy: 'AI Sales Follow-Up',
  }
}

/**
 * @param {WorkerTask} task
 * @param {SalesFollowUpAssessment} assessment
 */
export function recordSalesFollowUpTaskAudit(task, assessment) {
  recordAuditEvent({
    id: `audit-${task.id}`,
    type: DOMAIN_EVENT_TYPE.AI_SALES_TASK_CREATED,
    aggregateId: assessment.orderId,
    correlationId: task.id,
    occurredAt: task.createdAt,
    module: AUDIT_MODULE.SALES,
    recordId: task.id,
    newValue: task.title,
    description: `AI Sales Follow-Up görevi: ${task.title}`,
    extraPayload: {
      workerId: AI_SALES_FOLLOW_UP_WORKER_ID,
      priority: assessment.priority,
      score: assessment.score,
      reasons: assessment.reasons,
      sourceModule: SALES_FOLLOW_UP_SOURCE_MODULE,
    },
  })

  appendDomainEvent({
    id: `evt-${task.id}`,
    type: DOMAIN_EVENT_TYPE.AI_SALES_TASK_CREATED,
    aggregateType: 'SalesOrder',
    aggregateId: assessment.orderId,
    occurredAt: task.createdAt,
    correlationId: task.id,
    payloadSchemaVersion: '1',
    payload: {
      title: 'AI Task Created',
      taskTitle: task.title,
      worker: 'AI Sales Follow-Up',
      description: task.description,
      priority: assessment.priority,
      audit: {
        module: AUDIT_MODULE.SALES,
        recordId: task.id,
        description: `AI Sales Follow-Up: ${task.title}`,
      },
    },
  })
}

/**
 * Yüksek/kritik riskli uygun siparişler için görev üretir.
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} listItemDtos
 * @param {string} [todayIso]
 * @param {string} [nowIso]
 * @param {DomainEventDto[]} [domainEvents]
 * @param {WorkerTask[]} [existingTasks]
 */
export function buildSalesFollowUpTasks(
  orders,
  listItemDtos,
  todayIso = DEMO_TODAY,
  nowIso = `${todayIso}T09:00:00.000Z`,
  domainEvents = [],
  existingTasks = [],
) {
  const assessments = evaluateSalesFollowUp(
    orders,
    listItemDtos,
    todayIso,
    domainEvents,
    existingTasks,
  )

  /** @type {{ task: WorkerTask, assessment: SalesFollowUpAssessment }[]} */
  const created = []

  for (const assessment of assessments) {
    if (!assessment.eligible) continue
    if (assessment.priority !== 'HIGH' && assessment.priority !== 'CRITICAL') continue

    const task = buildWorkerTaskFromAssessment(assessment, nowIso)
    created.push({ task, assessment })
  }

  return created
}

/** @param {SalesFollowUpAssessment[]} assessments */
export function listAiSalesFollowUpOrderIds(assessments) {
  return new Set(
    assessments
      .filter(
        (a) =>
          a.eligible && (a.priority === 'HIGH' || a.priority === 'CRITICAL'),
      )
      .map((a) => a.orderId),
  )
}

export const AiSalesFollowUpService = {
  isSalesFollowUpEligible,
  evaluateSalesFollowUp,
  computeSalesFollowUpRisk,
  buildSalesFollowUpTasks,
  buildWorkerTaskFromAssessment,
  recordSalesFollowUpTaskAudit,
  resolveSalesFollowUpTaskTitle,
  listAiSalesFollowUpOrderIds,
}

export default AiSalesFollowUpService
