import {
  MISSING_ITEM_STATUS,
  isMissingItemBlockingShipment,
  isMissingItemResolvedStatus,
} from '../../contracts/v1/missingItemStatuses.js'
import { missingItemStatusOrOpen } from '../missingItems/missingItemStatusLabel.js'
import {
  buildSshMissingPartCard,
  estimateMissingItemArrivalLabel,
  sshMissingItemStatusLabelTr,
} from '../ssh/sshMissingPartsModel.js'
import { formatShortDate } from '../../utils/dates.js'
import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'

/** @typedef {import('../../contracts/v1/missingItem.js').MissingItemDto} MissingItemDto */
/** @typedef {import('../../contracts/v1/operationCase.js').OperationCaseDto} OperationCaseDto */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/** @typedef {'critical' | 'waiting' | 'progress' | 'done'} SshRowTone */
/** @typedef {'missing' | 'damage' | 'fabric' | 'color' | 'production' | 'service'} SshCategoryId */

export const SSH_PANEL_CATEGORIES = /** @type {const} */ ([
  { id: 'missing', label: 'Eksik Parça' },
  { id: 'damage', label: 'Hasar' },
  { id: 'fabric', label: 'Kumaş Hatası' },
  { id: 'color', label: 'Renk Hatası' },
  { id: 'production', label: 'Üretim Hatası' },
  { id: 'service', label: 'Servis Talebi' },
])

const CATEGORY_RULES = [
  { id: /** @type {SshCategoryId} */ ('fabric'), keys: ['kumaş', 'kumas', 'fabric', 'döşeme', 'doseme'] },
  { id: /** @type {SshCategoryId} */ ('color'), keys: ['renk', 'color', 'ton', 'lake'] },
  { id: /** @type {SshCategoryId} */ ('damage'), keys: ['hasar', 'kırık', 'kirik', 'çizik', 'cizik', 'ezik', 'darbe'] },
  { id: /** @type {SshCategoryId} */ ('production'), keys: ['üretim', 'uretim', 'fabrika', 'imalat', 'ölçü', 'olcu', 'montaj hatası'] },
  { id: /** @type {SshCategoryId} */ ('service'), keys: ['servis', 'ssh', 'garanti', 'bakım', 'bakim', 'talep'] },
]

/**
 * @param {string} text
 * @returns {SshCategoryId}
 */
export function resolveSshCategory(text) {
  const q = text.toLocaleLowerCase('tr-TR')
  for (const rule of CATEGORY_RULES) {
    if (rule.keys.some((k) => q.includes(k))) return rule.id
  }
  return 'missing'
}

/**
 * @param {SshCategoryId} id
 */
export function sshCategoryLabel(id) {
  return SSH_PANEL_CATEGORIES.find((c) => c.id === id)?.label ?? 'Eksik Parça'
}

/**
 * @param {MissingItemDto} item
 * @param {string} todayIso
 */
function isCriticalMissingItem(item, todayIso) {
  const wire = missingItemStatusOrOpen(item.status)
  if (isMissingItemResolvedStatus(wire)) return false
  const arrival = estimateMissingItemArrivalLabel(item, todayIso)
  if (arrival && arrival < todayIso) return true
  const note = `${item.reason ?? ''} ${item.supplierNote ?? ''}`.toLocaleLowerCase('tr-TR')
  return note.includes('kritik') || note.includes('acil')
}

/**
 * @param {MissingItemStatus} wire
 * @param {boolean} critical
 */
function missingWireToTone(wire, critical) {
  if (critical && wire !== MISSING_ITEM_STATUS.RESOLVED) return /** @type {SshRowTone} */ ('critical')
  if (wire === MISSING_ITEM_STATUS.READY_FOR_SHIPMENT) return /** @type {SshRowTone} */ ('done')
  if (wire === MISSING_ITEM_STATUS.RESOLVED) return /** @type {SshRowTone} */ ('done')
  if (wire === MISSING_ITEM_STATUS.ARRIVED) return /** @type {SshRowTone} */ ('progress')
  return /** @type {SshRowTone} */ ('waiting')
}

/**
 * @param {SshRowTone} tone
 */
export function sshToneToStatusLabel(tone) {
  switch (tone) {
    case 'critical':
      return 'Kritik'
    case 'waiting':
      return 'Bekliyor'
    case 'progress':
      return 'İşlemde'
    case 'done':
      return 'Tamamlandı'
    default:
      return 'Bekliyor'
  }
}

/**
 * @param {string} status
 */
function caseStatusToTone(status) {
  const s = String(status ?? '').toUpperCase()
  if (s === 'RESOLVED' || s === 'CLOSED') return /** @type {SshRowTone} */ ('done')
  if (s === 'IN_PROGRESS' || s === 'ASSIGNED') return /** @type {SshRowTone} */ ('progress')
  if (s === 'WAITING' || s === 'OPEN') return /** @type {SshRowTone} */ ('waiting')
  return /** @type {SshRowTone} */ ('waiting')
}

/**
 * @param {OperationCaseDto} c
 */
function isCriticalCase(c) {
  return c.priority === 'P1' && !['RESOLVED', 'CLOSED'].includes(c.status)
}

/**
 * @param {MissingItemDto[]} items
 * @param {DomainEventDto[]} events
 * @param {string} itemId
 */
function resolveLastTouchForItem(items, events, itemId) {
  const item = items.find((m) => m.id === itemId)
  let best = item?.resolvedAt ?? item?.createdAt ?? null
  for (const e of events) {
    if (e.payload?.missingItemId !== itemId) continue
    if (!best || e.occurredAt > best) best = e.occurredAt
  }
  return best
}

/**
 * @param {OperationCaseDto[]} cases
 */
function resolveLastCaseTouch(cases) {
  let best = null
  for (const c of cases) {
    const cand = c.updatedAt ?? c.createdAt
    if (!best || cand > best) best = cand
  }
  return best
}

/** @typedef {'fresh' | 'warn' | 'stale' | 'muted'} OpenDaysTone */

/**
 * @typedef {Object} OrderPanelSshRow
 * @property {string} id
 * @property {'missing' | 'case'} source
 * @property {SshCategoryId} categoryId
 * @property {string} categoryLabel
 * @property {string} title
 * @property {string} quantityLabel
 * @property {string} statusLabel
 * @property {SshRowTone} statusTone
 * @property {string} openedAtLabel
 * @property {number} openDays
 * @property {OpenDaysTone} openDaysTone
 * @property {string} lastTouchLabel
 * @property {string} noteLabel
 * @property {boolean} isOpen
 * @property {MissingItemDto} [missingItem]
 * @property {OperationCaseDto} [operationCase]
 */

/**
 * @param {string} startIso
 * @param {string} endIso
 */
export function computeDaysBetween(startIso, endIso) {
  const start = new Date(`${startIso.slice(0, 10)}T12:00:00`)
  const end = new Date(`${endIso.slice(0, 10)}T12:00:00`)
  const diff = Math.round((end.getTime() - start.getTime()) / 86_400_000)
  return Math.max(0, diff)
}

/**
 * @param {number} days
 * @param {boolean} isOpen
 * @returns {OpenDaysTone}
 */
export function resolveOpenDaysTone(days, isOpen) {
  if (!isOpen) return 'muted'
  if (days <= 7) return 'fresh'
  if (days <= 14) return 'warn'
  return 'stale'
}

/**
 * @param {string} createdAt
 * @param {string | null | undefined} closedAt
 * @param {boolean} isOpen
 * @param {string} todayIso
 */
function buildOpenDaysFields(createdAt, closedAt, isOpen, todayIso) {
  const openedIso = createdAt?.slice(0, 10) ?? todayIso
  const endIso = isOpen ? todayIso : closedAt?.slice(0, 10) ?? todayIso
  const openDays = computeDaysBetween(openedIso, endIso)
  return {
    openedAtLabel: formatShortDate(openedIso),
    openDays,
    openDaysTone: resolveOpenDaysTone(openDays, isOpen),
  }
}

/**
 * @param {{
 *   items: MissingItemDto[]
 *   cases: OperationCaseDto[]
 *   order: Order
 *   listItemDto?: SalesOrderListItemDto
 *   domainEvents: DomainEventDto[]
 *   todayIso: string
 * }} input
 */
export function buildOrderPanelSshRows({ items, cases, order, listItemDto, domainEvents, todayIso }) {
  const orderEvents = domainEvents.filter((e) => e.aggregateId === order.id)
  /** @type {OrderPanelSshRow[]} */
  const rows = []

  for (const item of items) {
    const wire = missingItemStatusOrOpen(item.status)
    const card = buildSshMissingPartCard(item, order, listItemDto, todayIso)
    const categoryId = resolveSshCategory(`${item.title} ${item.reason}`)
    const critical = isCriticalMissingItem(item, todayIso)
    const tone = missingWireToTone(wire, critical)
    const touch = resolveLastTouchForItem(items, orderEvents, item.id)
    const isOpen = isMissingItemBlockingShipment(wire)
    const openFields = buildOpenDaysFields(item.createdAt, item.resolvedAt, isOpen, todayIso)
    rows.push({
      id: item.id,
      source: 'missing',
      categoryId,
      categoryLabel: sshCategoryLabel(categoryId),
      title: item.title,
      quantityLabel: card.quantityLabel,
      statusLabel: critical && isMissingItemBlockingShipment(wire)
        ? 'Kritik'
        : sshMissingItemStatusLabelTr(wire),
      statusTone: tone,
      ...openFields,
      lastTouchLabel: touch ? formatShortDate(touch.slice(0, 10)) : '—',
      noteLabel: item.supplierNote?.trim() || item.reason?.trim() || '—',
      isOpen,
      missingItem: item,
    })
  }

  for (const c of cases) {
    const critical = isCriticalCase(c)
    const tone = critical ? /** @type {SshRowTone} */ ('critical') : caseStatusToTone(c.status)
    const isOpen = !['RESOLVED', 'CLOSED'].includes(c.status)
    const openFields = buildOpenDaysFields(c.createdAt, c.closedAt, isOpen, todayIso)
    rows.push({
      id: c.id,
      source: 'case',
      categoryId: 'service',
      categoryLabel: 'Servis Talebi',
      title: c.title,
      quantityLabel: `${c.actionCount} görev`,
      statusLabel: critical ? 'Kritik' : sshToneToStatusLabel(tone),
      statusTone: tone,
      ...openFields,
      lastTouchLabel: formatShortDate((c.updatedAt ?? c.createdAt).slice(0, 10)),
      noteLabel: c.description,
      isOpen,
      operationCase: c,
    })
  }

  return rows.sort((a, b) => {
    if (a.isOpen !== b.isOpen) return a.isOpen ? -1 : 1
    if (a.statusTone === 'critical' && b.statusTone !== 'critical') return -1
    if (b.statusTone === 'critical' && a.statusTone !== 'critical') return 1
    return a.title.localeCompare(b.title, 'tr')
  })
}

/**
 * @param {OrderPanelSshRow[]} rows
 * @param {MissingItemDto[]} items
 * @param {OperationCaseDto[]} cases
 */
export function buildOrderPanelSshSummary(rows, items, cases) {
  const openMissing = items.filter((m) => !isMissingItemResolvedStatus(missingItemStatusOrOpen(m.status))).length
  const openCases = cases.filter((c) => !['RESOLVED', 'CLOSED'].includes(c.status)).length
  const openServiceRows = rows.filter((r) => r.isOpen && r.categoryId !== 'missing').length
  const openSsh = openCases + openServiceRows
  const critical = rows.filter((r) => r.isOpen && r.statusTone === 'critical').length
  const completed = rows.filter((r) => !r.isOpen).length

  return [
    {
      id: 'ssh',
      label: 'Açık SSH',
      value: String(openSsh),
      cardTone: openSsh > 0 ? /** @type {const} */ ('warning') : /** @type {const} */ ('neutral'),
    },
    {
      id: 'missing',
      label: 'Açık Eksik Parça',
      value: String(openMissing),
      cardTone: openMissing > 0 ? /** @type {const} */ ('warning') : /** @type {const} */ ('neutral'),
    },
    {
      id: 'critical',
      label: 'Kritik Kayıt',
      value: String(critical),
      cardTone: critical > 0 ? /** @type {const} */ ('critical') : /** @type {const} */ ('neutral'),
    },
    {
      id: 'completed',
      label: 'Tamamlanan Kayıt',
      value: String(completed),
      cardTone: completed > 0 ? /** @type {const} */ ('success') : /** @type {const} */ ('neutral'),
    },
  ]
}

/**
 * @param {OrderPanelSshRow[]} rows
 * @param {SshCategoryId | 'all'} filterId
 */
export function filterOrderPanelSshRows(rows, filterId) {
  if (filterId === 'all') return rows
  return rows.filter((r) => r.categoryId === filterId)
}

/**
 * @param {DomainEventDto[]} events
 * @param {string} orderId
 */
export function resolveSshLastEventLabel(events, orderId) {
  const types = new Set([
    DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED,
    DOMAIN_EVENT_TYPE.MISSING_ITEM_ORDERED,
    DOMAIN_EVENT_TYPE.MISSING_ITEM_ARRIVED,
    DOMAIN_EVENT_TYPE.MISSING_ITEM_READY_FOR_SHIPMENT,
    DOMAIN_EVENT_TYPE.MISSING_ITEM_RESOLVED,
  ])
  const hit = events
    .filter((e) => e.aggregateId === orderId && types.has(e.type))
    .sort((a, b) => (a.occurredAt < b.occurredAt ? 1 : -1))[0]
  return hit ? formatShortDate(hit.occurredAt.slice(0, 10)) : null
}
