import { MISSING_ITEM_STATUS } from '../contracts/v1/missingItemStatuses.js'

/** @typedef {import('../contracts/v1/missingItem.js').MissingItemDto} MissingItemDto */

/** @type {MissingItemDto[]} */
let items = [
  {
    id: 'OMI-S-24105-1',
    orderId: 'S-24105',
    lineId: null,
    title: 'Kulp seti (lake)',
    quantity: '6.00',
    reason: 'Fabrika paketinde yoktu',
    status: MISSING_ITEM_STATUS.OPEN,
    supplierNote: 'Tedarikçi 3 iş günü dedi',
    createdAt: '2026-05-09T09:30:00.000Z',
    resolvedAt: null,
  },
]

/**
 * @returns {MissingItemDto[]}
 */
export function getAllMissingItemsSnapshot() {
  return items.map((m) => ({ ...m }))
}

/**
 * @param {string} orderId
 * @returns {MissingItemDto[]}
 */
export function getMissingItemsForOrder(orderId) {
  return items.filter((m) => m.orderId === orderId).map((m) => ({ ...m }))
}

/**
 * @param {MissingItemDto} row
 */
export function upsertMissingItem(row) {
  const i = items.findIndex((m) => m.id === row.id)
  if (i === -1) items.push({ ...row })
  else items[i] = { ...row }
}

/**
 * @param {MissingItemDto[]} rows
 */
export function hydrateMissingItemStore(rows) {
  items = rows.map((m) => ({ ...m }))
}

export function resetMockMissingItemStore() {
  items = [
    {
      id: 'OMI-S-24105-1',
      orderId: 'S-24105',
      lineId: null,
      title: 'Kulp seti (lake)',
      quantity: '6.00',
      reason: 'Fabrika paketinde yoktu',
      status: MISSING_ITEM_STATUS.OPEN,
      supplierNote: 'Tedarikçi 3 iş günü dedi',
      createdAt: '2026-05-09T09:30:00.000Z',
      resolvedAt: null,
    },
  ]
}
