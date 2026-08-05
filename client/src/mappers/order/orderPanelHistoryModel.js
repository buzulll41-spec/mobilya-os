import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { mapDomainEventsToAuditFeed } from '../audit/mapDomainEventsToAuditFeed.js'
import { formatShortDate } from '../../utils/dates.js'

/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../../data/seedOrders.js').Order} Order */

/** @typedef {'payment' | 'shipment' | 'ssh' | 'missing' | 'info' | 'supply' | 'incoming'} HistoryDisplayCategory */
/** @typedef {'success' | 'progress' | 'critical' | 'warning' | 'neutral'} HistoryCategoryTone */

/**
 * @typedef {Object} OrderPanelHistoryRow
 * @property {string} id
 * @property {string} at ISO
 * @property {string} dateLabel
 * @property {string} timeLabel
 * @property {string} title
 * @property {string} description
 * @property {string | null} actor
 * @property {HistoryDisplayCategory} displayCategory
 * @property {string} categoryLabel
 * @property {HistoryCategoryTone} categoryTone
 * @property {boolean} hasNote
 * @property {string} module
 * @property {string} moduleLabel
 * @property {string} recordId
 * @property {string | null} oldValue
 * @property {string | null} newValue
 */

/**
 * @typedef {Object} OrderPanelHistoryTimelineGroup
 * @property {string} dateLabel
 * @property {{ id: string, label: string }[]} items
 */

/** @type {{ id: string, label: string, categories: HistoryDisplayCategory[] | null }[]} */
export const HISTORY_PANEL_FILTERS = [
  { id: 'all', label: 'Tümü', categories: null },
  { id: 'payment', label: 'Tahsilat', categories: ['payment'] },
  { id: 'shipment', label: 'Sevk', categories: ['shipment'] },
  { id: 'ssh', label: 'SSH', categories: ['ssh'] },
  { id: 'missing', label: 'Eksik Parça', categories: ['missing'] },
  { id: 'supply', label: 'Tedarik', categories: ['supply'] },
  { id: 'incoming', label: 'Gelen Ürün', categories: ['incoming'] },
  { id: 'system', label: 'Sistem', categories: ['info'] },
]

/** @param {string} type */
function isMissingItemEventType(type) {
  return (
    type === DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED ||
    type === DOMAIN_EVENT_TYPE.MISSING_ITEM_ORDERED ||
    type === DOMAIN_EVENT_TYPE.MISSING_ITEM_ARRIVED ||
    type === DOMAIN_EVENT_TYPE.MISSING_ITEM_READY_FOR_SHIPMENT ||
    type === DOMAIN_EVENT_TYPE.MISSING_ITEM_RESOLVED
  )
}

/** @param {string} type */
function isSshEventType(type) {
  return (
    type === DOMAIN_EVENT_TYPE.INSTALLATION_ISSUE ||
    type === DOMAIN_EVENT_TYPE.DELIVERY_FAILED ||
    type === DOMAIN_EVENT_TYPE.RISK_ESCALATED ||
    type === DOMAIN_EVENT_TYPE.DISPATCH_RISK_DETECTED ||
    type === 'dispatch.risk_detected'
  )
}

/** @param {string} type */
function isShipmentEventType(type) {
  return (
    type === DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED ||
    type === DOMAIN_EVENT_TYPE.SHIPMENT_PARTIAL ||
    type === DOMAIN_EVENT_TYPE.SHIPMENT_LOADED ||
    type === DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED ||
    type === DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED ||
    type === DOMAIN_EVENT_TYPE.INSTALLATION_COMPLETED ||
    type === DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCH_SHEET_PRINTED ||
    type === 'shipment.dispatch_sheet_printed' ||
    type === DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_CREATED ||
    type === 'shipment.plan.created' ||
    type === DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_UPDATED ||
    type === 'shipment.plan.updated' ||
    type === DOMAIN_EVENT_TYPE.SHIPMENT_GROUP_CREATED ||
    type === 'shipment.group.created' ||
    type === DOMAIN_EVENT_TYPE.SHIPMENT_GROUP_APPLIED ||
    type === 'shipment.group.applied' ||
    type === DOMAIN_EVENT_TYPE.DISPATCH_AUTO_PLANNED ||
    type === 'dispatch.auto_planned' ||
    type === DOMAIN_EVENT_TYPE.DELIVERY_COMPLETED
  )
}

/** @param {string} type */
function isPaymentEventType(type) {
  return type === DOMAIN_EVENT_TYPE.PAYMENT_POSTED || type === DOMAIN_EVENT_TYPE.PAYMENT_PENDING
}

function isSupplyEventType(type) {
  return type === DOMAIN_EVENT_TYPE.SUPPLY_ORDER_SENT || type === 'supply.order.sent'
}

function isIncomingGoodsEventType(type) {
  return type === DOMAIN_EVENT_TYPE.INCOMING_GOODS_RECORDED || type === 'incoming_goods.recorded'
}

/** @param {string} type */
export function resolveHistoryDisplayCategory(type) {
  if (isPaymentEventType(type)) return /** @type {const} */ ('payment')
  if (isShipmentEventType(type)) return /** @type {const} */ ('shipment')
  if (isSupplyEventType(type)) return /** @type {const} */ ('supply')
  if (isIncomingGoodsEventType(type)) return /** @type {const} */ ('incoming')
  if (isMissingItemEventType(type)) return /** @type {const} */ ('missing')
  if (isSshEventType(type)) return /** @type {const} */ ('ssh')
  if (type === DOMAIN_EVENT_TYPE.ORDER_PLACED || type === 'order.placed') return /** @type {const} */ ('info')
  return /** @type {const} */ ('info')
}

/** @param {HistoryDisplayCategory} category */
export function historyDisplayCategoryLabel(category) {
  switch (category) {
    case 'payment':
      return 'Tahsilat'
    case 'shipment':
      return 'Sevk'
    case 'ssh':
      return 'SSH'
    case 'missing':
      return 'Eksik Parça'
    case 'supply':
      return 'Tedarik'
    case 'incoming':
      return 'Gelen Ürün'
    default:
      return 'Bilgi'
  }
}

/** @param {HistoryDisplayCategory} category */
export function historyDisplayCategoryTone(category) {
  switch (category) {
    case 'payment':
      return /** @type {const} */ ('success')
    case 'shipment':
      return /** @type {const} */ ('progress')
    case 'ssh':
      return /** @type {const} */ ('critical')
    case 'missing':
      return /** @type {const} */ ('warning')
    case 'supply':
      return /** @type {const} */ ('progress')
    case 'incoming':
      return /** @type {const} */ ('success')
    default:
      return /** @type {const} */ ('neutral')
  }
}

/** @param {string} at */
function formatHistoryTimeLabel(at) {
  if (!at || at.length < 16) return '—'
  return at.slice(11, 16)
}

/**
 * @param {Order} order
 * @param {DomainEventDto[]} domainEvents
 */
export function buildOrderPanelHistoryRows(order, domainEvents) {
  const feed = mapDomainEventsToAuditFeed(domainEvents, order.id)
  const orderEvents = domainEvents.filter((e) => e.aggregateId === order.id)

  /** @type {OrderPanelHistoryRow[]} */
  const rows = feed.map((item) => {
    const displayCategory = resolveHistoryDisplayCategory(item.type)
    const description = item.description?.trim() ?? ''
    return {
      id: item.id,
      at: item.at,
      dateLabel: formatShortDate(item.at.slice(0, 10)),
      timeLabel: formatHistoryTimeLabel(item.at),
      title: item.title,
      description: description || '—',
      actor: item.actor,
      displayCategory,
      categoryLabel: historyDisplayCategoryLabel(displayCategory),
      categoryTone: historyDisplayCategoryTone(displayCategory),
      hasNote: description.length > 0,
      module: item.module,
      moduleLabel: item.moduleLabel,
      recordId: item.recordId,
      oldValue: item.oldValue,
      newValue: item.newValue,
    }
  })

  const hasPlacedEvent = orderEvents.some(
    (e) => e.type === DOMAIN_EVENT_TYPE.ORDER_PLACED || e.type === DOMAIN_EVENT_TYPE.ORDER_LIFECYCLE_CHANGED,
  )

  if (order.orderDate && !hasPlacedEvent) {
    const at = `${order.orderDate}T10:00:00.000Z`
    rows.push({
      id: `order-placed-${order.id}`,
      at,
      dateLabel: formatShortDate(order.orderDate),
      timeLabel: '10:00',
      title: 'Sipariş oluşturuldu',
      description: order.status ? `Durum: ${order.status}` : '—',
      actor: null,
      displayCategory: 'info',
      categoryLabel: 'Bilgi',
      categoryTone: 'neutral',
      hasNote: Boolean(order.status),
      module: 'ORDER',
      moduleLabel: 'Sipariş',
      recordId: order.id,
      oldValue: null,
      newValue: order.status ?? null,
    })
  }

  return rows.sort((a, b) => b.at.localeCompare(a.at))
}

/**
 * @param {OrderPanelHistoryRow[]} rows
 */
export function buildOrderPanelHistorySummary(rows) {
  const totalMoves = rows.length
  const sorted = [...rows].sort((a, b) => a.at.localeCompare(b.at))
  const firstAt = sorted[0]?.at.slice(0, 10) ?? '—'
  const lastAt = sorted.at(-1)?.at.slice(0, 10) ?? '—'
  const totalNotes = rows.filter((r) => r.hasNote).length
  const totalOps = rows.filter((r) => r.displayCategory !== 'info').length

  return [
    {
      id: 'total',
      label: 'Toplam Hareket',
      value: String(totalMoves),
      cardTone: totalMoves > 0 ? /** @type {const} */ ('neutral') : /** @type {const} */ ('neutral'),
    },
    {
      id: 'first',
      label: 'İlk İşlem Tarihi',
      value: firstAt === '—' ? '—' : formatShortDate(firstAt),
      cardTone: /** @type {const} */ ('progress'),
    },
    {
      id: 'last',
      label: 'Son İşlem Tarihi',
      value: lastAt === '—' ? '—' : formatShortDate(lastAt),
      cardTone: /** @type {const} */ ('warning'),
    },
    {
      id: 'notes',
      label: 'Toplam Not',
      value: String(totalNotes),
      cardTone: totalNotes > 0 ? /** @type {const} */ ('warning') : /** @type {const} */ ('neutral'),
    },
    {
      id: 'ops',
      label: 'Toplam Operasyon',
      value: String(totalOps),
      cardTone: totalOps > 0 ? /** @type {const} */ ('success') : /** @type {const} */ ('neutral'),
    },
  ]
}

/**
 * @param {OrderPanelHistoryRow[]} rows
 */
export function buildOrderPanelHistoryTimeline(rows) {
  /** @type {OrderPanelHistoryTimelineGroup[]} */
  const groups = []

  for (const row of rows) {
    const last = groups.at(-1)
    if (!last || last.dateLabel !== row.dateLabel) {
      groups.push({
        dateLabel: row.dateLabel,
        items: [{ id: row.id, label: row.title }],
      })
      continue
    }
    last.items.push({ id: row.id, label: row.title })
  }

  return groups
}

/**
 * @param {OrderPanelHistoryRow[]} rows
 * @param {string} filterId
 */
export function filterOrderPanelHistoryRows(rows, filterId) {
  const filterDef = HISTORY_PANEL_FILTERS.find((f) => f.id === filterId) ?? HISTORY_PANEL_FILTERS[0]
  if (!filterDef.categories) return rows
  return rows.filter((row) => filterDef.categories.includes(row.displayCategory))
}
