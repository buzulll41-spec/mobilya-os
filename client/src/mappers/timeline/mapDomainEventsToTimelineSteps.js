import { buildOrderTimeline } from '../../utils/orderTimeline.js'
import { formatShortDate } from '../../utils/dates.js'
import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { domainEventTypeLabelTr } from './domainEventTypeLabelTr.js'
import { relativeTimeLabelTr } from './relativeTimeLabelTr.js'
import { shipmentStatusLabel } from '../shipment/shipmentStatusLabel.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../../utils/orderTimeline.js').TimelineStep} TimelineStep */

/**
 * @param {DomainEventDto} e
 */
function eventDetailLine(e) {
  if (e.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED) {
    const amt = e.payload.amount
    if (typeof amt === 'string' || typeof amt === 'number') {
      return `${amt} ${e.payload.currency ?? 'TRY'}`
    }
  }
  if (e.type === 'risk.escalated' && typeof e.payload.reason === 'string') {
    return String(e.payload.reason)
  }
  if (e.type === 'delivery.failed' && typeof e.payload.reason === 'string') {
    return String(e.payload.reason)
  }
  if (e.type === 'order.lifecycle_changed') {
    const from = e.payload.from != null ? String(e.payload.from) : '—'
    const to = e.payload.to != null ? String(e.payload.to) : '—'
    return `${from} → ${to}`
  }
  if (e.type === DOMAIN_EVENT_TYPE.ORDER_LINE_COMMITTED_SHIP_BY_CHANGED) {
    const oldD = e.payload.oldDate != null ? String(e.payload.oldDate) : '—'
    const newD = e.payload.newDate != null ? String(e.payload.newDate) : '—'
    const reason = e.payload.reason != null ? String(e.payload.reason) : ''
    return reason ? `${oldD} → ${newD} · ${reason}` : `${oldD} → ${newD}`
  }
  if (e.type === 'shipment.partial') {
    return `${e.payload.shippedQty ?? '?'}/${e.payload.orderedQty ?? '?'} adet`
  }
  if (
    e.type === DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED ||
    e.type === DOMAIN_EVENT_TYPE.SHIPMENT_LOADED ||
    e.type === DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED ||
    e.type === DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED ||
    e.type === DOMAIN_EVENT_TYPE.INSTALLATION_COMPLETED ||
    e.type === DOMAIN_EVENT_TYPE.INSTALLATION_ISSUE
  ) {
    const from = e.payload.fromStatus != null ? String(e.payload.fromStatus) : ''
    const to = e.payload.toStatus != null ? String(e.payload.toStatus) : ''
    const issue = e.payload.issueNote != null ? String(e.payload.issueNote) : ''
    const transition =
      from && to
        ? `${shipmentStatusLabel(from)} → ${shipmentStatusLabel(to)}`
        : from
          ? shipmentStatusLabel(from)
          : to
            ? shipmentStatusLabel(to)
            : ''
    const planned =
      e.payload.plannedShipDate != null
        ? String(e.payload.plannedShipDate)
        : e.payload.plannedDate != null
          ? String(e.payload.plannedDate)
          : ''
    return [planned && `plan ${planned}`, transition, issue].filter(Boolean).join(' · ')
  }
  if (e.type === DOMAIN_EVENT_TYPE.TASK_CREATED && typeof e.payload.title === 'string') {
    return String(e.payload.title)
  }
  if (e.type === DOMAIN_EVENT_TYPE.TASK_COMPLETED) {
    const r = e.payload.reason != null ? String(e.payload.reason) : ''
    const dk = e.payload.dedupeKey != null ? String(e.payload.dedupeKey) : ''
    return [r, dk].filter(Boolean).join(' · ')
  }
  if (
    e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED ||
    e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_ORDERED ||
    e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_ARRIVED ||
    e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_READY_FOR_SHIPMENT ||
    e.type === DOMAIN_EVENT_TYPE.MISSING_ITEM_RESOLVED
  ) {
    const title = e.payload.title != null ? String(e.payload.title) : ''
    const qty = e.payload.quantity != null ? String(e.payload.quantity) : ''
    const from = e.payload.fromStatus != null ? String(e.payload.fromStatus) : ''
    const to = e.payload.toStatus != null ? String(e.payload.toStatus) : ''
    const resolution =
      e.payload.resolutionNote != null ? String(e.payload.resolutionNote) : ''
    const transition = from && to ? `${from} → ${to}` : ''
    return [title, qty && `${qty} adet`, transition, resolution].filter(Boolean).join(' · ')
  }
  return ''
}

/**
 * @param {Order} order
 * @param {DomainEventDto[]} allEvents
 * @param {string} todayIso
 * @returns {TimelineStep[]}
 */
export function mapDomainEventsToTimelineSteps(order, allEvents, todayIso) {
  const mine = allEvents.filter((e) => e.aggregateId === order.id)
  if (!mine.length) {
    return buildOrderTimeline(order)
  }

  const sorted = [...mine].sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))

  /** @type {TimelineStep[]} */
  const steps = []

  const placedDay = order.orderDate
  steps.push({
    key: `evt-order-${order.id}-placed`,
    label: 'Sipariş kaydı açıldı',
    state: /** @type {const} */ ('done'),
    dateLabel: `${formatShortDate(placedDay)} · ${relativeTimeLabelTr(`${placedDay}T10:00:00.000Z`, todayIso)}`,
    showDayHead: true,
    groupLabel: formatShortDate(placedDay),
  })

  let prevDay = placedDay
  for (const e of sorted) {
    const day = e.occurredAt.slice(0, 10)
    const showDayHead = day !== prevDay
    prevDay = day

    const rel = relativeTimeLabelTr(e.occurredAt, todayIso)
    const abs = formatShortDate(day)

    const baseLabel = domainEventTypeLabelTr(e.type)
    const detail = eventDetailLine(e)
    const label = detail ? `${baseLabel} — ${detail}` : baseLabel

    /** @type {TimelineStep} */
    const step = {
      key: e.id,
      label,
      state: 'done',
      dateLabel: `${abs} · ${rel}`,
      showDayHead,
      groupLabel: showDayHead ? abs : undefined,
    }
    if (e.type === DOMAIN_EVENT_TYPE.RISK_ESCALATED) {
      step.variant = 'risk'
    }
    if (e.type === DOMAIN_EVENT_TYPE.TASK_CREATED || e.type === DOMAIN_EVENT_TYPE.TASK_COMPLETED) {
      step.variant = 'task'
    }
    steps.push(step)
  }

  if (order.status !== 'Teslim Edildi') {
    steps.push({
      key: 'evt-ops-continuing',
      label: `Operasyon devam ediyor · ${order.status}`,
      state: 'current',
      dateLabel: formatShortDate(todayIso),
      showDayHead: false,
    })
  }

  return steps
}
