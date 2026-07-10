import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { getOrderLinesForSalesOrder } from '../../services/mockOrderLineStore.js'
import { formatShortDate } from '../../utils/dates.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { moneyToNumber } from '../moneyHelpers.js'
import { buildRiskDrawerModel } from '../risk/riskDrawerUi.js'
import { BusinessEngine } from '../../engine/businessEngine.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../../contracts/orderDrawer.js').OrderDrawerTab} OrderDrawerTab */

/** @typedef {'done' | 'pending' | 'in_progress' | 'delayed'} LifecycleMilestoneStatus */

/**
 * @typedef {Object} LifecycleMilestoneDef
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {OrderDrawerTab} navTab
 * @property {string | null} gapKey
 */

/**
 * @typedef {Object} LifecycleMilestoneView
 * @property {string} id
 * @property {string} label
 * @property {string} icon
 * @property {LifecycleMilestoneStatus} status
 * @property {string | null} completedAt
 * @property {string | null} dateLabel
 * @property {string | null} timeLabel
 * @property {string | null} actor
 * @property {string | null} description
 * @property {OrderDrawerTab} navTab
 * @property {string | null} gapLabel
 * @property {boolean} gapOverdue
 * @property {string | null} gapWarning
 */

/**
 * @typedef {Object} LifecycleCeoMetrics
 * @property {string} totalOrderDuration
 * @property {string} productionDuration
 * @property {string} waitingDuration
 * @property {string} shipmentDuration
 * @property {string} collectionDuration
 * @property {string} totalLifecycle
 */

/**
 * @typedef {Object} OrderLifecycleTimelineView
 * @property {{ orderNo: string, customer: string, phone: string, totalLabel: string, remainingLabel: string, riskLabel: string, status: string }} header
 * @property {number} progressPercent
 * @property {LifecycleMilestoneView[]} milestones
 * @property {LifecycleCeoMetrics} ceoMetrics
 * @property {{ id: string, label: string, taskTitle: string, dateLabel: string | null, timeLabel: string | null, description: string | null }[]} aiEvents
 */

export const LIFECYCLE_MILESTONE_DEFS = /** @type {LifecycleMilestoneDef[]} */ ([
  { id: 'order_created', label: 'Sipariş oluşturuldu', icon: '📋', navTab: 'overview', gapKey: null },
  { id: 'deposit_received', label: 'Kapora alındı', icon: '💰', navTab: 'payments', gapKey: 'order_created→deposit_received' },
  { id: 'supply_created', label: 'Tedarik oluşturuldu', icon: '📝', navTab: 'products', gapKey: 'deposit_received→supply_created' },
  { id: 'supply_sent', label: 'Tedarik verildi', icon: '📦', navTab: 'products', gapKey: 'supply_created→supply_sent' },
  { id: 'first_product_arrived', label: 'İlk ürün geldi', icon: '📥', navTab: 'products', gapKey: 'supply_sent→first_product_arrived' },
  { id: 'products_completed', label: 'Ürünler tamamlandı', icon: '✅', navTab: 'products', gapKey: 'first_product_arrived→products_completed' },
  { id: 'shipment_planned', label: 'Sevk planlandı', icon: '🗓', navTab: 'shipment', gapKey: 'products_completed→shipment_planned' },
  { id: 'vehicle_dispatched', label: 'Araç çıktı', icon: '🚚', navTab: 'shipment', gapKey: 'shipment_planned→vehicle_dispatched' },
  { id: 'delivered', label: 'Teslim edildi', icon: '🏠', navTab: 'shipment', gapKey: 'vehicle_dispatched→delivered' },
  { id: 'collection_completed', label: 'Tahsilat tamamlandı', icon: '💳', navTab: 'payments', gapKey: 'delivered→collection_completed' },
  { id: 'order_closed', label: 'Sipariş kapandı', icon: '🔒', navTab: 'overview', gapKey: 'collection_completed→order_closed' },
])

/** @type {Record<string, number>} */
export const LIFECYCLE_STANDARD_GAP_HOURS = {
  'order_created→deposit_received': 2,
  'deposit_received→supply_created': 24,
  'supply_created→supply_sent': 24,
  'supply_sent→first_product_arrived': 240,
  'first_product_arrived→products_completed': 72,
  'products_completed→shipment_planned': 48,
  'shipment_planned→vehicle_dispatched': 48,
  'vehicle_dispatched→delivered': 48,
  'delivered→collection_completed': 72,
  'collection_completed→order_closed': 24,
}

/** @param {string | null | undefined} iso */
function splitDateTime(iso) {
  if (!iso) return { dateLabel: null, timeLabel: null }
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return { dateLabel: null, timeLabel: null }
  return {
    dateLabel: formatShortDate(iso.slice(0, 10)),
    timeLabel: d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' }),
  }
}

/** @param {DomainEventDto} event */
function eventActor(event) {
  const p = event.payload ?? {}
  return (
    (typeof p.actor === 'string' && p.actor) ||
    (typeof p.actorName === 'string' && p.actorName) ||
    (typeof p.performedBy === 'string' && p.performedBy) ||
    null
  )
}

/** @param {DomainEventDto} event */
function eventDescription(event) {
  const p = event.payload ?? {}
  const audit = p.audit && typeof p.audit === 'object' ? p.audit : null
  if (audit && typeof audit.description === 'string' && audit.description) return audit.description
  if (typeof p.description === 'string' && p.description) return p.description
  if (typeof p.productTitle === 'string' && p.productTitle) return p.productTitle
  return null
}

/** @param {number} ms */
function formatDurationMs(ms) {
  if (ms <= 0) return '0 dk'
  const hours = ms / 3_600_000
  if (hours < 1) return `${Math.max(1, Math.round(ms / 60_000))} dk`
  if (hours < 48) return `${Math.round(hours)} saat`
  const days = Math.round(hours / 24)
  return days === 1 ? '1 gün' : `${days} gün`
}

/** @param {string | null} fromIso @param {string | null} toIso */
function durationBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return null
  const a = new Date(fromIso).getTime()
  const b = new Date(toIso).getTime()
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return formatDurationMs(b - a)
}

/**
 * @param {Order} order
 * @param {DomainEventDto[]} events
 * @param {boolean} fullyPaid
 */
function resolveMilestoneTimestamps(order, events, fullyPaid) {
  const sorted = [...events].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
  const lines = getOrderLinesForSalesOrder(order.id)
  const hasSupplierLines = lines.some((l) => l.supplierId)

  const placed =
    sorted.find((e) => e.type === DOMAIN_EVENT_TYPE.ORDER_PLACED) ??
    (order.orderDate
      ? {
          occurredAt: `${order.orderDate}T09:00:00.000Z`,
          payload: {},
          type: DOMAIN_EVENT_TYPE.ORDER_PLACED,
          id: 'synthetic-placed',
        }
      : null)

  const payments = sorted.filter((e) => e.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED)
  const firstPayment = payments[0] ?? null
  const lastPayment = payments[payments.length - 1] ?? null
  const supplySentEvents = sorted.filter((e) => e.type === DOMAIN_EVENT_TYPE.SUPPLY_ORDER_SENT)
  const incomingEvents = sorted.filter((e) => e.type === DOMAIN_EVENT_TYPE.INCOMING_GOODS_RECORDED)

  const allLinesArrived =
    lines.length > 0 &&
    lines.every((l) => Number.parseFloat(l.qtyReceived ?? '0') >= Number.parseFloat(l.qtyOrdered ?? '0'))

  const shipmentPlanned = sorted.find(
    (e) =>
      e.type === DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED ||
      e.type === DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_CREATED ||
      e.type === 'shipment.plan.created',
  )
  const dispatched = sorted.find((e) => e.type === DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED)
  const deliveredEvent = sorted.find(
    (e) =>
      e.type === DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED ||
      e.type === DOMAIN_EVENT_TYPE.DELIVERY_COMPLETED,
  )

  const rem = remainingBalance(order)
  void rem
  const collectionDone =
    fullyPaid && lastPayment
      ? lastPayment
      : fullyPaid && (order.paidAmount ?? 0) > 0
        ? (firstPayment ?? placed)
        : null

  const delivered =
    deliveredEvent ??
    (order.status === 'Teslim Edildi' && placed
      ? {
          occurredAt: `${order.orderDate ?? order.dueDate ?? '1970-01-01'}T18:00:00.000Z`,
          payload: {},
          type: DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED,
          id: 'synthetic-delivered',
        }
      : null)

  const orderClosed = fullyPaid && order.status === 'Teslim Edildi' ? (collectionDone ?? delivered ?? placed) : null

  return {
    order_created: { at: placed?.occurredAt ?? '', actor: placed ? eventActor(/** @type {DomainEventDto} */ (placed)) : null, description: null },
    deposit_received: { at: firstPayment?.occurredAt ?? '', actor: firstPayment ? eventActor(firstPayment) : null, description: firstPayment ? eventDescription(firstPayment) : null },
    supply_created: { at: hasSupplierLines ? (placed?.occurredAt ?? '') : '', actor: placed && hasSupplierLines ? eventActor(/** @type {DomainEventDto} */ (placed)) : null, description: hasSupplierLines ? `${lines.length} satır tedarik kaydı` : null },
    supply_sent: { at: supplySentEvents[0]?.occurredAt ?? '', actor: supplySentEvents[0] ? eventActor(supplySentEvents[0]) : null, description: supplySentEvents.length > 1 ? `${supplySentEvents.length} satır tedarik verildi` : supplySentEvents[0] ? eventDescription(supplySentEvents[0]) : null },
    first_product_arrived: { at: incomingEvents[0]?.occurredAt ?? '', actor: incomingEvents[0] ? eventActor(incomingEvents[0]) : null, description: incomingEvents[0] ? eventDescription(incomingEvents[0]) : null },
    products_completed: { at: allLinesArrived && incomingEvents.length ? (incomingEvents[incomingEvents.length - 1]?.occurredAt ?? '') : '', actor: allLinesArrived && incomingEvents.length ? eventActor(incomingEvents[incomingEvents.length - 1]) : null, description: allLinesArrived ? 'Tüm satırlar depoya alındı' : null },
    shipment_planned: { at: shipmentPlanned?.occurredAt ?? '', actor: shipmentPlanned ? eventActor(shipmentPlanned) : null, description: shipmentPlanned ? eventDescription(shipmentPlanned) : null },
    vehicle_dispatched: { at: dispatched?.occurredAt ?? '', actor: dispatched ? eventActor(dispatched) : null, description: dispatched ? eventDescription(dispatched) : null },
    delivered: { at: delivered?.occurredAt ?? '', actor: delivered ? eventActor(/** @type {DomainEventDto} */ (delivered)) : null, description: delivered ? eventDescription(/** @type {DomainEventDto} */ (delivered)) : null },
    collection_completed: { at: collectionDone?.occurredAt ?? '', actor: collectionDone ? eventActor(/** @type {DomainEventDto} */ (collectionDone)) : null, description: fullyPaid ? 'Bakiye kapandı' : null },
    order_closed: { at: orderClosed?.occurredAt ?? '', actor: orderClosed ? eventActor(/** @type {DomainEventDto} */ (orderClosed)) : null, description: orderClosed ? 'Sipariş operasyonu tamamlandı' : null },
  }
}

/** @param {Record<string, { at: string }>} timestamps */
function assignMilestoneStatuses(timestamps) {
  /** @type {Record<string, LifecycleMilestoneStatus>} */
  const statuses = {}
  let foundCurrent = false

  if (timestamps.order_closed?.at) {
    for (const def of LIFECYCLE_MILESTONE_DEFS) {
      statuses[def.id] = timestamps[def.id]?.at ? 'done' : 'pending'
    }
    return statuses
  }

  for (const def of LIFECYCLE_MILESTONE_DEFS) {
    if (timestamps[def.id]?.at) {
      statuses[def.id] = 'done'
    } else if (!foundCurrent) {
      statuses[def.id] = 'in_progress'
      foundCurrent = true
    } else {
      statuses[def.id] = 'pending'
    }
  }
  return statuses
}

/** @param {LifecycleMilestoneView[]} milestones */
function computeCeoMetrics(milestones) {
  const byId = Object.fromEntries(milestones.map((m) => [m.id, m]))
  const ms = (id) => {
    const at = byId[id]?.completedAt
    return at ? new Date(at).getTime() : null
  }
  const gap = (aId, bId) => {
    const a = ms(aId)
    const b = ms(bId)
    return a != null && b != null ? formatDurationMs(b - a) : '—'
  }

  const start = ms('order_created')
  const closed = ms('order_closed')
  const end = closed ?? ms('delivered') ?? Date.now()

  return {
    totalOrderDuration: start != null ? formatDurationMs(end - start) : '—',
    productionDuration: gap('supply_sent', 'products_completed'),
    waitingDuration: gap('deposit_received', 'supply_sent'),
    shipmentDuration: gap('shipment_planned', 'delivered'),
    collectionDuration: gap('delivered', 'collection_completed'),
    totalLifecycle: closed != null && start != null ? formatDurationMs(closed - start) : '—',
  }
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {DomainEventDto[]} domainEvents
 * @param {string} todayIso
 */
export function buildOrderLifecycleTimeline(order, dto, domainEvents, todayIso) {
  void todayIso
  const risk = buildRiskDrawerModel(dto, order, todayIso)

  const total = dto ? moneyToNumber(dto.totalAmount) : order.amount ?? 0
  const remaining = dto ? moneyToNumber(dto.remainingAmount ?? dto.amountDue) : remainingBalance(order)
  const fullyPaid = remaining <= 0.009 || order.paid === true || dto?.isFullyPaid === true

  const orderEvents = domainEvents.filter((e) => e.aggregateId === order.id)
  const timestamps = resolveMilestoneTimestamps(order, orderEvents, fullyPaid)
  const statuses = assignMilestoneStatuses(timestamps)

  /** @type {LifecycleMilestoneView[]} */
  const milestones = []
  let prevAt = null

  for (const def of LIFECYCLE_MILESTONE_DEFS) {
    const raw = timestamps[def.id]
    const at = raw.at || null
    const { dateLabel, timeLabel } = splitDateTime(at)
    const standardGapHours = def.gapKey ? LIFECYCLE_STANDARD_GAP_HOURS[def.gapKey] ?? null : null
    let gapLabel = prevAt && at ? durationBetween(prevAt, at) : null
    let gapOverdue = false
    let gapWarning = null
    let status = statuses[def.id] ?? 'pending'

    if (prevAt && at && standardGapHours != null) {
      const elapsedH = (new Date(at).getTime() - new Date(prevAt).getTime()) / 3_600_000
      if (elapsedH > standardGapHours) {
        gapOverdue = true
        const normalLabel =
          standardGapHours >= 24 ? `${Math.round(standardGapHours / 24)} gün` : `${standardGapHours} saat`
        gapWarning = `${def.label} gecikti · normal ${normalLabel}`
        if (status === 'done') status = 'delayed'
      }
    }

    if (!at && status === 'in_progress' && prevAt && standardGapHours != null) {
      const elapsedH = (Date.now() - new Date(prevAt).getTime()) / 3_600_000
      if (elapsedH > standardGapHours) {
        gapOverdue = true
        gapWarning = `${def.label} beklenenden uzun sürüyor`
        status = 'delayed'
      }
      gapLabel = durationBetween(prevAt, new Date().toISOString())
    }

    milestones.push({
      id: def.id,
      label: def.label,
      icon: def.icon,
      status,
      completedAt: at,
      dateLabel,
      timeLabel,
      actor: raw.actor,
      description: raw.description,
      navTab: def.navTab,
      gapLabel,
      gapOverdue,
      gapWarning,
    })

    if (at) prevAt = at
  }

  const aiEvents = orderEvents
    .filter(
      (e) =>
        e.type === DOMAIN_EVENT_TYPE.AI_SALES_TASK_CREATED ||
        e.type === DOMAIN_EVENT_TYPE.AI_SALES_TASK_COMPLETED ||
        e.type === DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_CREATED ||
        e.type === DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_COMPLETED ||
        e.type === DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_CREATED ||
        e.type === DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_COMPLETED ||
        e.type === DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_CREATED ||
        e.type === DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_COMPLETED ||
        e.type === DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED,
    )
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))
    .map((e) => {
      const { dateLabel, timeLabel } = splitDateTime(e.occurredAt)
      const p = e.payload ?? {}
      const isCollection = e.type === DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_CREATED || e.type === DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_COMPLETED
      const isShipment = e.type === DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_CREATED || e.type === DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_COMPLETED
      const isProcurement = e.type === DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_CREATED || e.type === DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_COMPLETED
      const isCompleted = String(e.type).includes('.completed') || e.type === DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED
      return {
        id: e.id,
        label: e.type === DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED
          ? 'Operasyon Tamamlandı'
          : isProcurement
            ? isCompleted
              ? 'AI Procurement Task Completed'
              : 'AI Procurement Task Created'
            : isShipment
              ? isCompleted
                ? 'AI Shipment Task Completed'
                : 'AI Shipment Task Created'
              : isCollection
                ? isCompleted
                  ? 'AI Collection Task Completed'
                  : 'AI Collection Task Created'
                : isCompleted
                  ? 'AI Task Completed'
                  : 'AI Task Created',
        taskTitle: typeof p.taskTitle === 'string' ? p.taskTitle : 'AI görevi',
        dateLabel,
        timeLabel,
        description:
          typeof p.description === 'string'
            ? p.description
            : typeof p.taskTitle === 'string'
              ? p.taskTitle
              : null,
      }
    })

  const doneCount = milestones.filter((m) => m.status === 'done' || m.status === 'delayed').length
  const inProgress = milestones.some((m) => m.status === 'in_progress')
  const engineProgress = BusinessEngine.computeOrderSnapshot({ order, dto, todayIso }).progressPercent
  const milestoneProgress = Math.min(
    100,
    Math.round(((doneCount + (inProgress ? 0.35 : 0)) / milestones.length) * 100),
  )
  const progressPercent = Math.max(engineProgress, milestoneProgress)

  return {
    header: {
      orderNo: dto?.orderNumber ?? order.id,
      customer: dto?.customerDisplayName ?? order.customer,
      phone: order.phone?.trim() || order.phone2?.trim() || '—',
      totalLabel: formatTry(total),
      remainingLabel: formatTry(remaining),
      riskLabel: risk.badgeLabel ?? 'Normal',
      status: dto?.displayStatus ?? order.status,
    },
    progressPercent,
    milestones,
    ceoMetrics: computeCeoMetrics(milestones),
    aiEvents,
  }
}
