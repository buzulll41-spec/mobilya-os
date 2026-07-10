import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { RISK_SEVERITY } from '../../contracts/v1/enums.js'
import { TASK_PRIORITY, TASK_STATUS } from '../../contracts/v1/taskEnums.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { moneyToNumber } from '../moneyHelpers.js'

/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../../contracts/v1/task.js').TaskDto} TaskDto */

/** @typedef {'info' | 'warning' | 'critical'} TaskSeverity */

export const TASK_SOURCE_TYPE = /** @type {const} */ ({
  PAYMENT: 'payment',
  SHIPMENT: 'shipment',
  RISK: 'risk',
  MISSING: 'missing',
  TERMIN: 'termin',
  CONTRACT: 'contract',
  PRODUCTION: 'production',
  MAIL_ORDER: 'mail_order',
})

/**
 * @param {string} todayIso YYYY-MM-DD
 * @param {string} targetIso YYYY-MM-DD
 */
function daysUntil(todayIso, targetIso) {
  const a = Date.parse(`${todayIso}T12:00:00.000Z`)
  const b = Date.parse(`${targetIso}T12:00:00.000Z`)
  return Math.round((b - a) / 86_400_000)
}

/**
 * @param {TaskSeverity} severity
 * @returns {import('../../contracts/v1/taskEnums.js').TaskPriority}
 */
function priorityFromSeverity(severity) {
  if (severity === 'critical') return TASK_PRIORITY.CRITICAL
  if (severity === 'warning') return TASK_PRIORITY.HIGH
  return TASK_PRIORITY.MEDIUM
}

/**
 * @param {DomainEventDto[]} events
 * @param {string} orderId
 */
function orderHasContractPrinted(events, orderId) {
  return events.some(
    (e) =>
      e.aggregateId === orderId &&
      (e.type === DOMAIN_EVENT_TYPE.SALES_CONTRACT_PRINTED ||
        e.type === 'sales.contract_printed'),
  )
}

/**
 * @param {DomainEventDto[]} events
 * @param {string} orderId
 */
function orderHasMailOrderPayment(events, orderId) {
  return events.some(
    (e) =>
      e.aggregateId === orderId &&
      e.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED &&
      String(e.payload?.method ?? '').toUpperCase() === 'MAIL_ORDER',
  )
}

/**
 * @param {SalesOrderListItemDto} dto
 * @param {DomainEventDto[]} events
 * @param {string} todayIso
 * @param {string} stableAnchor
 * @returns {TaskDto[]}
 */
function tasksForOrder(dto, events, todayIso, stableAnchor) {
  /** @type {TaskDto[]} */
  const out = []
  const orderId = dto.id
  const customerName = dto.customerDisplayName ?? orderId
  const total = moneyToNumber(dto.totalAmount)
  const remaining = moneyToNumber(dto.remainingAmount ?? dto.amountDue)
  const paid = moneyToNumber(dto.amountPaid)
  const placedDay = dto.placedAt?.slice(0, 10) ?? todayIso

  const push = (
    /** @type {string} */ dedupeKey,
    /** @type {TaskSeverity} */ severity,
    /** @type {string} */ title,
    /** @type {string} */ subtitle,
    /** @type {string} */ sourceType,
    /** @type {string} */ suggestedAction,
    /** @type {string} */ relatedEventType,
  ) => {
    out.push({
      id: `TASK-${orderId}-${dedupeKey}`,
      salesOrderId: orderId,
      title,
      description: subtitle,
      status: TASK_STATUS.OPEN,
      priority: priorityFromSeverity(severity),
      dedupeKey: `proj-${dedupeKey}-${orderId}`,
      source: 'auto',
      relatedDomainEventId: null,
      relatedEventType,
      timelineHint: subtitle,
      createdAt: stableAnchor,
      updatedAt: stableAnchor,
      severity,
      subtitle,
      customerName,
      sourceType,
      suggestedAction,
    })
  }

  if (remaining > 0.009 && dto.displayStatus !== 'Teslim Edildi') {
    push(
      'collect-pending',
      remaining / Math.max(total, 1) > 0.5 ? 'warning' : 'info',
      'Tahsilat bekleniyor',
      `Kalan ${formatTry(remaining)}`,
      TASK_SOURCE_TYPE.PAYMENT,
      'Ödeme kaydet',
      'payment.summary',
    )
  }

  if (
    remaining > 50_000 ||
    (total > 0.009 && remaining / total > 0.6 && dto.displayStatus !== 'Teslim Edildi')
  ) {
    push(
      'balance-high',
      'critical',
      'Kalan bakiye yüksek',
      `${formatTry(remaining)} · sipariş ${formatTry(total)}`,
      TASK_SOURCE_TYPE.PAYMENT,
      'Tahsilat planı oluştur',
      'payment.summary',
    )
  }

  if ((dto.openMissingItemsCount ?? 0) > 0) {
    push(
      'ssh-open',
      'critical',
      'Açık SSH var',
      `${dto.openMissingItemsCount} eksik parça kaydı`,
      TASK_SOURCE_TYPE.MISSING,
      'SSH takibini aç',
      DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED,
    )
  }

  const termin = dto.latestCommittedShipBy ?? dto.earliestCommittedShipBy
  if (
    termin &&
    dto.displayStatus !== 'Teslim Edildi' &&
    termin >= todayIso &&
    daysUntil(todayIso, termin) <= 7
  ) {
    const days = daysUntil(todayIso, termin)
    push(
      'termin-soon',
      days <= 2 ? 'warning' : 'info',
      'Termin tarihi yaklaşıyor',
      `${termin} · ${days} gün kaldı`,
      TASK_SOURCE_TYPE.TERMIN,
      'Termin / sevk planını kontrol et',
      DOMAIN_EVENT_TYPE.ORDER_LINE_COMMITTED_SHIP_BY_CHANGED,
    )
  }

  if (dto.hasOverdueBalance && remaining > 0.009) {
    push(
      'balance-overdue',
      'critical',
      'Vadesi geçmiş bakiye',
      `Gecikmiş tahsilat ${formatTry(remaining)}`,
      TASK_SOURCE_TYPE.PAYMENT,
      'Müşteriyi ara',
      'payment.summary',
    )
  }

  const receivedReady =
    dto.displayStatus === 'Geldi' ||
    dto.displayStatus === 'Kısmi Geldi' ||
    dto.displayStatus === 'Hazır' ||
    dto.displayStatus === 'Sevke Hazır' ||
    dto.displayStatus === 'Sevke Hazır' ||
    dto.operationalState?.productionState === 'READY'
  const noShipmentPlan =
    (dto.shipmentSummaryOpenCount ?? 0) === 0 && (dto.inTransitShipmentCount ?? 0) === 0
  if (receivedReady && noShipmentPlan && dto.displayStatus !== 'Teslim Edildi') {
    push(
      'ship-not-planned',
      'warning',
      'Ürün geldi, sevk planlanmadı',
      dto.lineSummaryTitle ?? 'Sipariş satırları hazır',
      TASK_SOURCE_TYPE.SHIPMENT,
      'Sevk planla',
      DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED,
    )
  }

  if (
    dto.displayStatus === 'Hazır' ||
    dto.displayStatus === 'Sevke Hazır' ||
    (dto.operationalState?.productionState === 'READY' && noShipmentPlan)
  ) {
    push(
      'ship-ready',
      'info',
      'Sevk hazır',
      'Ürünler sevke uygun — plan oluşturulabilir',
      TASK_SOURCE_TYPE.SHIPMENT,
      'Sevk operasyonunu aç',
      'shipment.readiness',
    )
  }

  if (dto.displayStatus === 'Teslim Edildi' && remaining > 0.009) {
    push(
      'delivered-unpaid',
      'critical',
      'Teslim edildi, bakiye açık',
      `Kalan ${formatTry(remaining)}`,
      TASK_SOURCE_TYPE.PAYMENT,
      'Kapanış ödemesi al',
      'payment.summary',
    )
  }

  if (orderHasMailOrderPayment(events, orderId)) {
    push(
      'mail-order-review',
      'warning',
      'Mail order kontrol edilmeli',
      'Tedarikçi cari ve komisyon doğrulanmalı',
      TASK_SOURCE_TYPE.MAIL_ORDER,
      'Tedarikçi carisini aç',
      DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
    )
  }

  const activeStatuses = new Set(['Bekleniyor', 'Üretimde', 'Geldi'])
  if (
    activeStatuses.has(dto.displayStatus) &&
    !orderHasContractPrinted(events, orderId) &&
    placedDay >= todayIso.slice(0, 8)
  ) {
    push(
      'contract-not-printed',
      'info',
      'Sözleşme yazdırılmadı',
      'Müşteri imzalı sözleşme çıktısı alınmalı',
      TASK_SOURCE_TYPE.CONTRACT,
      'Sözleşmeyi yazdır',
      DOMAIN_EVENT_TYPE.SALES_CONTRACT_PRINTED,
    )
  }

  if (
    dto.currentRiskSeverity === RISK_SEVERITY.CRITICAL ||
    dto.currentRiskSeverity === RISK_SEVERITY.HIGH
  ) {
    push(
      'risk-elevated',
      dto.currentRiskSeverity === RISK_SEVERITY.CRITICAL ? 'critical' : 'warning',
      'Kritik risk sinyali',
      dto.hasShipmentIssue ? 'Sevk / operasyon riski' : 'Liste risk skoru yükseldi',
      TASK_SOURCE_TYPE.RISK,
      'Risk merkezini aç',
      DOMAIN_EVENT_TYPE.RISK_ESCALATED,
    )
  }

  if (dto.partiallyShipped && dto.displayStatus !== 'Teslim Edildi') {
    push(
      'partial-shipment',
      'info',
      'Kısmi sevk yapıldı',
      `Kalan miktar: ${dto.remainingQty ?? '—'}`,
      TASK_SOURCE_TYPE.SHIPMENT,
      'Kalan sevk planı',
      DOMAIN_EVENT_TYPE.SHIPMENT_PARTIAL,
    )
  }

  return out
}

/**
 * READ-ONLY görev projection — mock ve API aynı motor.
 * @param {{
 *   dtos: SalesOrderListItemDto[]
 *   events?: DomainEventDto[]
 *   todayIso: string
 * }} input
 * @returns {TaskDto[]}
 */
export function projectOperationalTasksFromReadModels(input) {
  const { dtos, todayIso } = input
  const events = input.events ?? []
  const stableAnchor = `${todayIso}T12:00:00.000Z`

  /** @type {TaskDto[]} */
  let tasks = []
  for (const dto of dtos) {
    tasks = tasks.concat(tasksForOrder(dto, events, todayIso, stableAnchor))
  }

  for (const ev of events) {
    if (ev.type !== DOMAIN_EVENT_TYPE.RISK_ESCALATED) continue
    const orderId = ev.aggregateId
    const dto = dtos.find((d) => d.id === orderId)
    tasks.push({
      id: `TASK-${orderId}-risk-${ev.id}`,
      salesOrderId: orderId,
      title: 'Risk aksiyonu gerekli',
      description: typeof ev.payload?.reason === 'string' ? String(ev.payload.reason) : null,
      status: TASK_STATUS.OPEN,
      priority: TASK_PRIORITY.CRITICAL,
      dedupeKey: `proj-risk-ev-${ev.id}`,
      source: 'event',
      relatedDomainEventId: ev.id,
      relatedEventType: ev.type,
      timelineHint: 'Risk olayı',
      createdAt: ev.occurredAt,
      updatedAt: ev.occurredAt,
      severity: 'critical',
      subtitle: typeof ev.payload?.reason === 'string' ? String(ev.payload.reason) : 'Risk güncellendi',
      customerName: dto?.customerDisplayName ?? orderId,
      sourceType: TASK_SOURCE_TYPE.RISK,
      suggestedAction: 'Siparişi incele',
    })
  }

  const byKey = new Map()
  for (const t of tasks) {
    if (!byKey.has(t.dedupeKey)) byKey.set(t.dedupeKey, t)
  }

  return [...byKey.values()].sort((a, b) => {
    const rank = { critical: 0, warning: 1, info: 2 }
    const sa = rank[/** @type {TaskSeverity} */ (a.severity ?? 'info')] ?? 2
    const sb = rank[/** @type {TaskSeverity} */ (b.severity ?? 'info')] ?? 2
    if (sa !== sb) return sa - sb
    return a.dedupeKey.localeCompare(b.dedupeKey)
  })
}

/**
 * @param {TaskDto[]} tasks
 * @param {number} [limit]
 */
export function tasksToNotificationItems(tasks, limit = 8) {
  return tasks.slice(0, limit).map((t) => ({
    id: t.id,
    title: t.title,
    body: `${t.customerName ?? t.salesOrderId} · ${t.subtitle ?? t.description ?? ''}`,
    time: t.createdAt?.slice(11, 16) ?? '',
    orderId: t.salesOrderId,
    severity: t.severity ?? 'info',
    suggestedAction: t.suggestedAction,
  }))
}
