import { remainingBalance } from './orderFinance.js'

/** @typedef {'asc' | 'desc'} SortDirection */
/** @typedef {import('../contracts/v1/orderListRowVm.js').OrderListRowVM} OrderListRowVM */

/**
 * @typedef {Object} OrderListSortState
 * @property {string} column
 * @property {SortDirection} direction
 */

/** @type {OrderListSortState} */
export const DEFAULT_ORDER_LIST_SORT = {
  column: 'createdAt',
  direction: 'desc',
}

/** UI kolon anahtarları → sort alanı */
export const ORDER_LIST_SORTABLE_COLUMNS = {
  order: 'id',
  customer: 'customer',
  product: 'product',
  salesPerson: 'salesPerson',
  dueDate: 'dueDate',
  shipmentDate: 'shipmentDate',
  status: 'status',
  amount: 'amount',
  remaining: 'remaining',
}

/**
 * `S-{epochMs}` biçiminden oluşturulma anı (mock/API yeni siparişler).
 * @param {string} orderId
 * @returns {string | null}
 */
export function parseOrderIdTimestamp(orderId) {
  const m = /^S-(\d{12,})$/.exec(String(orderId))
  if (!m) return null
  const ms = Number(m[1])
  if (!Number.isFinite(ms) || ms < 1_000_000_000_000) return null
  return new Date(ms).toISOString()
}

/**
 * @param {OrderListRowVM} row
 * @returns {string}
 */
export function resolveOrderListCreatedAt(row) {
  if (typeof row.createdAt === 'string' && row.createdAt.length >= 10) return row.createdAt
  const fromId = parseOrderIdTimestamp(row.id)
  if (fromId) return fromId
  if (row.orderDate) return `${row.orderDate}T12:00:00.000Z`
  return ''
}

/**
 * @param {OrderListRowVM} row
 * @param {string} column
 */
function sortKey(row, column) {
  switch (column) {
    case 'createdAt':
      return resolveOrderListCreatedAt(row)
    case 'id':
      return row.orderNumber ?? row.id
    case 'customer':
      return row.customer ?? ''
    case 'product':
      return row.product ?? ''
    case 'salesPerson':
      return row.salesPerson ?? ''
    case 'dueDate':
      return row.dueDate ?? ''
    case 'shipmentDate':
      return row.shipmentDate ?? ''
    case 'status':
      return row.status ?? ''
    case 'amount':
      return row.amount ?? 0
    case 'remaining':
      return remainingBalance(row)
    default:
      return resolveOrderListCreatedAt(row)
  }
}

/** @param {string} column */
function isNumericColumn(column) {
  return column === 'amount' || column === 'remaining'
}

/** @param {string} column */
function isDateColumn(column) {
  return column === 'createdAt' || column === 'dueDate' || column === 'shipmentDate'
}

/**
 * @param {OrderListRowVM} a
 * @param {OrderListRowVM} b
 * @param {string} column
 * @param {SortDirection} direction
 */
export function compareOrderListRows(a, b, column, direction) {
  const mul = direction === 'asc' ? 1 : -1

  if (column === 'createdAt') {
    const cmp = resolveOrderListCreatedAt(a).localeCompare(resolveOrderListCreatedAt(b))
    if (cmp !== 0) return cmp * mul
    const orderDateCmp = (b.orderDate ?? '').localeCompare(a.orderDate ?? '')
    if (orderDateCmp !== 0) return orderDateCmp * mul
    return (b.orderNumber ?? b.id ?? '').localeCompare(a.orderNumber ?? a.id ?? '') * mul
  }

  const va = sortKey(a, column)
  const vb = sortKey(b, column)

  if (isNumericColumn(column)) {
    const diff = Number(va) - Number(vb)
    if (diff !== 0) return diff * mul
  } else if (isDateColumn(column)) {
    if (!va && !vb) return 0
    if (!va) return 1 * mul
    if (!vb) return -1 * mul
    const cmp = String(va).localeCompare(String(vb))
    if (cmp !== 0) return cmp * mul
  } else {
    const cmp = String(va).localeCompare(String(vb), 'tr', { sensitivity: 'base' })
    if (cmp !== 0) return cmp * mul
  }

  return compareOrderListRows(a, b, 'createdAt', 'desc')
}

/**
 * @param {OrderListRowVM[]} rows
 * @param {OrderListSortState} [sort]
 * @returns {OrderListRowVM[]}
 */
export function sortOrderListRows(rows, sort = DEFAULT_ORDER_LIST_SORT) {
  const column = sort?.column ?? DEFAULT_ORDER_LIST_SORT.column
  const direction = sort?.direction ?? DEFAULT_ORDER_LIST_SORT.direction
  return [...rows].sort((a, b) => compareOrderListRows(a, b, column, direction))
}
