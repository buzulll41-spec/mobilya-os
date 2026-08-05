import { DEMO_TODAY, DEMO_TOMORROW } from './constants.js'
import { RISK_SEVERITY } from '../contracts/v1/enums.js'
import { moneyToNumber } from '../mappers/moneyHelpers.js'
import { remainingBalance } from '../utils/orderFinance.js'
import {
  countPendingApprovalPayments as countPendingApprovalPaymentsFromStore,
  countPendingMailOrderApprovals as countPendingMailOrderApprovalsFromStore,
  sumPendingApprovalPaymentAmount as sumPendingApprovalPaymentAmountFromStore,
} from '../services/mockPaymentStore.js'
import {
  countDelayedShipmentKpi,
  countPendingDeliveryConfirmations,
} from '../mappers/shipment/deliveryConfirmationQueue.js'

/** @typedef {import('../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @param {import('./seedOrders.js').Order[]} orders
 * @param {SalesOrderListItemDto[]} [listItemDtos]
 * @param {string} [todayIso]
 * @param {ShipmentPlan[]} [shipmentPlans]
 */
export function computeDashboardKpis(orders, listItemDtos = [], todayIso = DEMO_TODAY, shipmentPlans = []) {
  const active = orders.filter((o) => o.status !== 'Teslim Edildi')
  const pendingCollection = active.reduce((s, o) => s + remainingBalance(o), 0)
  const overdueOrders = active.filter(
    (o) => o.dueDate && o.dueDate < todayIso,
  ).length
  const todayShipments = active.filter((o) => o.shipmentDate === todayIso).length
  const tomorrowShipments = active.filter(
    (o) => o.shipmentDate === DEMO_TOMORROW,
  ).length

  const dtos =
    listItemDtos.length > 0
      ? listItemDtos
      : orders.map((o) => ({
          id: o.id,
          placedAt: `${o.orderDate}T10:00:00.000Z`,
          totalAmount: { amount: String(o.totalAmount ?? o.amount), currency: 'TRY' },
          amountDue: { amount: String(remainingBalance(o)), currency: 'TRY' },
          remainingAmount: { amount: String(remainingBalance(o)), currency: 'TRY' },
          displayStatus: o.status,
          currentRiskSeverity: RISK_SEVERITY.NONE,
          shipmentSummaryOpenCount: o.shipmentDate ? 1 : 0,
          inTransitShipmentCount: 0,
          partiallyShipped: false,
          hasOverdueBalance: false,
        }))

  const todayOrders = dtos.filter((d) => (d.placedAt ?? '').slice(0, 10) === todayIso)
  const todaySalesTotal = todayOrders.reduce((s, d) => s + moneyToNumber(d.totalAmount), 0)
  const todayOrderCount = todayOrders.length
  const criticalRiskCount = dtos.filter(
    (d) =>
      d.currentRiskSeverity === RISK_SEVERITY.CRITICAL ||
      d.currentRiskSeverity === RISK_SEVERITY.HIGH,
  ).length
  const pendingShipmentCount = dtos.filter(
    (d) =>
      d.displayStatus !== 'Teslim Edildi' &&
      (d.shipmentSummaryOpenCount ?? 0) === 0 &&
      (d.inTransitShipmentCount ?? 0) === 0 &&
      ['Geldi', 'Kısmi Geldi', 'Sevke Hazır', 'Hazır', 'Üretimde', 'Eksik Var'].includes(d.displayStatus),
  ).length

  const pendingApprovalPayments =
    dtos.length > 0
      ? dtos.reduce((sum, d) => sum + (d.pendingApprovalPaymentCount ?? 0), 0)
      : countPendingApprovalPaymentsFromStore()
  const pendingApprovalPaymentAmount =
    dtos.length > 0
      ? dtos.reduce((sum, d) => sum + (d.pendingApprovalPaymentAmount ?? 0), 0)
      : sumPendingApprovalPaymentAmountFromStore()
  const pendingMailOrderApprovals =
    dtos.length > 0
      ? dtos.reduce((sum, d) => sum + (d.pendingMailOrderApprovalCount ?? 0), 0)
      : countPendingMailOrderApprovalsFromStore()

  return {
    pendingCollection,
    overdueOrders,
    todayShipments,
    tomorrowShipments,
    todaySalesTotal,
    todayOrderCount,
    criticalRiskCount,
    pendingShipmentCount,
    pendingApprovalPayments,
    pendingApprovalPaymentAmount,
    pendingMailOrderApprovals,
    pendingDeliveryConfirmations: countPendingDeliveryConfirmations(shipmentPlans),
    delayedShipmentKpi: countDelayedShipmentKpi(shipmentPlans),
  }
}

export function formatCurrencyTRY(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0'
  return new Intl.NumberFormat('tr-TR', {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(n))
}

export function formatTry(value) {
  return `${formatCurrencyTRY(value)} ₺`
}
