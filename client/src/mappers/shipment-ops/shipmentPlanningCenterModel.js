import { formatTry } from '../../data/dashboardHelpers.js'
import { formatShortDate } from '../../utils/dates.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { parseOrderProductSummary } from '../../utils/orderProductSummary.js'
import { PRODUCT_READINESS_STATUS } from '../receiving/productReadiness.js'
import { parseQty } from '../receiving/productReadiness.js'
import { WAREHOUSE_ENTRY_STATUS } from '../../constants/supplyOrderStatus.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../order/orderPanelProductsModel.js').OrderPanelProductRow} OrderPanelProductRow */
/** @typedef {import('../../services/ordersClient.js').OrderLineDetailDto} OrderLineDetailDto */

/**
 * @typedef {Object} ShipmentDeliveryProductLine
 * @property {string} id
 * @property {string} name
 * @property {number} quantity
 * @property {string} displayLabel
 */

/**
 * @typedef {Object} ShipmentDeliveryProductsViewModel
 * @property {ShipmentDeliveryProductLine[]} lines
 * @property {number} lineCount
 * @property {number} totalQuantity
 */

/**
 * @param {number} qty
 */
export function formatDeliveryQtyLabel(qty) {
  if (!Number.isFinite(qty)) return '1'
  return Number.isInteger(qty) ? String(qty) : String(qty).replace('.', ',')
}

/**
 * Sipariş satır snapshot'ından sevk teslim listesi üretir.
 * @param {OrderLineDetailDto[] | null | undefined} orderLines
 * @param {string | undefined | null} lineSummaryFallback
 * @returns {ShipmentDeliveryProductsViewModel}
 */
export function buildShipmentDeliveryProductsViewModel(orderLines, lineSummaryFallback) {
  if (orderLines && orderLines.length > 0) {
    const lines = orderLines.map((line) => {
      const name = line.productTitleSnapshot?.trim() || line.title?.trim() || 'Ürün'
      const quantity = parseQty(line.qtyOrdered)
      const qtyLabel = formatDeliveryQtyLabel(quantity)
      return {
        id: line.id,
        name,
        quantity,
        displayLabel: `${name} (${qtyLabel})`,
      }
    })
    return {
      lines,
      lineCount: lines.length,
      totalQuantity: lines.reduce((sum, ln) => sum + ln.quantity, 0),
    }
  }

  const summary = parseOrderProductSummary(lineSummaryFallback)
  const lines = summary.lines.map((line, index) => {
    const qtyLabel = formatDeliveryQtyLabel(line.qty)
    return {
      id: `summary-${index}`,
      name: line.title,
      quantity: line.qty,
      displayLabel: `${line.title} (${qtyLabel})`,
    }
  })
  return {
    lines,
    lineCount: summary.lineCount,
    totalQuantity: summary.totalQty,
  }
}

/**
 * @typedef {Object} ShipmentPlanningCheck
 * @property {string} id
 * @property {string} label
 * @property {'ok' | 'warn' | 'critical'} tone
 */

/**
 * @param {OrderPanelProductRow[]} productRows
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {Order} order
 */
export function buildShipmentPlanningOperationChecks(productRows, dto, order) {
  const total = productRows.length
  const arrived = productRows.filter(
    (r) => r.warehouseEntryStatus === WAREHOUSE_ENTRY_STATUS.ARRIVED,
  ).length
  const shipmentReady = productRows.filter((r) => r.shipmentReady).length
  const missing = productRows.filter(
    (r) => r.readinessStatus === PRODUCT_READINESS_STATUS.MISSING,
  ).length
  const rem = remainingBalance(order)
  const collectionClosed = rem <= 0.009

  /** @type {ShipmentPlanningCheck[]} */
  const checks = []

  if (total === 0) {
    checks.push({ id: 'products', label: 'Ürün satırı yok', tone: 'warn' })
  } else if (arrived === total) {
    checks.push({ id: 'arrived', label: 'Tüm ürünler geldi', tone: 'ok' })
  } else {
    checks.push({
      id: 'arrived',
      label: `${arrived}/${total} ürün geldi`,
      tone: 'warn',
    })
  }

  if (total > 0 && shipmentReady === total) {
    checks.push({ id: 'ready', label: 'Sevke hazır', tone: 'ok' })
  } else {
    checks.push({ id: 'ready', label: 'Sevke hazır değil', tone: 'warn' })
  }

  if (missing === 0) {
    checks.push({ id: 'missing', label: 'Eksik ürün yok', tone: 'ok' })
  } else {
    checks.push({ id: 'missing', label: `${missing} eksik ürün var`, tone: 'critical' })
  }

  if (collectionClosed) {
    checks.push({ id: 'collection', label: 'Tahsilat kapandı', tone: 'ok' })
  } else {
    checks.push({
      id: 'collection',
      label: `Tahsilat açık (${formatTry(rem)} kalan)`,
      tone: 'warn',
    })
  }

  return checks
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {OrderPanelProductRow[]} productRows
 */
export function buildShipmentPlanningOpsSummary(order, dto, productRows) {
  const rem = remainingBalance(order)
  const install =
    dto?.installationPending === false || dto?.operationalState?.installationState === 'NOT_REQUIRED'
      ? 'Gerekmez'
      : dto?.installationPending
        ? 'Bekliyor'
        : '—'

  return [
    { id: 'products', label: 'Ürün Sayısı', value: String(productRows.length) },
    { id: 'amount', label: 'Toplam Tutar', value: formatTry(order.amount) },
    {
      id: 'collection',
      label: 'Tahsilat',
      value: rem <= 0.009 ? 'Tamamlandı' : `${formatTry(rem)} kalan`,
    },
    { id: 'install', label: 'Montaj', value: install },
  ]
}

/**
 * @param {import('../../state/shipmentPlanStore.js').ShipmentPlan | undefined | null} plan
 */
export function buildShipmentPlanCardLine(plan) {
  if (!plan?.plannedDate) return null
  const dateLabel = formatShortDate(plan.plannedDate)
  const time = plan.plannedTime?.trim().slice(0, 5) || ''
  const parts = ['SEVK', dateLabel]
  if (time) parts.push(time)
  if (plan.vehicle?.trim()) parts.push(plan.vehicle.trim())
  if (plan.crew1?.trim() && plan.crew1 !== 'Belirlenmedi') parts.push(plan.crew1.trim())
  if (plan.crew2?.trim() && plan.crew2 !== 'Belirlenmedi' && plan.crew2 !== plan.crew1) {
    parts.push(plan.crew2.trim())
  }
  return parts.join(' · ')
}

/**
 * Bölge alanını ilçe / mahalle olarak ayırır.
 * @param {string} region
 */
export function splitShipmentRegionFields(region) {
  const raw = (region ?? '').trim()
  if (!raw) return { district: '', neighborhood: '' }
  const parts = raw.split('/').map((p) => p.trim())
  if (parts.length >= 2) {
    return { district: parts[0], neighborhood: parts.slice(1).join(' / ') }
  }
  return { district: raw, neighborhood: '' }
}

/**
 * @param {string} district
 * @param {string} neighborhood
 */
export function joinShipmentRegionFields(district, neighborhood) {
  const d = district.trim()
  const n = neighborhood.trim()
  if (d && n) return `${d} / ${n}`
  return d || n
}
