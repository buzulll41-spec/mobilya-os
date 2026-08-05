import { RISK_SEVERITY } from '../../contracts/v1/enums.js'
import { isTerminOverdue, remainingBalance } from '../../utils/orderFinance.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @typedef {'healthy' | 'warning' | 'critical'} OrderHealthTone
 * @typedef {{ tone: OrderHealthTone, label: string, detail?: string }} OrderHealthBarModel
 */

/** @param {number} rem @param {number} total */
function isCriticalBalance(rem, total) {
  if (rem <= 0.009) return false
  if (rem >= 80_000) return true
  if (total > 0 && rem / total >= 0.5) return true
  return false
}

/** @param {number} rem @param {number} total */
function isHighBalance(rem, total) {
  if (rem <= 0.009) return false
  if (isCriticalBalance(rem, total)) return false
  if (rem >= 40_000) return true
  if (total > 0 && rem / total >= 0.4) return true
  return false
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {ShipmentPlan | undefined} shipmentPlan
 * @param {string} todayIso
 */
function isShipmentDateOverdue(order, dto, shipmentPlan, todayIso) {
  if (order.status === 'Teslim Edildi') return false
  const shipDate =
    shipmentPlan?.plannedDate ??
    dto?.plannedShipmentDate ??
    order.shipmentDate ??
    null
  if (!shipDate || shipDate >= todayIso) return false
  const delivered = order.status === 'Teslim Edildi' || dto?.operationalState?.fulfillmentState === 'DELIVERED'
  return !delivered
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {ShipmentPlan | undefined} shipmentPlan
 */
function isShipmentPlanMissing(order, dto, shipmentPlan) {
  if (order.status === 'Teslim Edildi') return false
  if (shipmentPlan?.plannedDate) return false
  if ((dto?.shipmentSummaryOpenCount ?? 0) > 0) return false
  if ((dto?.inTransitShipmentCount ?? 0) > 0) return false
  if (order.shipmentDate) return false
  return order.status === 'Hazır' || Boolean(order.dueDate)
}

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {ShipmentPlan | undefined} shipmentPlan
 * @param {string} todayIso
 * @returns {OrderHealthBarModel}
 */
export function buildOrderHealthBar(order, dto, shipmentPlan, todayIso) {
  const rem = remainingBalance(order)
  const total = order.amount ?? 0
  const openSsh = (dto?.openMissingItemsCount ?? 0) > 0
  const terminOverdue = isTerminOverdue(order, todayIso)
  const shipmentOverdue = isShipmentDateOverdue(order, dto, shipmentPlan, todayIso)
  const severity = dto?.currentRiskSeverity ?? RISK_SEVERITY.NONE
  const criticalRisk =
    severity === RISK_SEVERITY.CRITICAL ||
    severity === RISK_SEVERITY.HIGH ||
    Boolean(dto?.hasShipmentIssue)
  const criticalBalance = isCriticalBalance(rem, total) || Boolean(dto?.hasOverdueBalance)

  if (terminOverdue || shipmentOverdue || criticalRisk) {
    const detail = terminOverdue
      ? 'Termin geçti'
      : shipmentOverdue
        ? 'Sevk tarihi geçti'
        : 'Kritik operasyon riski'
    return { tone: 'critical', label: 'Kritik Operasyon Riski', detail }
  }

  const highBalance = isHighBalance(rem, total)
  const planMissing = isShipmentPlanMissing(order, dto, shipmentPlan)

  if (openSsh || highBalance || planMissing) {
    const detail = openSsh
      ? `${dto?.openMissingItemsCount ?? 1} açık SSH`
      : highBalance
        ? 'Yüksek bakiye'
        : 'Sevk planı eksik'
    const label = highBalance && !openSsh && !planMissing ? 'Tahsilat Riski' : highBalance ? 'Tahsilat Riski' : 'Operasyon Riski'
    return { tone: 'warning', label, detail }
  }

  if (criticalBalance) {
    return { tone: 'warning', label: 'Tahsilat Riski', detail: 'Kalan bakiye yüksek' }
  }

  return { tone: 'healthy', label: 'Sağlıklı Sipariş' }
}
