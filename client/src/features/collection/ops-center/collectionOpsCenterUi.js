import { formatTry } from '../../../data/dashboardHelpers.js'
import {
  computeCollectionKpis,
  filterCollectionRows,
  isCollectionOverdue,
  isPreShipmentCollection,
  pickPriorityCallRows,
  sortCollectionByRisk,
} from '../../../mappers/collection/collectionCommandCenterModel.js'
import { isTerminOverdue, remainingBalance } from '../../../utils/orderFinance.js'
import { formatShortDate } from '../../../utils/dates.js'
import { buildCollectionSuggestedAction } from '../collectionSuggestedActionUi.js'
import { buildLastContactNote } from '../collectionErpTableUi.js'
import { buildTodayOpsTasks } from '../collectionOpsTasksUi.js'
import { buildPriorityActions } from '../collectionPriorityActionsUi.js'

/** @typedef {import('../../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../../../mappers/collection/collectionCommandCenterModel.js').CollectionCardModel} CollectionCardModel */
/** @typedef {import('../../../mappers/collection/collectionCommandCenterModel.js').CollectionFilterId} CollectionFilterId */

/** @typedef {'all' | 'due-week' | 'due-overdue' | 'ship-soon'} OpsDateFilterId */

/**
 * @typedef {Object} OpsFilterOption
 * @property {string} id
 * @property {string} label
 * @property {CollectionFilterId} filterId
 */

/**
 * @typedef {Object} OpsDateFilterOption
 * @property {OpsDateFilterId} id
 * @property {string} label
 */

/**
 * @typedef {Object} OpsRightPanelItem
 * @property {string} id
 * @property {string} title
 * @property {string} meta
 * @property {CollectionRowVM} row
 */

/**
 * @typedef {Object} OpsRightPanelSection
 * @property {string} id
 * @property {string} title
 * @property {OpsRightPanelItem[]} items
 */

/**
 * @typedef {Object} OpsCollectionTarget
 * @property {string} amountLabel
 * @property {string} detail
 * @property {number} fileCount
 */

export const OPS_QUICK_FILTERS = /** @type {const} */ ([
  { id: 'all', label: 'Tüm açık', filterId: 'all' },
  { id: 'partial', label: 'Kısmi ödeme', filterId: 'partial' },
  { id: 'none', label: 'Hiç ödeme yok', filterId: 'none' },
])

export const OPS_APPROVAL_FILTERS = /** @type {const} */ ([
  { id: 'pending-approval', label: 'Onay Bekleyenler', filterId: 'pending-approval' },
  { id: 'approved-payments', label: 'Onaylananlar', filterId: 'approved-payments' },
  { id: 'rejected-payments', label: 'Reddedilenler', filterId: 'rejected-payments' },
])

export const OPS_MAIL_ORDER_FILTERS = /** @type {const} */ ([
  { id: 'mail-order', label: 'Mail Order tahsilatları', filterId: 'mail-order' },
])

export const OPS_RISK_FILTERS = /** @type {const} */ ([
  { id: 'critical', label: 'Kritik dosya', filterId: 'critical' },
  { id: 'overdue', label: 'Gecikmiş', filterId: 'overdue' },
  { id: 'delivered-open', label: 'Teslim · bakiye', filterId: 'delivered-open' },
  { id: 'pre-shipment', label: 'Sevk öncesi', filterId: 'pre-shipment' },
])

export const OPS_DATE_FILTERS = /** @type {const} */ ([
  { id: 'all', label: 'Tüm tarihler' },
  { id: 'due-week', label: 'Bu hafta vade' },
  { id: 'due-overdue', label: 'Vadesi geçmiş' },
  { id: 'ship-soon', label: 'Sevk 14 gün içinde' },
])

/**
 * @param {CollectionRowVM[]} rows
 * @param {OpsDateFilterId} dateFilterId
 * @param {string} todayIso
 */
export function applyOpsDateFilter(rows, dateFilterId, todayIso) {
  if (dateFilterId === 'all') return rows

  const todayMs = Date.parse(`${todayIso}T12:00:00`)
  const weekEndMs = todayMs + 7 * 86_400_000

  return rows.filter((row) => {
    if (dateFilterId === 'due-overdue') {
      return isTerminOverdue(row, todayIso) || Boolean(row.hasOverdueBalance)
    }
    if (dateFilterId === 'due-week') {
      if (!row.dueDate) return false
      const dueMs = Date.parse(`${row.dueDate}T12:00:00`)
      return dueMs >= todayMs && dueMs <= weekEndMs
    }
    if (dateFilterId === 'ship-soon') {
      return isPreShipmentCollection(row, todayIso)
    }
    return true
  })
}

/**
 * @param {CollectionRowVM[]} openRows
 * @param {string} todayIso
 * @returns {OpsCollectionTarget}
 */
export function buildCollectionTarget(openRows, todayIso) {
  const priorityCards = pickPriorityCallRows(openRows, todayIso)
  const targetAmount = priorityCards.reduce((sum, card) => sum + card.remaining, 0)
  return {
    amountLabel: formatTry(targetAmount),
    detail: `Öncelikli ${priorityCards.length} dosya`,
    fileCount: priorityCards.length,
  }
}

/**
 * @param {CollectionRowVM} row
 */
function hasPhone(row) {
  return Boolean(row.phone?.trim() || row.phone2?.trim())
}

/**
 * @param {CollectionCardModel} card
 * @param {string} todayIso
 */
function isMeetingPlanCard(card, todayIso) {
  const suggested = buildCollectionSuggestedAction(card, todayIso)
  return (
    suggested.title.toLowerCase().includes('görüşme') ||
    isCollectionOverdue(card.row, todayIso)
  )
}

/**
 * @param {CollectionRowVM[]} openRows
 * @param {string} todayIso
 * @returns {OpsRightPanelSection[]}
 */
export function buildOpsRightPanel(openRows, todayIso) {
  const sortedCards = sortCollectionByRisk(openRows, todayIso)

  /** @param {CollectionCardModel[]} cards @param {(card: CollectionCardModel) => string} metaFn */
  const toItems = (cards, metaFn) =>
    cards.map((card) => ({
      id: card.row.id,
      title: card.row.customer,
      meta: metaFn(card),
      row: card.row,
    }))

  const priorityCards = pickPriorityCallRows(openRows, todayIso, 6)
  const callItems = toItems(priorityCards, (c) => `${c.orderNo} · ${formatTry(c.remaining)}`)

  const meetingCards = sortedCards.filter((c) => isMeetingPlanCard(c, todayIso)).slice(0, 6)
  const meetingItems = toItems(meetingCards, (c) => c.riskLabel)

  const whatsappCards = sortedCards.filter((c) => hasPhone(c.row)).slice(0, 6)
  const whatsappItems = toItems(whatsappCards, (c) => c.orderNo)

  const overdueCards = sortedCards
    .filter((c) => isCollectionOverdue(c.row, todayIso))
    .slice(0, 6)
  const overdueItems = toItems(overdueCards, (c) => formatTry(c.remaining))

  const todayTasks = buildTodayOpsTasks(openRows, todayIso).map((task) => ({
    id: task.id,
    title: task.label,
    meta: 'Bugün',
    row: priorityCards[0]?.row ?? openRows[0],
  }))

  return [
    { id: 'today', title: 'Bugünkü işler', items: todayTasks.slice(0, 6) },
    { id: 'calls', title: 'Aranacak müşteriler', items: callItems },
    { id: 'meetings', title: 'Görüşme planları', items: meetingItems },
    { id: 'whatsapp', title: 'WhatsApp gönderilecekler', items: whatsappItems },
    { id: 'overdue', title: 'Gecikmiş tahsilatlar', items: overdueItems },
  ]
}

/**
 * @param {CollectionCardModel | null} card
 * @param {string} todayIso
 */
export function buildOpsCustomerCardModel(card, todayIso) {
  if (!card) return null
  const { row } = card
  const dueDateLabel = row.dueDate
    ? formatShortDate(row.dueDate)
    : row.shipmentDate
      ? formatShortDate(row.shipmentDate)
      : '—'
  const suggested = buildCollectionSuggestedAction(card, todayIso)
  const lastNote = buildLastContactNote(card, todayIso)
  const productLine = row.product?.trim()

  return {
    card,
    customer: row.customer,
    phone: row.phone?.trim() || row.phone2?.trim() || null,
    orderDate: formatShortDate(row.orderDate),
    dueDateLabel,
    totalLabel: formatTry(row.amount ?? 0),
    collectedLabel: formatTry(card.collected),
    remainingLabel: formatTry(card.remaining),
    lastNote,
    riskReason: card.riskLabel,
    orderNo: card.orderNo,
  }
}

const APPROVAL_FILTERS = /** @type {const} */ (['pending-approval', 'approved-payments', 'rejected-payments', 'mail-order'])

/**
 * @param {CollectionFilterId} filterId
 */
function isApprovalCollectionFilter(filterId) {
  return APPROVAL_FILTERS.includes(filterId)
}

/**
 * @param {CollectionRowVM[]} rows
 * @param {CollectionFilterId} filterId
 * @param {OpsDateFilterId} dateFilterId
 * @param {string} todayIso
 * @param {Map<string, import('../../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto>} [dtoById]
 * @param {{ mailOrderSupplierId?: string, paymentsByOrderId?: Map<string, import('../../../contracts/v1/payment.js').PaymentTransactionDto[]> }} [filterOptions]
 */
export function buildOpsCenterView(rows, filterId, dateFilterId, todayIso, dtoById = new Map(), filterOptions = {}) {
  const openRows = rows.filter((row) => remainingBalance(row) > 0.009)
  const filterSource = isApprovalCollectionFilter(filterId) ? rows : openRows
  const filtered = applyOpsDateFilter(
    filterCollectionRows(filterSource, filterId, todayIso, dtoById, filterOptions),
    dateFilterId,
    todayIso,
  )
  const cards = sortCollectionByRisk(filtered, todayIso)
  const kpis = computeCollectionKpis(openRows, todayIso)
  const target = buildCollectionTarget(openRows, todayIso)
  const rightPanel = buildOpsRightPanel(openRows, todayIso)
  const priorityActions = buildPriorityActions(openRows, todayIso, 5)

  return {
    kpis,
    cards,
    openCount: openRows.length,
    filteredCount: filtered.length,
    target,
    rightPanel,
    priorityActions,
  }
}

/**
 * @param {CollectionRowVM[]} openRows
 * @param {string} todayIso
 * @param {Map<string, import('../../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto>} [dtoById]
 */
export function countByFilter(openRows, filterId, todayIso, dtoById = new Map(), filterOptions = {}) {
  return filterCollectionRows(openRows, filterId, todayIso, dtoById, filterOptions).length
}
