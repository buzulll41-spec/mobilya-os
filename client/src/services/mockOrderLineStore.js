/**
 * @typedef {{
 *   id: string
 *   salesOrderId: string
 *   qtyOrdered: string
 *   qtyReceived?: string
 *   title?: string
 *   productId?: string
 *   unitPrice?: number
 *   lineTotal?: number
 *   productTitleSnapshot?: string
 *   productGroup?: string
 *   productGroupSnapshot?: string
 *   lineNote?: string
 *   supplierId?: string
 *   supplierNameSnapshot?: string
 *   supplyStatus?: string
 *   supplyChannel?: string | null
 *   supplySentAt?: string | null
 *   supplySentByUserId?: string | null
 *   supplySentByName?: string | null
 *   warehouseEntryStatus?: string
 *   shipmentReady?: boolean
 *   configuration?: Record<string, string>
 *   configurationSummary?: string[]
 * }} OrderLineSeed
 */

/** @type {Map<string, OrderLineSeed[]>} */
let memoryOrderLines = new Map()

/**
 * @param {string} salesOrderId
 * @param {OrderLineSeed[]} rows
 */
export function setOrderLinesForSalesOrder(salesOrderId, rows) {
  if (!rows.length) {
    throw new Error('Order must have at least one order line')
  }
  memoryOrderLines.set(
    salesOrderId,
    rows.map((r) => ({
      id: r.id,
      salesOrderId,
      qtyOrdered: r.qtyOrdered,
      qtyReceived: r.qtyReceived ?? '0',
      supplyStatus: r.supplyStatus ?? 'NOT_SENT',
      warehouseEntryStatus: r.warehouseEntryStatus ?? 'NOT_SENT',
      shipmentReady: r.shipmentReady ?? false,
      ...(r.supplyChannel ? { supplyChannel: r.supplyChannel } : {}),
      ...(r.title ? { title: r.title } : {}),
      ...(r.productId ? { productId: r.productId } : {}),
      ...(typeof r.unitPrice === 'number' ? { unitPrice: r.unitPrice } : {}),
      ...(typeof r.lineTotal === 'number' ? { lineTotal: r.lineTotal } : {}),
      ...(r.productTitleSnapshot ? { productTitleSnapshot: r.productTitleSnapshot } : {}),
      ...(r.productGroup ? { productGroup: r.productGroup } : {}),
      ...(r.productGroupSnapshot ? { productGroupSnapshot: r.productGroupSnapshot } : {}),
      ...(r.supplierId ? { supplierId: r.supplierId } : {}),
      ...(r.supplierNameSnapshot ? { supplierNameSnapshot: r.supplierNameSnapshot } : {}),
      ...(r.lineNote ? { lineNote: r.lineNote } : {}),
      ...(r.configuration && Object.keys(r.configuration).length
        ? { configuration: { ...r.configuration } }
        : {}),
    })),
  )
}

/**
 * @param {string} salesOrderId
 * @returns {OrderLineSeed[]}
 */
export function getOrderLinesForSalesOrder(salesOrderId) {
  const rows = memoryOrderLines.get(salesOrderId)
  if (!rows) return []
  return rows.map((r) => ({ ...r }))
}

/**
 * @param {string} salesOrderId
 */
export function hasOrderLinesInStore(salesOrderId) {
  return memoryOrderLines.has(salesOrderId)
}

export function resetMockOrderLineStore() {
  memoryOrderLines = new Map()
}

/**
 * @param {Record<string, OrderLineSeed[]>} snapshot
 */
export function hydrateOrderLineStore(snapshot) {
  memoryOrderLines = new Map()
  for (const [orderId, rows] of Object.entries(snapshot)) {
    if (Array.isArray(rows) && rows.length) {
      memoryOrderLines.set(orderId, rows.map((r) => ({ ...r, salesOrderId: orderId })))
    }
  }
}

/** @returns {Record<string, OrderLineSeed[]>} */
export function getAllOrderLinesSnapshot() {
  /** @type {Record<string, OrderLineSeed[]>} */
  const out = {}
  for (const [id, rows] of memoryOrderLines.entries()) {
    out[id] = rows.map((r) => ({ ...r }))
  }
  return out
}

/**
 * @param {string} orderLineId
 * @param {number} addQty
 */
export function addQtyReceivedForOrderLine(orderLineId, addQty) {
  for (const [orderId, rows] of memoryOrderLines.entries()) {
    const idx = rows.findIndex((r) => r.id === orderLineId)
    if (idx === -1) continue
    const row = rows[idx]
    const ordered = Number.parseFloat(row.qtyOrdered)
    const received = Number.parseFloat(row.qtyReceived ?? '0')
    const pending = ordered - received
    if (addQty > pending + 0.0001) {
      throw new Error(`Gelen adet bekleyen miktarı (${pending.toFixed(2)}) aşamaz`)
    }
    const next = received + addQty
    const supplyStatus = row.supplyStatus ?? 'NOT_SENT'
    if (supplyStatus !== 'SENT') {
      throw new Error('Tedarik emri verilmeden depo girişi yapılamaz')
    }
    let warehouseEntryStatus = 'WAITING'
    if (next >= ordered - 0.0001) warehouseEntryStatus = 'ARRIVED'
    else if (next > 0.0001) warehouseEntryStatus = 'PARTIAL_ARRIVED'
    rows[idx] = {
      ...row,
      qtyReceived: next.toFixed(2),
      warehouseEntryStatus,
      shipmentReady: false,
    }
    memoryOrderLines.set(orderId, rows)
    return { orderId, line: rows[idx] }
  }
  throw new Error('Sipariş kalemi bulunamadı')
}

/**
 * @param {string} orderId
 * @param {string[]} lineIds
 * @param {'MAIL' | 'WHATSAPP'} channel
 * @param {{ id?: string, fullName?: string }} [user]
 */
export function confirmSupplySentForOrderLines(orderId, lineIds, channel, user) {
  const rows = memoryOrderLines.get(orderId)
  if (!rows) throw new Error('Sipariş bulunamadı')
  const now = new Date().toISOString()
  const ids = new Set(lineIds)
  let updated = 0
  const next = rows.map((row) => {
    if (!ids.has(row.id)) return row
    if (row.supplyStatus === 'SENT') {
      throw new Error(`${row.title ?? row.id} zaten tedarik verilmiş`)
    }
    updated += 1
    return {
      ...row,
      supplyStatus: 'SENT',
      supplyChannel: channel,
      supplySentAt: now,
      supplySentByUserId: user?.id ?? null,
      supplySentByName: user?.fullName ?? null,
      warehouseEntryStatus: 'WAITING',
      shipmentReady: false,
    }
  })
  memoryOrderLines.set(orderId, next)
  return { updatedCount: updated, lineIds: [...ids] }
}

/**
 * @param {string} orderId
 * @param {string} lineId
 */
export function revertWarehouseArrivalForOrderLine(orderId, lineId) {
  const rows = memoryOrderLines.get(orderId)
  if (!rows) throw new Error('Sipariş bulunamadı')
  const idx = rows.findIndex((r) => r.id === lineId)
  if (idx === -1) throw new Error('Sipariş kalemi bulunamadı')
  const row = rows[idx]
  if ((row.supplyStatus ?? 'NOT_SENT') !== 'SENT') {
    throw new Error('Tedarik verilmeden depo girişi geri alınamaz')
  }
  const received = Number.parseFloat(row.qtyReceived ?? '0')
  if (received <= 0.0001) throw new Error('Geri alınacak depo girişi yok')
  rows[idx] = {
    ...row,
    qtyReceived: '0',
    warehouseEntryStatus: 'WAITING',
    shipmentReady: false,
  }
  memoryOrderLines.set(orderId, rows)
  return { orderLineId: lineId }
}

/**
 * @param {string} orderId
 * @param {string} lineId
 */
export function markShipmentReadyForOrderLine(orderId, lineId) {
  const rows = memoryOrderLines.get(orderId)
  if (!rows) throw new Error('Sipariş bulunamadı')
  const idx = rows.findIndex((r) => r.id === lineId)
  if (idx === -1) throw new Error('Sipariş kalemi bulunamadı')
  const row = rows[idx]
  if ((row.supplyStatus ?? 'NOT_SENT') !== 'SENT') {
    throw new Error('Tedarik verilmeden sevke hazır işaretlenemez')
  }
  if ((row.warehouseEntryStatus ?? 'NOT_SENT') !== 'ARRIVED') {
    throw new Error('Depo girişi Geldi olmadan sevke hazır işaretlenemez')
  }
  rows[idx] = { ...row, shipmentReady: true }
  memoryOrderLines.set(orderId, rows)
  return { orderLineId: lineId }
}

/**
 * @param {string} orderId
 * @param {string} lineId
 */
export function revertShipmentReadyForOrderLine(orderId, lineId) {
  const rows = memoryOrderLines.get(orderId)
  if (!rows) throw new Error('Sipariş bulunamadı')
  const idx = rows.findIndex((r) => r.id === lineId)
  if (idx === -1) throw new Error('Sipariş kalemi bulunamadı')
  const row = rows[idx]
  if (!row.shipmentReady) throw new Error('Sevke hazır işareti yok')
  rows[idx] = { ...row, shipmentReady: false }
  memoryOrderLines.set(orderId, rows)
  return { orderLineId: lineId }
}

/**
 * @param {string} orderId
 * @param {string} lineId
 */
export function revertSupplySentForOrderLine(orderId, lineId) {
  const rows = memoryOrderLines.get(orderId)
  if (!rows) throw new Error('Sipariş bulunamadı')
  const idx = rows.findIndex((r) => r.id === lineId)
  if (idx === -1) throw new Error('Sipariş kalemi bulunamadı')
  const row = rows[idx]
  if ((row.supplyStatus ?? 'NOT_SENT') !== 'SENT') {
    throw new Error('Tedarik zaten verilmemiş')
  }
  const received = Number.parseFloat(row.qtyReceived ?? '0')
  if (received > 0.0001) {
    throw new Error('Tedarik geri almak için önce depo girişini geri alın')
  }
  rows[idx] = {
    ...row,
    supplyStatus: 'NOT_SENT',
    supplyChannel: undefined,
    supplySentAt: null,
    supplySentByUserId: null,
    supplySentByName: null,
    warehouseEntryStatus: 'NOT_SENT',
    qtyReceived: '0',
    shipmentReady: false,
  }
  memoryOrderLines.set(orderId, rows)
  return { orderLineId: lineId }
}

/**
 * @param {string} orderId
 * @param {string} lineId
 */
export function reconcileSupplyStateForOrderLine(orderId, lineId) {
  const rows = memoryOrderLines.get(orderId)
  if (!rows) throw new Error('Sipariş bulunamadı')
  const idx = rows.findIndex((r) => r.id === lineId)
  if (idx === -1) throw new Error('Sipariş kalemi bulunamadı')
  const row = rows[idx]
  if ((row.supplyStatus ?? 'NOT_SENT') !== 'SENT') {
    rows[idx] = {
      ...row,
      supplyStatus: 'NOT_SENT',
      warehouseEntryStatus: 'NOT_SENT',
      qtyReceived: '0',
      shipmentReady: false,
      supplyChannel: undefined,
      supplySentAt: null,
      supplySentByUserId: null,
      supplySentByName: null,
    }
    memoryOrderLines.set(orderId, rows)
    return { orderLineId: lineId, corrected: true }
  }
  const ordered = Number.parseFloat(row.qtyOrdered)
  const received = Number.parseFloat(row.qtyReceived ?? '0')
  let warehouseEntryStatus = 'WAITING'
  if (received >= ordered - 0.0001) warehouseEntryStatus = 'ARRIVED'
  else if (received > 0.0001) warehouseEntryStatus = 'PARTIAL_ARRIVED'
  const shipmentReady = warehouseEntryStatus === 'ARRIVED' && Boolean(row.shipmentReady)
  rows[idx] = { ...row, warehouseEntryStatus, shipmentReady }
  memoryOrderLines.set(orderId, rows)
  return { orderLineId: lineId, corrected: true }
}

/**
 * @returns {OrderLineSeed[]}
 */
export function getAllOrderLinesFlat() {
  /** @type {OrderLineSeed[]} */
  const out = []
  for (const rows of memoryOrderLines.values()) {
    for (const r of rows) out.push({ ...r })
  }
  return out
}
