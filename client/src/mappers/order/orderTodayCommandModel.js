import { RISK_SEVERITY } from '../../contracts/v1/enums.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { isTerminOverdue, remainingBalance } from '../../utils/orderFinance.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @typedef {'critical' | 'warning' | 'ok'} TodayCommandTone
 * @typedef {{ tone: TodayCommandTone, icon: string, message: string, tabTarget?: string }} TodayCommandModel
 */

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {ShipmentPlan | undefined} shipmentPlan
 * @param {string} todayIso
 * @returns {TodayCommandModel}
 */
export function buildTodayOrderCommand(order, dto, shipmentPlan, todayIso) {
  const rem = remainingBalance(order)
  const openSsh = (dto?.openMissingItemsCount ?? 0) > 0
  const severity = dto?.currentRiskSeverity ?? RISK_SEVERITY.NONE
  const terminOverdue = isTerminOverdue(order, todayIso)

  if (terminOverdue || severity === RISK_SEVERITY.CRITICAL) {
    return {
      tone: 'critical',
      icon: '⚠',
      message: terminOverdue ? 'Termin geçti — acil müdahale gerekli' : 'Kritik operasyon riski var',
      tabTarget: 'history',
    }
  }

  if (rem >= 50_000 || (order.amount > 0 && rem / order.amount >= 0.45)) {
    return {
      tone: 'warning',
      icon: '⚠',
      message: `${formatTry(rem)} tahsil edilmedi`,
      tabTarget: 'payments',
    }
  }

  if (openSsh) {
    return {
      tone: 'warning',
      icon: '⚠',
      message: `${dto?.openMissingItemsCount ?? 1} açık SSH var`,
      tabTarget: 'ssh',
    }
  }

  const planMissing =
    order.status !== 'Teslim Edildi' &&
    !shipmentPlan?.plannedDate &&
    (dto?.shipmentSummaryOpenCount ?? 0) === 0 &&
    (dto?.inTransitShipmentCount ?? 0) === 0 &&
    !order.shipmentDate &&
    (order.status === 'Hazır' || Boolean(order.dueDate))

  if (planMissing) {
    return {
      tone: 'warning',
      icon: '⚠',
      message: 'Sevk planı eksik',
      tabTarget: 'shipment',
    }
  }

  return {
    tone: 'ok',
    icon: '✅',
    message: 'Kritik konu bulunmuyor',
  }
}
