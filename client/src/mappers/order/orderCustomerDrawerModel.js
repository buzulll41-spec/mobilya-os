import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { formatShortDate } from '../../utils/dates.js'
import { domainEventTypeLabelTr } from '../timeline/domainEventTypeLabelTr.js'
import { parseCustomerExtraFromNotes } from '../../features/orders/newOrderWizardModel.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

const NOTES_STORAGE_PREFIX = 'mobilya-os:customer-notes:'

/**
 * @param {string | null | undefined} notes
 */
export function parseContactExtras(notes) {
  if (!notes?.trim()) {
    return { email: null, city: null, district: null, opsNote: '—' }
  }
  const email = notes.match(/E-?posta:\s*([^\n]+)/i)?.[1]?.trim() ?? null
  const city = notes.match(/İl:\s*([^\n,]+)/i)?.[1]?.trim() ?? null
  const district = notes.match(/İlçe:\s*([^\n,]+)/i)?.[1]?.trim() ?? null
  const opsNote =
    notes
      .split('\n')
      .map((l) => l.trim())
      .filter(
        (l) =>
          l &&
          !/^Adres:/i.test(l) &&
          !/^E-?posta:/i.test(l) &&
          !/^İl:/i.test(l) &&
          !/^İlçe:/i.test(l) &&
          !/^--- Müşteri ek ---/i.test(l) &&
          !/^--- Müşteri ek son ---/i.test(l) &&
          !/^TC:/i.test(l) &&
          !/^Tel 2:/i.test(l) &&
          !/^Vergi /i.test(l),
      )
      .join('\n')
      .trim() || '—'
  return { email, city, district, opsNote }
}

/**
 * @param {string} customerName
 * @param {string | null | undefined} notes
 */
export function inferCustomerTypeLabel(customerName, notes) {
  const extra = parseCustomerExtraFromNotes(notes)
  if (extra.taxNumber?.trim()) return 'Kurumsal'
  const name = customerName.trim()
  if (/\b(A\.?Ş\.?|LTD|ŞTİ|Şirketi|Mobilya|Sanayi|Ticaret)\b/i.test(name)) return 'Kurumsal'
  return 'Perakende'
}

/**
 * @param {string} customerName
 * @param {Order[]} orders
 * @param {SalesOrderListItemDto[]} dtos
 */
export function buildCustomerDrawerStats(customerName, orders, dtos) {
  const norm = customerName.trim()
  const customerOrders = orders.filter((o) => o.customer?.trim() === norm)
  const idSet = new Set(customerOrders.map((o) => o.id))
  const customerDtos = dtos.filter((d) => idSet.has(d.id))

  let totalSales = 0
  let totalPaid = 0
  let openBalance = 0

  for (const o of customerOrders) {
    totalSales += o.amount ?? 0
    openBalance += remainingBalance(o)
    totalPaid += o.paid ? (o.amount ?? 0) : (o.paidAmount ?? 0)
  }

  const lastOrderDate = customerOrders
    .map((o) => o.orderDate)
    .filter(Boolean)
    .sort((a, b) => String(b).localeCompare(String(a)))[0]

  const totalOrders = customerOrders.length
  const deliveredOrders = customerOrders.filter((o) => o.status === 'Teslim Edildi').length

  return {
    totalOrders,
    activeOrders: customerOrders.filter((o) => o.status !== 'Teslim Edildi').length,
    deliveredOrders,
    pendingShipment: customerDtos.filter(
      (d) => (d.shipmentSummaryOpenCount ?? 0) > 0 || (d.inTransitShipmentCount ?? 0) > 0,
    ).length,
    totalSales,
    totalPaid,
    openBalance,
    avgOrder: totalOrders > 0 ? totalSales / totalOrders : 0,
    lastOrderDate: lastOrderDate ? formatShortDate(lastOrderDate) : '—',
    orderIds: idSet,
    customerOrders,
  }
}

/** @param {string} type */
function timelineLabelForEventType(type) {
  switch (type) {
    case DOMAIN_EVENT_TYPE.ORDER_PLACED:
    case 'order.placed':
      return 'Sipariş oluşturuldu'
    case DOMAIN_EVENT_TYPE.PAYMENT_POSTED:
      return 'Ödeme alındı'
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED:
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_CREATED:
    case 'shipment.plan.created':
      return 'Sevk planlandı'
    case DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED:
    case DOMAIN_EVENT_TYPE.DELIVERY_COMPLETED:
      return 'Teslim edildi'
    case DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED:
      return 'SSH açıldı'
    default:
      return domainEventTypeLabelTr(type)
  }
}

/**
 * @param {Set<string>} orderIds
 * @param {DomainEventDto[]} domainEvents
 * @param {Order[]} customerOrders
 */
export function buildCustomerDrawerTimeline(orderIds, domainEvents, customerOrders) {
  const events = domainEvents
    .filter((e) => orderIds.has(e.aggregateId))
    .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))

  /** @type {{ id: string, label: string, at: string, dateLabel: string }[]} */
  const items = events.slice(0, 12).map((e) => ({
    id: e.id,
    label: timelineLabelForEventType(e.type),
    at: e.occurredAt,
    dateLabel: formatShortDate(e.occurredAt.slice(0, 10)),
  }))

  if (items.length === 0 && customerOrders.length > 0) {
    const latest = [...customerOrders].sort((a, b) =>
      String(b.orderDate ?? '').localeCompare(String(a.orderDate ?? '')),
    )[0]
    if (latest?.orderDate) {
      items.push({
        id: `placed-${latest.id}`,
        label: 'Sipariş oluşturuldu',
        at: `${latest.orderDate}T10:00:00.000Z`,
        dateLabel: formatShortDate(latest.orderDate),
      })
    }
  }

  return items
}

/**
 * @param {Set<string>} orderIds
 * @param {DomainEventDto[]} domainEvents
 */
export function findLastPaymentLabel(orderIds, domainEvents) {
  const hit = domainEvents
    .filter(
      (e) => orderIds.has(e.aggregateId) && e.type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
    )
    .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))[0]
  return hit ? formatShortDate(hit.occurredAt.slice(0, 10)) : '—'
}

/**
 * @param {string} customerName
 */
export function loadCustomerDrawerNotes(customerName) {
  try {
    const raw = localStorage.getItem(`${NOTES_STORAGE_PREFIX}${customerName.trim()}`)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((n) => typeof n === 'string') : []
  } catch {
    return []
  }
}

/**
 * @param {string} customerName
 * @param {string[]} notes
 */
export function saveCustomerDrawerNotes(customerName, notes) {
  try {
    localStorage.setItem(`${NOTES_STORAGE_PREFIX}${customerName.trim()}`, JSON.stringify(notes))
  } catch {
    /* ignore quota */
  }
}

/**
 * @param {number} value
 */
export function formatAvgOrder(value) {
  if (!Number.isFinite(value) || value <= 0) return '—'
  return formatTry(value)
}
