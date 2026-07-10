import { DEMO_TODAY } from '../data/constants.js'
import { DOMAIN_EVENT_TYPE } from '../contracts/v1/domainEventTypes.js'
import { AUDIT_MODULE } from '../contracts/v1/auditModule.js'
import { DIGITAL_WORKER_STATUS, WORKER_PRIORITY } from '../contracts/v1/digitalWorker.js'
import {
  AI_SHIPMENT_SPECIALIST_WORKER_ID,
  SHIPMENT_SPECIALIST_SOURCE_MODULE,
} from '../contracts/v1/aiShipmentSpecialist.js'
import { BusinessEngine } from '../engine/businessEngine.js'
import { recordAuditEvent } from '../lib/audit/recordAuditEvent.js'
import { appendDomainEvent } from '../services/mockDomainEventStore.js'
import { getShipmentsForSalesOrder } from '../services/mockShipmentStore.js'
import { summarizeLineSupply, resolveSupplyStatusLabel } from '../mappers/operation-map/operationMapModel.js'
import { formatShortDate } from '../utils/dates.js'
import { isTerminOverdue } from '../utils/orderFinance.js'
import { moneyToNumber } from '../mappers/moneyHelpers.js'
import {
  applyPredictionScoreToWorkerAssessment,
  buildWorkerRuntimeCtx,
} from './prediction/predictionWorkerBlend.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../contracts/v1/workerTask.js').WorkerTask} WorkerTask */
/** @typedef {import('../contracts/v1/aiShipmentSpecialist.js').ShipmentSpecialistAssessment} ShipmentSpecialistAssessment */
/** @typedef {import('../contracts/v1/aiShipmentSpecialist.js').ShipmentSpecialistPriority} ShipmentSpecialistPriority */

/** @param {number} score */
function priorityFromScore(score) {
  if (score >= 80) return /** @type {ShipmentSpecialistPriority} */ ('CRITICAL')
  if (score >= 60) return 'HIGH'
  if (score >= 35) return 'NORMAL'
  return 'LOW'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
export function analyzeShipmentContext(order, dto, todayIso = DEMO_TODAY) {
  const summary = summarizeLineSupply(order.id)
  const shipments = getShipmentsForSalesOrder(order.id)
  const hasShipmentPlan =
    shipments.length > 0 ||
    (dto?.shipmentSummaryOpenCount ?? 0) > 0 ||
    (dto?.inTransitShipmentCount ?? 0) > 0
  const terminPast =
    isTerminOverdue(order, todayIso) ||
    Boolean(order.dueDate && order.dueDate < todayIso && order.status !== 'Teslim Edildi')
  const warehouseIncomplete = Boolean(
    summary &&
      (summary.anyWaiting || summary.anyPartial || (summary.allSent && !summary.allArrived)),
  )
  const sshOpen = (dto?.openMissingItemsCount ?? 0) > 0
  const installationPending = Boolean(dto?.installationPending)
  const productsReady =
    order.status === 'Hazır' ||
    order.status === 'Sevke Hazır' ||
    order.status === 'Geldi' ||
    summary?.allArrived === true

  return {
    summary,
    shipments,
    hasShipmentPlan,
    terminPast,
    warehouseIncomplete,
    sshOpen,
    installationPending,
    productsReady,
    supplyStatusLabel: resolveSupplyStatusLabel(order, dto),
  }
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
export function isShipmentSpecialistEligible(order, dto, todayIso = DEMO_TODAY) {
  if (order.status === 'İptal' || order.status === 'Teslim Edildi') return false
  if (dto?.displayStatus === 'Teslim Edildi') return false

  const paid = dto ? moneyToNumber(dto.amountPaid) : order.paidAmount ?? 0
  if (paid <= 0.009 && !order.paid) return false

  const ctx = analyzeShipmentContext(order, dto, todayIso)
  return (
    ctx.terminPast ||
    !ctx.hasShipmentPlan ||
    ctx.warehouseIncomplete ||
    ctx.sshOpen ||
    ctx.installationPending ||
    ctx.productsReady ||
    order.status === 'Eksik Var' ||
    order.status === 'Yolda'
  )
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {import('../contracts/v1/businessEngine.js').OrderBusinessSnapshot} snap
 * @param {string} todayIso
 */
export function computeShipmentSpecialistRisk(order, dto, snap, todayIso) {
  /** @type {string[]} */
  const reasons = []
  const beMax = Math.max(
    snap.riskScores.collection,
    snap.riskScores.shipment,
    snap.riskScores.supply,
    snap.riskScores.ssh,
    snap.riskScores.operations,
  )

  const ctx = analyzeShipmentContext(order, dto, todayIso)
  let bonus = 0

  if (ctx.terminPast) {
    bonus += 50
    reasons.push('Teslim tarihi geçmiş')
  }
  if (!ctx.hasShipmentPlan && (ctx.productsReady || ctx.warehouseIncomplete || ctx.terminPast)) {
    bonus += 40
    reasons.push('Sevk planı yok')
  }
  if (ctx.warehouseIncomplete) {
    bonus += 30
    reasons.push('Ürün depoya tam girmemiş')
  }
  if (ctx.sshOpen) {
    bonus += 20
    reasons.push('SSH açık')
  }

  if (reasons.length === 0 && snap.riskScores.shipment >= 50) {
    reasons.push('Business Engine sevk riski')
  }

  const score = Math.min(100, beMax + bonus)
  return {
    score,
    priority: priorityFromScore(score),
    reasons,
    ...ctx,
  }
}

/**
 * @param {ReturnType<typeof computeShipmentSpecialistRisk>} risk
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function resolveShipmentTaskTitle(risk, order, dto) {
  if (risk.sshOpen) return 'SSH çözülmeli'
  if (risk.terminPast) return 'Teslim tarihi gecikti'
  if (!risk.hasShipmentPlan) return 'Sevk planlanmalı'
  if (risk.warehouseIncomplete) return 'Ürün eksik'
  if (risk.installationPending) return 'Montaj organize edilmeli'
  if (order.status === 'Yolda' || (dto?.inTransitShipmentCount ?? 0) > 0) {
    return 'Müşteri bilgilendirilmeli'
  }
  return 'Sevk planlanmalı'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {ReturnType<typeof computeShipmentSpecialistRisk>} risk
 */
export function buildShipmentTaskDescription(order, dto, risk) {
  const sshLabel = risk.sshOpen
    ? `${dto?.openMissingItemsCount ?? 0} açık kayıt`
    : 'Yok'
  const plannedShip =
    order.shipmentDate != null
      ? formatShortDate(order.shipmentDate)
      : risk.shipments[0]?.plannedShipDate
        ? formatShortDate(risk.shipments[0].plannedShipDate)
        : '—'

  return [
    `Sipariş: ${order.id}`,
    `Müşteri: ${dto?.customerDisplayName ?? order.customer}`,
    `Telefon: ${order.phone ?? '—'}`,
    `Teslim tarihi: ${order.dueDate ?? '—'}`,
    `Planlanan sevk: ${plannedShip}`,
    `Depo durumu: ${risk.supplyStatusLabel}`,
    `SSH durumu: ${sshLabel}`,
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
export function evaluateShipmentSpecialist(
  orders,
  listItemDtos,
  todayIso = DEMO_TODAY,
  _domainEvents = [],
  _existingTasks = [],
) {
  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))
  const snapshots = BusinessEngine.computeOrderSnapshots(orders, listItemDtos, todayIso)
  const runtimeCtx = buildWorkerRuntimeCtx(orders, listItemDtos, todayIso)

  /** @type {ShipmentSpecialistAssessment[]} */
  const assessments = []

  for (const order of orders) {
    const dto = dtoById.get(order.id)
    const eligible = isShipmentSpecialistEligible(order, dto, todayIso)
    const snap = snapshots.get(order.id)
    if (!snap) continue

    const risk = computeShipmentSpecialistRisk(order, dto, snap, todayIso)
    const score = applyPredictionScoreToWorkerAssessment(risk.score, order.id, 'shipment', runtimeCtx)
    const taskTitle = resolveShipmentTaskTitle(risk, order, dto)
    const taskDescription = buildShipmentTaskDescription(order, dto, risk)

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
 * @param {ShipmentSpecialistAssessment} assessment
 * @param {string} nowIso
 */
export function buildWorkerTaskFromShipmentAssessment(assessment, nowIso) {
  return {
    id: `wt-ship-${assessment.orderId}-${Date.parse(nowIso)}`,
    workerId: AI_SHIPMENT_SPECIALIST_WORKER_ID,
    title: assessment.taskTitle,
    description: assessment.taskDescription,
    priority: WORKER_PRIORITY.HIGH,
    status: DIGITAL_WORKER_STATUS.WAITING,
    sourceModule: SHIPMENT_SPECIALIST_SOURCE_MODULE,
    targetModule: assessment.businessSnapshot.kanbanColumnId,
    relatedEntityId: assessment.orderId,
    relatedModule: SHIPMENT_SPECIALIST_SOURCE_MODULE,
    createdAt: nowIso,
    startedAt: null,
    finishedAt: null,
    completedAt: null,
    result: null,
    createdBy: 'AI Shipment Specialist',
  }
}

/**
 * @param {WorkerTask} task
 * @param {ShipmentSpecialistAssessment} assessment
 */
export function recordShipmentSpecialistTaskAudit(task, assessment) {
  recordAuditEvent({
    id: `audit-${task.id}`,
    type: DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_CREATED,
    aggregateId: assessment.orderId,
    correlationId: task.id,
    occurredAt: task.createdAt,
    module: AUDIT_MODULE.SHIPMENT,
    recordId: task.id,
    newValue: task.title,
    description: `AI Shipment Specialist görevi: ${task.title}`,
    extraPayload: {
      workerId: AI_SHIPMENT_SPECIALIST_WORKER_ID,
      priority: assessment.priority,
      score: assessment.score,
      reasons: assessment.reasons,
      sourceModule: SHIPMENT_SPECIALIST_SOURCE_MODULE,
    },
  })

  appendDomainEvent({
    id: `evt-${task.id}`,
    type: DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_CREATED,
    aggregateType: 'SalesOrder',
    aggregateId: assessment.orderId,
    occurredAt: task.createdAt,
    correlationId: task.id,
    payloadSchemaVersion: '1',
    payload: {
      title: 'AI Shipment Task Created',
      taskTitle: task.title,
      worker: 'AI Shipment Specialist',
      description: task.description,
      priority: assessment.priority,
      audit: {
        module: AUDIT_MODULE.SHIPMENT,
        recordId: task.id,
        description: `AI Shipment Specialist: ${task.title}`,
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
export function buildShipmentSpecialistTasks(
  orders,
  listItemDtos,
  todayIso = DEMO_TODAY,
  nowIso = `${todayIso}T09:00:00.000Z`,
  domainEvents = [],
  existingTasks = [],
) {
  const assessments = evaluateShipmentSpecialist(
    orders,
    listItemDtos,
    todayIso,
    domainEvents,
    existingTasks,
  )

  /** @type {{ task: WorkerTask, assessment: ShipmentSpecialistAssessment }[]} */
  const created = []

  for (const assessment of assessments) {
    if (!assessment.eligible) continue
    if (assessment.priority !== 'HIGH' && assessment.priority !== 'CRITICAL') continue
    const task = buildWorkerTaskFromShipmentAssessment(assessment, nowIso)
    created.push({ task, assessment })
  }

  return created
}

/** @param {ShipmentSpecialistAssessment[]} assessments */
export function listAiShipmentSpecialistOrderIds(assessments) {
  return new Set(
    assessments
      .filter(
        (a) =>
          a.eligible && (a.priority === 'HIGH' || a.priority === 'CRITICAL'),
      )
      .map((a) => a.orderId),
  )
}

export const AiShipmentSpecialistService = {
  isShipmentSpecialistEligible,
  evaluateShipmentSpecialist,
  computeShipmentSpecialistRisk,
  buildShipmentSpecialistTasks,
  buildWorkerTaskFromShipmentAssessment,
  recordShipmentSpecialistTaskAudit,
  resolveShipmentTaskTitle,
  listAiShipmentSpecialistOrderIds,
  analyzeShipmentContext,
}

export default AiShipmentSpecialistService
