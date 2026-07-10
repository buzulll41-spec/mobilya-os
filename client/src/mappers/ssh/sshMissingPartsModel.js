import { addDays } from '../../data/constants.js'
import {
  MISSING_ITEM_STATUS,
  isMissingItemBlockingShipment,
  isMissingItemResolvedStatus,
} from '../../contracts/v1/missingItemStatuses.js'
import { missingItemStatusOrOpen } from '../missingItems/missingItemStatusLabel.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/missingItem.js').MissingItemDto} MissingItemDto */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/missingItemStatuses.js').MissingItemStatus} MissingItemStatus */

/**
 * @typedef {'waiting' | 'arrived' | 'ready' | 'resolved'} SshMissingUiStatus
 *
 * @typedef {{
 *   id: string
 *   orderId: string
 *   orderNumber: string
 *   customer: string
 *   partTitle: string
 *   quantityLabel: string
 *   estimatedArrivalLabel: string
 *   locksShipment: boolean
 *   statusLabel: string
 *   uiStatus: SshMissingUiStatus
 *   riskLabel: string
 *   responsibleNote: string
 *   openCountOnOrder: number
 *   wireStatus: MissingItemStatus
 *   headerSummary: string
 * }} SshMissingPartCard
 */

/**
 * @param {MissingItemStatus} status
 * @returns {SshMissingUiStatus}
 */
export function mapWireStatusToSshUi(status) {
  const s = missingItemStatusOrOpen(status)
  if (s === MISSING_ITEM_STATUS.READY_FOR_SHIPMENT) return 'ready'
  if (s === MISSING_ITEM_STATUS.RESOLVED) return 'resolved'
  if (s === MISSING_ITEM_STATUS.ARRIVED) return 'arrived'
  return 'waiting'
}

/**
 * @param {MissingItemStatus} status
 */
export function sshMissingItemStatusLabelTr(status) {
  const ui = mapWireStatusToSshUi(status)
  if (ui === 'ready') return 'Sevke hazır'
  if (ui === 'resolved') return 'Tamamlandı'
  if (ui === 'arrived') return 'Parça geldi'
  return 'Bekleniyor'
}

/**
 * @param {MissingItemDto} item
 * @param {string} [todayIso]
 */
export function estimateMissingItemArrivalLabel(item, todayIso = '2026-05-14') {
  const note = item.supplierNote?.toLowerCase() ?? ''
  const dayMatch = note.match(/(\d+)\s*iş\s*gün/)
  if (dayMatch) {
    const created = item.createdAt?.slice(0, 10) ?? todayIso
    return addDays(created, Number.parseInt(dayMatch[1], 10))
  }
  const created = item.createdAt?.slice(0, 10) ?? todayIso
  return addDays(created, 7)
}

/**
 * @param {string} fromIso
 * @param {string} toIso
 */
function openDaysBetween(fromIso, toIso) {
  if (!fromIso || !toIso) return 0
  const a = new Date(`${fromIso.slice(0, 10)}T12:00:00`)
  const b = new Date(`${toIso.slice(0, 10)}T12:00:00`)
  return Math.max(0, Math.round((b.getTime() - a.getTime()) / 86400000))
}

/**
 * @param {{
 *   categoryLabel: string
 *   priorityLabel: string
 *   openDays: number
 *   lastActionLabel: string
 * }} input
 */
function buildSshHeaderSummary({ categoryLabel, priorityLabel, openDays, lastActionLabel }) {
  const openLabel = openDays === 0 ? 'Bugün açıldı' : `${openDays} gün açık`
  return `${categoryLabel} · ${priorityLabel} · ${openLabel} · ${lastActionLabel}`
}

/**
 * @param {MissingItemDto} item
 * @param {Order | undefined} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 * @returns {SshMissingPartCard}
 */
export function buildSshMissingPartCard(item, order, dto, todayIso) {
  const wire = missingItemStatusOrOpen(item.status)
  const uiStatus = mapWireStatusToSshUi(wire)
  const open = isMissingItemBlockingShipment(wire)
  const arrivalIso = estimateMissingItemArrivalLabel(item, todayIso)
  const openDays = openDaysBetween(item.createdAt?.slice(0, 10) ?? todayIso, todayIso)
  const priorityLabel = open ? 'Kritik' : 'Normal'

  return {
    id: item.id,
    orderId: item.orderId,
    orderNumber: dto?.orderNumber ?? item.orderId,
    customer: order?.customer ?? dto?.customerDisplayName ?? item.orderId,
    partTitle: item.title,
    quantityLabel: `${item.quantity} adet`,
    estimatedArrivalLabel: formatArrivalLabel(arrivalIso, todayIso),
    locksShipment: open,
    statusLabel: sshMissingItemStatusLabelTr(wire),
    uiStatus,
    riskLabel: open ? 'Sevki kilitliyor' : 'Takip tamam',
    responsibleNote: item.supplierNote?.trim() || item.reason?.trim() || '—',
    openCountOnOrder: dto?.openMissingItemsCount ?? (open ? 1 : 0),
    wireStatus: wire,
    headerSummary: buildSshHeaderSummary({
      categoryLabel: item.title || 'Eksik parça',
      priorityLabel,
      openDays,
      lastActionLabel: sshMissingItemStatusLabelTr(wire),
    }),
  }
}

/**
 * @param {string} arrivalIso
 * @param {string} todayIso
 */
function formatArrivalLabel(arrivalIso, todayIso) {
  if (!arrivalIso) return '—'
  if (arrivalIso < todayIso) return 'Gecikmiş'
  const [, m, d] = arrivalIso.split('-').map(Number)
  const months = [
    'Ocak',
    'Şubat',
    'Mart',
    'Nisan',
    'Mayıs',
    'Haziran',
    'Temmuz',
    'Ağustos',
    'Eylül',
    'Ekim',
    'Kasım',
    'Aralık',
  ]
  return `${d} ${months[m - 1]}`
}

/**
 * @param {{
 *   orders: Order[]
 *   listItemDtos: SalesOrderListItemDto[]
 *   missingItems?: MissingItemDto[]
 *   todayIso: string
 * }} input
 * @returns {SshMissingPartCard[]}
 */
export function buildSshMissingPartsQueue({ orders, listItemDtos, missingItems, todayIso }) {
  const orderById = new Map(orders.map((o) => [o.id, o]))
  const dtoById = new Map(listItemDtos.map((d) => [d.id, d]))

  if (missingItems?.length) {
    return missingItems
      .filter((m) => m && isMissingItemBlockingShipment(missingItemStatusOrOpen(m.status)))
      .map((m) =>
        buildSshMissingPartCard(m, orderById.get(m.orderId), dtoById.get(m.orderId), todayIso),
      )
      .sort((a, b) => a.customer.localeCompare(b.customer, 'tr'))
  }

  /** @type {SshMissingPartCard[]} */
  const cards = []
  for (const dto of listItemDtos) {
    const open = dto.openMissingItemsCount ?? 0
    if (open <= 0) continue
    const order = orderById.get(dto.id)
    const categoryLabel =
      dto.lineSummaryTitle?.trim() ||
      order?.product?.trim() ||
      (open === 1 ? 'Eksik parça kaydı' : `${open} eksik parça`)
    const placedIso = dto.placedAt?.slice(0, 10) ?? dto.createdAt?.slice(0, 10) ?? todayIso
    const openDays = openDaysBetween(placedIso, todayIso)
    cards.push({
      id: `${dto.id}-ssh-proxy`,
      orderId: dto.id,
      orderNumber: dto.orderNumber ?? dto.id,
      customer: order?.customer ?? dto.customerDisplayName ?? dto.id,
      partTitle: categoryLabel,
      quantityLabel: open === 1 ? '1 kayıt' : `${open} kayıt`,
      estimatedArrivalLabel: '—',
      locksShipment: true,
      statusLabel: 'Bekleniyor',
      uiStatus: 'waiting',
      riskLabel: 'Sevki kilitliyor',
      responsibleNote: 'Detay için sipariş paneli',
      openCountOnOrder: open,
      wireStatus: MISSING_ITEM_STATUS.OPEN,
      headerSummary: buildSshHeaderSummary({
        categoryLabel,
        priorityLabel: 'Kritik',
        openDays,
        lastActionLabel: 'Bekleniyor',
      }),
    })
  }
  return cards.sort((a, b) => a.customer.localeCompare(b.customer, 'tr'))
}

/**
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function orderHasOpenMissingParts(dto) {
  return (dto?.openMissingItemsCount ?? 0) > 0
}

/**
 * @param {MissingItemDto[]} items
 */
export function summarizeSshMissingForOrder(items) {
  const open = items.filter((m) => isMissingItemBlockingShipment(missingItemStatusOrOpen(m.status)))
  return {
    openCount: open.length,
    locksShipment: open.length > 0,
    titles: open.map((m) => m.title).filter(Boolean),
  }
}
