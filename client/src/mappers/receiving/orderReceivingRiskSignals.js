import { DEMO_TODAY } from '../../data/constants.js'
import { parseQty, PRODUCT_READINESS_STATUS } from './productReadiness.js'

/**
 * Risk merkezi için veri altyapısı — bu fazda widget yok.
 *
 * @typedef {Object} ReceivingRiskSignal
 * @property {string} code
 * @property {'LOW' | 'MEDIUM' | 'HIGH'} severity
 * @property {string} message
 */

/**
 * @param {{
 *   order: import('../../data/seedOrders.js').Order
 *   listItemDto?: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto
 *   receivingLines?: import('../../contracts/v1/incomingGoods.js').OrderLineReceivingDto[]
 *   todayIso?: string
 * }} input
 * @returns {ReceivingRiskSignal[]}
 */
export function computeOrderReceivingRiskSignals({
  order,
  listItemDto,
  receivingLines = [],
  todayIso = DEMO_TODAY,
}) {
  /** @type {ReceivingRiskSignal[]} */
  const signals = []

  const hasOpenShipment =
    (listItemDto?.shipmentSummaryOpenCount ?? 0) > 0 ||
    (listItemDto?.inTransitShipmentCount ?? 0) > 0

  const waitingLines = receivingLines.filter((l) => l.readinessStatus === PRODUCT_READINESS_STATUS.WAITING)
  if (hasOpenShipment && waitingLines.length > 0) {
    signals.push({
      code: 'SHIPMENT_WITHOUT_RECEIPT',
      severity: 'HIGH',
      message: 'Sevk planlandı ancak henüz fiziksel gelmeyen ürün var.',
    })
  }

  const overdue =
    order.status !== 'Teslim Edildi' && Boolean(order.dueDate) && order.dueDate < todayIso
  const pendingReceive = receivingLines.some(
    (l) =>
      l.readinessStatus === PRODUCT_READINESS_STATUS.WAITING ||
      l.readinessStatus === PRODUCT_READINESS_STATUS.PARTIAL,
  )
  if (overdue && pendingReceive) {
    signals.push({
      code: 'DUE_DATE_NEAR_PENDING_RECEIVE',
      severity: 'HIGH',
      message: 'Teslim tarihi geçti veya yakın; ürün gelişi tamamlanmadı.',
    })
  }

  const partialStuck = receivingLines.filter((l) => {
    if (l.readinessStatus !== PRODUCT_READINESS_STATUS.PARTIAL) return false
    const ordered = parseQty(l.qtyOrdered)
    const received = parseQty(l.qtyReceived)
    return received > 0.0001 && received < ordered - 0.0001
  })
  if (partialStuck.length > 0 && overdue) {
    signals.push({
      code: 'PARTIAL_RECEIVE_STALLED',
      severity: 'MEDIUM',
      message: 'Kısmi geliş uzun süredir tamamlanmadı (termin baskısı).',
    })
  }

  return signals
}
