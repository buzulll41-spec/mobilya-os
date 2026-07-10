import { canAccessPage } from '../../constants/roleAccess.js'
import {
  computeWarehouseEntryStatusFromQty,
  supplyStatusLabelTr,
  SUPPLY_STATUS,
  WAREHOUSE_ENTRY_STATUS,
  warehouseEntryStatusLabelTr,
} from '../../constants/supplyOrderStatus.js'
import {
  buildLineSupplySnapshot,
  detectOrderLineStateInconsistency,
  resolveEffectiveShipmentReady,
  resolveStageLabelFromSupplyState,
} from '../../lib/orderLineSupplyState.js'
import { orderQualifiesForAutoShipmentReady } from '../../lib/autoShipmentReady.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { CONFIG_PROFILES, formatConfigurationLines } from '../../constants/productConfigurationSchema.js'
import {
  computeLineReadiness,
  parseQty,
  PRODUCT_READINESS_STATUS,
  readinessStatusLabel,
} from '../receiving/productReadiness.js'

/** @typedef {import('../../services/ordersClient.js').OrderLineDetailDto} OrderLineDetailDto */
/** @typedef {import('../../contracts/v1/incomingGoods.js').OrderLineReceivingDto} OrderLineReceivingDto */
/** @typedef {import('../../contracts/v1/user.js').UserRole} UserRole */
/** @typedef {import('../receiving/productReadiness.js').ProductReadinessStatus} ProductReadinessStatus */

/** @typedef {'all' | 'ready' | 'production' | 'waiting' | 'missing' | 'arrived' | 'stock'} OrderPanelProductsFilterId */
/** @typedef {'title' | 'qty' | 'status' | 'arrival' | 'shipmentReady' | 'sale' | 'total' | 'supplier'} OrderPanelProductsSortKey */

/**
 * @typedef {Object} OrderPanelProductRow
 * @property {string} id
 * @property {string} title
 * @property {string} configHint
 * @property {number} qtyOrdered
 * @property {number} qtyReceived
 * @property {ProductReadinessStatus} readinessStatus
 * @property {string} statusLabel
 * @property {string} stageLabel
 * @property {string} arrivalLabel
 * @property {string} supplyStatus
 * @property {string} supplyStatusLabel
 * @property {'not-sent' | 'sent'} supplyTone
 * @property {string} warehouseEntryStatus
 * @property {string} warehouseEntryLabel
 * @property {'not-sent' | 'waiting' | 'arrived' | 'partial'} warehouseTone
 * @property {string} shipmentReadyLabel
 * @property {boolean} shipmentReady
 * @property {boolean} shipmentReadyRaw
 * @property {boolean} stateInconsistent
 * @property {'ready' | 'production' | 'waiting' | 'missing' | 'stock'} rowTone
 * @property {number | null} unitPrice
 * @property {number | null} lineTotal
 * @property {number | null} unitCost
 * @property {number | null} lineProfit
 * @property {string | null} supplierName
 * @property {OrderLineReceivingDto | null} receivingLine
 */

/** @type {{ id: OrderPanelProductsFilterId, label: string }[]} */
export const ORDER_PANEL_PRODUCT_FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'ready', label: 'Sevke hazır' },
  { id: 'production', label: 'Üretimde' },
  { id: 'waiting', label: 'Bekleniyor' },
  { id: 'missing', label: 'Eksik' },
  { id: 'arrived', label: 'Geldi işaretli' },
  { id: 'stock', label: 'Stokta' },
]

/**
 * @param {UserRole | undefined} role
 */
export function canViewOrderPanelPurchasePrice(role) {
  return canAccessPage(role, 'profitability-analytics')
}

/**
 * @param {number} qtyOrdered
 * @param {number} qtyReceived
 * @param {boolean} hasOpenMissing
 */
export function resolveArrivalLabel(qtyOrdered, qtyReceived, hasOpenMissing) {
  if (hasOpenMissing) return 'Eksik'
  if (qtyReceived >= qtyOrdered - 0.0001 && qtyReceived > 0.0001) return 'Geldi'
  return 'Bekliyor'
}

/**
 * @param {OrderLineDetailDto} line
 * @param {number} qtyOrdered
 * @param {number} qtyReceived
 */
function resolveWarehouseEntryFromLine(line, qtyOrdered, qtyReceived) {
  const supplyStatus = line.supplyStatus ?? SUPPLY_STATUS.NOT_SENT
  const status =
    line.warehouseEntryStatus ??
    computeWarehouseEntryStatusFromQty(qtyOrdered, qtyReceived, supplyStatus)
  return {
    status,
    label: warehouseEntryStatusLabelTr(status),
  }
}

/**
 * @param {boolean} shipmentReady
 */
export function resolveShipmentReadyLabel(shipmentReady) {
  return shipmentReady ? 'Evet' : 'Hayır'
}

/**
 * @param {ProductReadinessStatus} status
 * @param {string | null | undefined} productGroup
 * @param {number} qtyOrdered
 * @param {number} qtyReceived
 * @returns {'ready' | 'production' | 'waiting' | 'missing' | 'stock'}
 */
export function readinessToRowTone(status, productGroup, qtyOrdered, qtyReceived) {
  if (status === PRODUCT_READINESS_STATUS.MISSING) return 'missing'
  if (status === PRODUCT_READINESS_STATUS.READY) return 'ready'
  if (status === PRODUCT_READINESS_STATUS.PARTIAL) return 'production'
  const group = (productGroup ?? '').toUpperCase()
  if (group === 'STOCK' || group === 'DISPLAY') return 'stock'
  if (qtyReceived >= qtyOrdered - 0.0001 && qtyReceived > 0) return 'stock'
  return 'waiting'
}

/**
 * @param {ProductReadinessStatus} status
 */
export function readinessToStageLabel(status) {
  switch (status) {
    case PRODUCT_READINESS_STATUS.READY:
      return 'Sevke hazır'
    case PRODUCT_READINESS_STATUS.PARTIAL:
      return 'Üretimde'
    case PRODUCT_READINESS_STATUS.MISSING:
      return 'Eksik ürün'
    default:
      return 'Bekleniyor'
  }
}

/**
 * @param {OrderLineDetailDto} line
 */
function buildConfigHint(line) {
  if (!line.configuration || !Object.keys(line.configuration).length) return ''
  const ctx = {
    title: line.title,
    category: line.productGroup ?? undefined,
    productGroup: line.productGroup ?? undefined,
  }
  const detailLines = formatConfigurationLines(ctx, line.configuration)
  if (!detailLines.length) return ''
  const first = detailLines[0].replace(/^•\s*/, '')
  const groupLabel =
    line.productGroup && CONFIG_PROFILES[/** @type {keyof typeof CONFIG_PROFILES} */ (line.productGroup)]
      ? CONFIG_PROFILES[/** @type {keyof typeof CONFIG_PROFILES} */ (line.productGroup)].label
      : null
  return groupLabel ? `${groupLabel} · ${first}` : first
}

/**
 * @param {OrderLineDetailDto} line
 * @param {OrderLineReceivingDto | undefined} receiving
 * @param {boolean} hasOpenMissing
 */
function resolveReadiness(line, receiving, hasOpenMissing) {
  if (receiving) {
    return {
      status: receiving.readinessStatus,
      label: receiving.readinessLabel || readinessStatusLabel(receiving.readinessStatus),
    }
  }
  const ordered = parseQty(line.qtyOrdered)
  const received = parseQty(line.qtyReceived)
  const computed = computeLineReadiness(ordered, received, hasOpenMissing)
  return { status: computed.status, label: computed.label }
}

/**
 * @param {OrderLineDetailDto[]} orderLines
 * @param {OrderLineReceivingDto[]} receivingLines
 * @param {Set<string>} openMissingLineIds
 */
export function buildOrderPanelProductRows(orderLines, receivingLines, openMissingLineIds) {
  const receivingById = new Map(receivingLines.map((r) => [r.orderLineId, r]))
  const openMissingItemsCount = openMissingLineIds.size

  const lineInputs = orderLines.map((line) => {
    const receiving = receivingById.get(line.id)
    const qtyOrdered = parseQty(line.qtyOrdered)
    const qtyReceived = receiving ? parseQty(receiving.qtyReceived) : parseQty(line.qtyReceived)
    const supplySnapshot = buildLineSupplySnapshot(line, qtyOrdered, qtyReceived)
    return supplySnapshot
  })

  const orderAutoReadyQualified = orderQualifiesForAutoShipmentReady(
    lineInputs.map((snapshot) => ({ warehouseEntryStatus: snapshot.warehouseEntryStatus })),
    { openMissingItemsCount },
  )

  return orderLines.map((line, index) => {
    const receiving = receivingById.get(line.id)
    const hasOpenMissing = openMissingLineIds.has(line.id)
    const { status, label } = resolveReadiness(line, receiving, hasOpenMissing)
    const qtyOrdered = parseQty(line.qtyOrdered)
    const qtyReceived = receiving ? parseQty(receiving.qtyReceived) : parseQty(line.qtyReceived)
    const unitPrice = typeof line.unitPrice === 'number' ? line.unitPrice : null
    const lineTotal =
      typeof line.lineTotal === 'number'
        ? line.lineTotal
        : unitPrice != null
          ? Math.round(unitPrice * qtyOrdered)
          : null
    const suggestedCost = receiving?.suggestedPurchasePrice
      ? parseQty(receiving.suggestedPurchasePrice)
      : null
    const unitCost =
      typeof line.soldUnitCost === 'number' && line.soldUnitCost > 0
        ? line.soldUnitCost
        : suggestedCost && suggestedCost > 0
          ? suggestedCost
          : null
    const lineProfit =
      lineTotal != null && unitCost != null ? Math.round(lineTotal - unitCost * qtyOrdered) : null
    const arrivalLabel = resolveArrivalLabel(qtyOrdered, qtyReceived, hasOpenMissing)
    const supplyStatus = line.supplyStatus ?? SUPPLY_STATUS.NOT_SENT
    const supplyStatusLabel = supplyStatusLabelTr(supplyStatus)
    const warehouse = resolveWarehouseEntryFromLine(line, qtyOrdered, qtyReceived)
    const supplySnapshot = lineInputs[index] ?? buildLineSupplySnapshot(line, qtyOrdered, qtyReceived)
    const shipmentReadyRaw = Boolean(line.shipmentReady)
    const shipmentReady = resolveEffectiveShipmentReady(supplySnapshot, orderAutoReadyQualified)
    const shipmentReadyLabel = resolveShipmentReadyLabel(shipmentReady)
    const stateInconsistent = detectOrderLineStateInconsistency(supplySnapshot)
    const stageLabel = stateInconsistent
      ? 'Tutarsız'
      : resolveStageLabelFromSupplyState(supplySnapshot, orderAutoReadyQualified)
    const productGroup = line.productGroupSnapshot ?? line.productGroup ?? null

    return /** @type {OrderPanelProductRow} */ ({
      id: line.id,
      title: line.title,
      configHint: buildConfigHint(line),
      qtyOrdered,
      qtyReceived,
      readinessStatus: status,
      statusLabel: label,
      stageLabel,
      arrivalLabel,
      supplyStatus,
      supplyStatusLabel,
      supplyTone: supplyStatus === SUPPLY_STATUS.SENT ? 'sent' : 'not-sent',
      warehouseEntryStatus: warehouse.status,
      warehouseEntryLabel: warehouse.label,
      warehouseTone:
        warehouse.status === WAREHOUSE_ENTRY_STATUS.ARRIVED
          ? 'arrived'
          : warehouse.status === WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED
            ? 'partial'
            : warehouse.status === WAREHOUSE_ENTRY_STATUS.WAITING
              ? 'waiting'
              : 'not-sent',
      shipmentReadyLabel,
      shipmentReady,
      shipmentReadyRaw,
      stateInconsistent,
      rowTone: stateInconsistent
        ? 'waiting'
        : shipmentReady
          ? 'ready'
          : readinessToRowTone(status, productGroup, qtyOrdered, qtyReceived),
      unitPrice,
      lineTotal,
      unitCost,
      lineProfit,
      supplierName: line.supplierNameSnapshot?.trim() || null,
      receivingLine: receiving ?? null,
    })
  })
}

/**
 * @param {OrderPanelProductRow[]} rows
 */
export function buildOrderPanelProductsSummary(rows) {
  const totalLines = rows.length
  const arrivedLines = rows.filter(
    (r) => r.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED,
  ).length
  const partialArrivedLines = rows.filter(
    (r) => r.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.PARTIAL_ARRIVED,
  ).length
  const waitingLines = rows.filter((r) => r.readinessStatus === PRODUCT_READINESS_STATUS.WAITING).length
  const missingLines = rows.filter((r) => r.readinessStatus === PRODUCT_READINESS_STATUS.MISSING).length
  const readyLines = rows.filter((r) => r.shipmentReady).length
  const totalAmount = rows.reduce((sum, r) => sum + (r.lineTotal ?? 0), 0)

  const supplyPendingLines = rows.filter((r) => r.supplyStatus !== SUPPLY_STATUS.SENT).length

  return [
    { id: 'total', label: 'Toplam Ürün', value: String(totalLines), valueTone: /** @type {const} */ ('neutral') },
    { id: 'supply-pending', label: 'Tedarik Verilmedi', value: String(supplyPendingLines), valueTone: /** @type {const} */ ('critical') },
    { id: 'arrived', label: 'Geldi işaretli', value: String(arrivedLines), valueTone: /** @type {const} */ ('success') },
    {
      id: 'partial-arrived',
      label: 'Eksik Gelen',
      value: String(partialArrivedLines),
      valueTone: /** @type {const} */ ('warning'),
    },
    {
      id: 'waiting',
      label: 'Bekleyen Ürün',
      value: String(waitingLines),
      valueTone: /** @type {const} */ ('warning'),
    },
    {
      id: 'missing',
      label: 'Eksik Ürün',
      value: String(missingLines),
      valueTone: /** @type {const} */ ('critical'),
    },
    { id: 'ready', label: 'Sevke Hazır', value: String(readyLines), valueTone: /** @type {const} */ ('neutral') },
    { id: 'amount', label: 'Toplam Tutar', value: formatTry(totalAmount), valueTone: /** @type {const} */ ('neutral') },
  ]
}

/**
 * @param {OrderPanelProductRow[]} rows
 * @param {OrderPanelProductsFilterId} filterId
 * @param {string} search
 */
export function filterOrderPanelProducts(rows, filterId, search) {
  const q = search.trim().toLocaleLowerCase('tr-TR')
  return rows.filter((row) => {
    if (filterId === 'ready' && !row.shipmentReady) return false
    if (filterId === 'production' && row.readinessStatus !== PRODUCT_READINESS_STATUS.PARTIAL) return false
    if (filterId === 'waiting' && row.readinessStatus !== PRODUCT_READINESS_STATUS.WAITING) return false
    if (filterId === 'missing' && row.readinessStatus !== PRODUCT_READINESS_STATUS.MISSING) return false
    if (filterId === 'arrived' && row.warehouseEntryStatus !== WAREHOUSE_ENTRY_STATUS.ARRIVED) return false
    if (filterId === 'stock' && row.rowTone !== 'stock') return false
    if (!q) return true
    const hay = [
      row.title,
      row.configHint,
      row.supplierName,
      row.stageLabel,
      row.statusLabel,
      row.arrivalLabel,
      row.shipmentReadyLabel,
    ]
      .filter(Boolean)
      .join(' ')
      .toLocaleLowerCase('tr-TR')
    return hay.includes(q)
  })
}

/**
 * @param {OrderPanelProductRow[]} rows
 * @param {OrderPanelProductsSortKey} sortKey
 * @param {'asc' | 'desc'} sortDir
 */
export function sortOrderPanelProducts(rows, sortKey, sortDir) {
  const dir = sortDir === 'asc' ? 1 : -1
  const sorted = [...rows]
  sorted.sort((a, b) => {
    /** @type {number | string} */
    let av
    /** @type {number | string} */
    let bv
    switch (sortKey) {
      case 'qty':
        av = a.qtyOrdered
        bv = b.qtyOrdered
        break
      case 'status':
        av = a.statusLabel
        bv = b.statusLabel
        break
      case 'arrival':
        av = a.arrivalLabel
        bv = b.arrivalLabel
        break
      case 'shipmentReady':
        av = a.shipmentReadyLabel
        bv = b.shipmentReadyLabel
        break
      case 'sale':
        av = a.unitPrice ?? -1
        bv = b.unitPrice ?? -1
        break
      case 'total':
        av = a.lineTotal ?? -1
        bv = b.lineTotal ?? -1
        break
      case 'supplier':
        av = a.supplierName ?? ''
        bv = b.supplierName ?? ''
        break
      default:
        av = a.title
        bv = b.title
    }
    if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir
    return String(av).localeCompare(String(bv), 'tr-TR') * dir
  })
  return sorted
}

/**
 * @param {OrderPanelProductRow[]} rows
 */
export function buildOrderPanelProductsFooter(rows) {
  const qtyTotal = rows.reduce((s, r) => s + r.qtyOrdered, 0)
  const saleTotal = rows.reduce((s, r) => s + (r.lineTotal ?? 0), 0)
  return { qtyTotal, saleTotal }
}
