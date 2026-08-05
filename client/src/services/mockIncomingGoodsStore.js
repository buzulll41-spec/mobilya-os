/** @typedef {import('../contracts/v1/incomingGoods.js').IncomingGoodsRecordDto} IncomingGoodsRecordDto */

/** @type {IncomingGoodsRecordDto[]} */
let memoryRecords = []

export function resetMockIncomingGoodsStore() {
  memoryRecords = []
}

/**
 * @param {IncomingGoodsRecordDto[]} rows
 */
export function hydrateIncomingGoodsStore(rows) {
  memoryRecords = rows.map((r) => ({ ...r }))
}

/**
 * @param {IncomingGoodsRecordDto} row
 */
export function appendIncomingGoodsRecord(row) {
  memoryRecords = [{ ...row }, ...memoryRecords]
}

/**
 * @param {{ receivedAt?: string, purpose?: string, supplierId?: string }} [query]
 */
export function listIncomingGoodsFromStore(query = {}) {
  let rows = memoryRecords.map((r) => ({ ...r }))
  if (query.receivedAt) rows = rows.filter((r) => r.receivedAt === query.receivedAt)
  if (query.purpose) rows = rows.filter((r) => r.purpose === query.purpose)
  if (query.supplierId) rows = rows.filter((r) => r.supplierId === query.supplierId)
  return rows.sort((a, b) => {
    const d = b.receivedAt.localeCompare(a.receivedAt)
    if (d !== 0) return d
    return b.createdAt.localeCompare(a.createdAt)
  })
}
