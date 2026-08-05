import { legacyOrderToSalesOrderListItemDto } from '../mappers/legacyOrderToSalesOrderListItemDto.js'
import { enrichSalesOrderListItemWithShipmentSummary } from '../mappers/shipment/enrichSalesOrderListItem.js'
import { enrichSalesOrderListItemWithPaymentSummary } from '../mappers/payment/enrichSalesOrderListItemWithPaymentSummary.js'
import { applyCompositeListItemRisk } from '../mappers/risk/applyCompositeListItemRisk.js'
import { attachOperationalState } from '../mappers/operational/attachOperationalState.js'
import { enrichSalesOrderListItemWithMissingItemsSummary } from '../mappers/missingItems/enrichMissingItemsSummary.js'
import { enrichSalesOrderListItemWithDerivedDisplayStatus } from '../lib/deriveOrderDisplayStatus.js'
import { countOpenMissingItems } from '../lib/autoShipmentReady.js'
import { resolveShipmentAwareDisplayStatus } from '../lib/orderShipmentDisplayStatus.js'
import { PAYMENT_TRANSACTION_STATUS } from '../contracts/v1/enums.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../contracts/v1/shipment.js').ShipmentDto} ShipmentDto */
/** @typedef {import('../contracts/v1/payment.js').PaymentTransactionDto} PaymentTransactionDto */
/** @typedef {{ id: string; salesOrderId: string; qtyOrdered: string }} OrderLineSeed */
/** @typedef {import('../lib/deriveOrderDisplayStatus.js').OrderLineDisplayStatusInput} OrderLineDisplayStatusInput */

/**
 * IO dışı saf projection: legacy sipariş + önceden okunmuş read model’ler → liste DTO.
 * @param {Order} order
 * @param {string} todayIso
 * @param {{
 *   shipments: ShipmentDto[]
 *   lineSeeds: OrderLineSeed[]
 *   lineDisplayInputs?: OrderLineDisplayStatusInput[]
 *   paymentTransactions: PaymentTransactionDto[]
 *   missingItems: { status: string }[]
 *   shipmentPlan?: { status: string } | null
 * }} readModels
 * @returns {SalesOrderListItemDto}
 */
export function projectSalesOrderListItemDtoFromReadModels(order, todayIso, readModels) {
  const base = legacyOrderToSalesOrderListItemDto(order, todayIso)
  const openMissingItemsCount = countOpenMissingItems(readModels.missingItems ?? [])
  const withDerivedStatus = enrichSalesOrderListItemWithDerivedDisplayStatus(
    base,
    readModels.lineDisplayInputs ?? [],
    order.status,
    { openMissingItemsCount },
  )
  const withShipmentDisplay = {
    ...withDerivedStatus,
    displayStatus: resolveShipmentAwareDisplayStatus(
      withDerivedStatus.displayStatus,
      readModels.shipments,
      readModels.shipmentPlan ?? undefined,
    ),
  }
  const pendingApprovalPaymentCount = readModels.paymentTransactions.filter(
    (p) => p.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL,
  ).length
  const pendingApprovalPaymentAmount = readModels.paymentTransactions
    .filter((p) => p.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL)
    .reduce((sum, p) => sum + Number.parseFloat(p.amount.amount), 0)
  const pendingMailOrderApprovalCount = readModels.paymentTransactions.filter(
    (p) =>
      p.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL &&
      p.kind === 'MAIL_ORDER',
  ).length
  const withShip = enrichSalesOrderListItemWithShipmentSummary(
    withShipmentDisplay,
    order,
    readModels.shipments,
    readModels.lineSeeds,
  )
  const withPay = enrichSalesOrderListItemWithPaymentSummary(
    withShip,
    order,
    readModels.paymentTransactions,
    todayIso,
  )
  const withMissing = enrichSalesOrderListItemWithMissingItemsSummary(
    withPay,
    readModels.missingItems ?? [],
  )
  return {
    ...attachOperationalState(applyCompositeListItemRisk(withMissing, order, todayIso), order, todayIso),
    pendingApprovalPaymentCount,
    pendingApprovalPaymentAmount,
    pendingMailOrderApprovalCount,
  }
}
