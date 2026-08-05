import { DEMO_TODAY } from '../data/constants.js'
import { SUPPLY_STATUS, WAREHOUSE_ENTRY_STATUS } from '../constants/supplyOrderStatus.js'
import { DOMAIN_EVENT_TYPE } from '../contracts/v1/domainEventTypes.js'
import { AUDIT_MODULE } from '../contracts/v1/auditModule.js'
import { DIGITAL_WORKER_STATUS, WORKER_PRIORITY } from '../contracts/v1/digitalWorker.js'
import {
  AI_PROCUREMENT_SPECIALIST_WORKER_ID,
  PROCUREMENT_SPECIALIST_SOURCE_MODULE,
} from '../contracts/v1/aiProcurementSpecialist.js'
import { BusinessEngine } from '../engine/businessEngine.js'
import { recordAuditEvent } from '../lib/audit/recordAuditEvent.js'
import { appendDomainEvent } from '../services/mockDomainEventStore.js'
import { getOrderLinesForSalesOrder } from '../services/mockOrderLineStore.js'
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
/** @typedef {import('../contracts/v1/aiProcurementSpecialist.js').ProcurementSpecialistAssessment} ProcurementSpecialistAssessment */
/** @typedef {import('../contracts/v1/aiProcurementSpecialist.js').ProcurementSpecialistPriority} ProcurementSpecialistPriority */

/** @param {number} score */
function priorityFromScore(score) {
  if (score >= 80) return /** @type {ProcurementSpecialistPriority} */ ('CRITICAL')
  if (score >= 60) return 'HIGH'
  if (score >= 35) return 'NORMAL'
  return 'LOW'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
export function analyzeProcurementContext(order, dto, todayIso = DEMO_TODAY) {
  const lines = getOrderLinesForSalesOrder(order.id)
  const summary = summarizeLineSupply(order.id)
  const terminPast =
    isTerminOverdue(order, todayIso) ||
    Boolean(order.dueDate && order.dueDate < todayIso && order.status !== 'Teslim Edildi')
  const partialDelivery = Boolean(
    summary?.anyPartial ||
      lines.some((l) => {
        const ordered = Number.parseFloat(String(l.qtyOrdered ?? '0')) || 0
        const received = Number.parseFloat(String(l.qtyReceived ?? '0')) || 0
        return (
          received > 0.009 &&
          received < ordered - 0.009 &&
          l.warehouseEntryStatus !== WAREHOUSE_ENTRY_STATUS.ARRIVED
        )
      }),
  )
  const neverShipped = lines.some(
    (l) => (l.supplyStatus ?? SUPPLY_STATUS.NOT_SENT) === SUPPLY_STATUS.NOT_SENT,
  )
  const missingProduct =
    order.status === 'Eksik Var' ||
    order.status === 'Kısmi Geldi' ||
    Boolean(summary && summary.allSent && !summary.allArrived && summary.anyWaiting)
  const sshOpen = (dto?.openMissingItemsCount ?? 0) > 0
  const pendingLines = lines.filter((l) => {
    const ordered = Number.parseFloat(String(l.qtyOrdered ?? '0')) || 0
    const received = Number.parseFloat(String(l.qtyReceived ?? '0')) || 0
    return ordered - received > 0.009
  })
  const pendingProductLabel =
    pendingLines.length === 0
      ? order.product ?? '—'
      : pendingLines
          .map((l) => l.title ?? l.productTitleSnapshot ?? 'Ürün')
          .slice(0, 2)
          .join(', ')
  const supplierName =
    lines.find((l) => l.supplierNameSnapshot)?.supplierNameSnapshot ??
    lines.find((l) => l.supplierId)?.supplierId ??
    '—'

  return {
    lines,
    summary,
    terminPast,
    partialDelivery,
    neverShipped,
    missingProduct,
    sshOpen,
    pendingProductLabel,
    supplierName,
    supplyStatusLabel: resolveSupplyStatusLabel(order, dto),
  }
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 */
export function isProcurementSpecialistEligible(order, dto, todayIso = DEMO_TODAY) {
  if (order.status === 'İptal' || order.status === 'Teslim Edildi') return false
  if (dto?.displayStatus === 'Teslim Edildi') return false

  const paid = dto ? moneyToNumber(dto.amountPaid) : order.paidAmount ?? 0
  if (paid <= 0.009 && !order.paid) return false

  const ctx = analyzeProcurementContext(order, dto, todayIso)
  return (
    ctx.terminPast ||
    ctx.partialDelivery ||
    ctx.neverShipped ||
    ctx.missingProduct ||
    ctx.sshOpen ||
    order.status === 'Üretimde' ||
    order.status === 'Bekleniyor' ||
    order.status === 'Eksik Var'
  )
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {import('../contracts/v1/businessEngine.js').OrderBusinessSnapshot} snap
 * @param {string} todayIso
 */
export function computeProcurementSpecialistRisk(order, dto, snap, todayIso) {
  /** @type {string[]} */
  const reasons = []
  const beMax = Math.max(
    snap.riskScores.collection,
    snap.riskScores.shipment,
    snap.riskScores.supply,
    snap.riskScores.ssh,
    snap.riskScores.operations,
  )

  const ctx = analyzeProcurementContext(order, dto, todayIso)
  let bonus = 0

  if (ctx.terminPast) {
    bonus += 50
    reasons.push('Termin geçti')
  }
  if (ctx.partialDelivery) {
    bonus += 35
    reasons.push('Kısmi teslim')
  }
  if (ctx.neverShipped) {
    bonus += 40
    reasons.push('Hiç sevk yapılmadı')
  }
  if (ctx.missingProduct) {
    bonus += 30
    reasons.push('Eksik ürün')
  }
  if (ctx.sshOpen) {
    bonus += 20
    reasons.push('SSH açık')
  }

  if (reasons.length === 0 && snap.riskScores.supply >= 50) {
    reasons.push('Business Engine tedarik riski')
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
 * @param {ReturnType<typeof computeProcurementSpecialistRisk>} risk
 */
export function resolveProcurementTaskTitle(risk) {
  if (risk.sshOpen) return 'SSH çözülmeli'
  if (risk.terminPast && risk.neverShipped) return 'Tedarikçi aranmalı'
  if (risk.terminPast) return 'Termin güncellenmeli'
  if (risk.missingProduct) return 'Eksik ürün tamamlanmalı'
  if (risk.partialDelivery) return 'Yeni sevk tarihi alınmalı'
  if (risk.neverShipped) return 'Tedarikçi aranmalı'
  return 'Alternatif tedarikçi araştırılmalı'
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {ReturnType<typeof computeProcurementSpecialistRisk>} risk
 */
export function buildProcurementTaskDescription(order, dto, risk) {
  const sshLabel = risk.sshOpen
    ? `${dto?.openMissingItemsCount ?? 0} açık kayıt`
    : 'Yok'

  return [
    `Sipariş: ${order.id}`,
    `Tedarikçi: ${risk.supplierName}`,
    `Telefon: ${order.phone ?? '—'}`,
    `Bekleyen ürün: ${risk.pendingProductLabel}`,
    `Termin: ${order.dueDate ? formatShortDate(order.dueDate) : '—'}`,
    `Depo durumu: ${risk.supplyStatusLabel}`,
    `SSH: ${sshLabel}`,
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
export function evaluateProcurementSpecialist(
  orders,
  listItemDtos,
  todayIso = DEMO_TODAY,
  _domainEvents = [],
  _existingTasks = [],
) {
  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))
  const snapshots = BusinessEngine.computeOrderSnapshots(orders, listItemDtos, todayIso)
  const runtimeCtx = buildWorkerRuntimeCtx(orders, listItemDtos, todayIso)

  /** @type {ProcurementSpecialistAssessment[]} */
  const assessments = []

  for (const order of orders) {
    const dto = dtoById.get(order.id)
    const eligible = isProcurementSpecialistEligible(order, dto, todayIso)
    const snap = snapshots.get(order.id)
    if (!snap) continue

    const risk = computeProcurementSpecialistRisk(order, dto, snap, todayIso)
    const score = applyPredictionScoreToWorkerAssessment(risk.score, order.id, 'procurement', runtimeCtx)
    const taskTitle = resolveProcurementTaskTitle(risk)
    const taskDescription = buildProcurementTaskDescription(order, dto, risk)

    assessments.push({
      orderId: order.id,
      customerName: dto?.customerDisplayName ?? order.customer,
      supplierName: risk.supplierName,
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
 * @param {ProcurementSpecialistAssessment} assessment
 * @param {string} nowIso
 */
export function buildWorkerTaskFromProcurementAssessment(assessment, nowIso) {
  return {
    id: `wt-proc-${assessment.orderId}-${Date.parse(nowIso)}`,
    workerId: AI_PROCUREMENT_SPECIALIST_WORKER_ID,
    title: assessment.taskTitle,
    description: assessment.taskDescription,
    priority: WORKER_PRIORITY.HIGH,
    status: DIGITAL_WORKER_STATUS.WAITING,
    sourceModule: PROCUREMENT_SPECIALIST_SOURCE_MODULE,
    targetModule: assessment.businessSnapshot.kanbanColumnId,
    relatedEntityId: assessment.orderId,
    relatedModule: PROCUREMENT_SPECIALIST_SOURCE_MODULE,
    createdAt: nowIso,
    startedAt: null,
    finishedAt: null,
    completedAt: null,
    result: null,
    createdBy: 'AI Procurement Specialist',
  }
}

/**
 * @param {WorkerTask} task
 * @param {ProcurementSpecialistAssessment} assessment
 */
export function recordProcurementSpecialistTaskAudit(task, assessment) {
  recordAuditEvent({
    id: `audit-${task.id}`,
    type: DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_CREATED,
    aggregateId: assessment.orderId,
    correlationId: task.id,
    occurredAt: task.createdAt,
    module: AUDIT_MODULE.SUPPLY,
    recordId: task.id,
    newValue: task.title,
    description: `AI Procurement Specialist görevi: ${task.title}`,
    extraPayload: {
      workerId: AI_PROCUREMENT_SPECIALIST_WORKER_ID,
      priority: assessment.priority,
      score: assessment.score,
      reasons: assessment.reasons,
      sourceModule: PROCUREMENT_SPECIALIST_SOURCE_MODULE,
    },
  })

  appendDomainEvent({
    id: `evt-${task.id}`,
    type: DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_CREATED,
    aggregateType: 'SalesOrder',
    aggregateId: assessment.orderId,
    occurredAt: task.createdAt,
    correlationId: task.id,
    payloadSchemaVersion: '1',
    payload: {
      title: 'AI Procurement Task Created',
      taskTitle: task.title,
      worker: 'AI Procurement Specialist',
      description: task.description,
      priority: assessment.priority,
      audit: {
        module: AUDIT_MODULE.SUPPLY,
        recordId: task.id,
        description: `AI Procurement Specialist: ${task.title}`,
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
export function buildProcurementSpecialistTasks(
  orders,
  listItemDtos,
  todayIso = DEMO_TODAY,
  nowIso = `${todayIso}T09:00:00.000Z`,
  domainEvents = [],
  existingTasks = [],
) {
  const assessments = evaluateProcurementSpecialist(
    orders,
    listItemDtos,
    todayIso,
    domainEvents,
    existingTasks,
  )

  /** @type {{ task: WorkerTask, assessment: ProcurementSpecialistAssessment }[]} */
  const created = []

  for (const assessment of assessments) {
    if (!assessment.eligible) continue
    if (assessment.priority !== 'HIGH' && assessment.priority !== 'CRITICAL') continue
    const task = buildWorkerTaskFromProcurementAssessment(assessment, nowIso)
    created.push({ task, assessment })
  }

  return created
}

/** @param {ProcurementSpecialistAssessment[]} assessments */
export function listAiProcurementSpecialistOrderIds(assessments) {
  return new Set(
    assessments
      .filter(
        (a) =>
          a.eligible && (a.priority === 'HIGH' || a.priority === 'CRITICAL'),
      )
      .map((a) => a.orderId),
  )
}

export const AiProcurementSpecialistService = {
  isProcurementSpecialistEligible,
  evaluateProcurementSpecialist,
  computeProcurementSpecialistRisk,
  buildProcurementSpecialistTasks,
  buildWorkerTaskFromProcurementAssessment,
  recordProcurementSpecialistTaskAudit,
  resolveProcurementTaskTitle,
  listAiProcurementSpecialistOrderIds,
  analyzeProcurementContext,
}

export default AiProcurementSpecialistService
