import {
  COMMERCIAL_STATE,
  FINANCIAL_STATE,
  FULFILLMENT_STATE,
  INSTALLATION_STATE,
  OPERATIONAL_RISK_STATE,
  PRODUCTION_STATE,
} from '../../contracts/v1/orderOperationalState.js'
import { moneyToNumber } from '../moneyHelpers.js'

/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/orderOperationalState.js').OrderOperationalState} OrderOperationalState */
/** @typedef {import('../../data/seedOrders.js').Order} Order */

/**
 * @param {SalesOrderListItemDto} dto
 * @param {number} n
 */
function parseQty(dto, n) {
  const raw = dto[n]
  const v = typeof raw === 'string' ? Number.parseFloat(raw) : 0
  return Number.isFinite(v) ? v : 0
}

/**
 * @param {SalesOrderListItemDto} dto
 * @param {Order} order
 * @param {string} todayIso
 * @returns {OrderOperationalState}
 */
export function computeOperationalState(dto, order, todayIso) {
  const status = order.status ?? dto.displayStatus
  const dueNum = moneyToNumber(dto.amountDue)
  const termin =
    dto.latestCommittedShipBy ?? dto.earliestCommittedShipBy ?? order.dueDate ?? null
  const terminOverdue =
    status !== 'Teslim Edildi' && typeof termin === 'string' && termin.length >= 8 && termin < todayIso

  /** @type {import('../../contracts/v1/orderOperationalState.js').CommercialState} */
  let commercialState = COMMERCIAL_STATE.CONFIRMED
  if (status === 'Teslim Edildi') commercialState = COMMERCIAL_STATE.CLOSED

  /** @type {import('../../contracts/v1/orderOperationalState.js').FinancialState} */
  let financialState = FINANCIAL_STATE.NOT_DUE
  if (dueNum <= 0.009) {
    financialState = FINANCIAL_STATE.PAID
  } else if (dto.hasOverdueBalance || (terminOverdue && dueNum > 0.009)) {
    financialState = FINANCIAL_STATE.OVERDUE
  } else if (dueNum > 0.009) {
    financialState = FINANCIAL_STATE.PARTIAL
  }

  /** @type {import('../../contracts/v1/orderOperationalState.js').ProductionState} */
  let productionState = PRODUCTION_STATE.NOT_STARTED
  const openMissing = (dto.openMissingItemsCount ?? 0) > 0
  if (openMissing) productionState = PRODUCTION_STATE.ISSUE
  else if (status === 'Hazır' || status === 'Geldi') productionState = PRODUCTION_STATE.READY
  else if (status === 'Üretimde') productionState = PRODUCTION_STATE.IN_PRODUCTION
  else if (status === 'Bekleniyor') productionState = PRODUCTION_STATE.WAITING_FACTORY
  else if (status === 'Teslim Edildi') productionState = PRODUCTION_STATE.READY

  const qtyOrdered = parseQty(dto, 'qtyOrderedTotal')
  const qtyShipped = parseQty(dto, 'qtyShippedTotal')
  const fullyShipped = qtyOrdered > 0.0001 && qtyShipped >= qtyOrdered - 0.0001

  /** @type {import('../../contracts/v1/orderOperationalState.js').FulfillmentState} */
  let fulfillmentState = FULFILLMENT_STATE.NOT_PLANNED
  if (status === 'Teslim Edildi') fulfillmentState = FULFILLMENT_STATE.DELIVERED
  else if ((dto.inTransitShipmentCount ?? 0) > 0) fulfillmentState = FULFILLMENT_STATE.PARTIAL
  else if (dto.partiallyShipped) fulfillmentState = FULFILLMENT_STATE.PARTIAL
  else if (fullyShipped) fulfillmentState = FULFILLMENT_STATE.SHIPPED
  else if ((dto.shipmentSummaryOpenCount ?? 0) > 0) fulfillmentState = FULFILLMENT_STATE.PLANNED

  /** @type {import('../../contracts/v1/orderOperationalState.js').InstallationState} */
  let installationState = INSTALLATION_STATE.NOT_REQUIRED
  if (dto.hasShipmentIssue) installationState = INSTALLATION_STATE.ISSUE
  else if (dto.installationPending) installationState = INSTALLATION_STATE.PENDING
  else if (status === 'Teslim Edildi' && !dto.installationPending) {
    installationState = INSTALLATION_STATE.DONE
  }

  const risk = dto.currentRiskSeverity ?? 'NONE'
  /** @type {import('../../contracts/v1/orderOperationalState.js').OperationalRiskState} */
  const riskState =
    risk in OPERATIONAL_RISK_STATE
      ? /** @type {import('../../contracts/v1/orderOperationalState.js').OperationalRiskState} */ (risk)
      : OPERATIONAL_RISK_STATE.NONE

  return {
    commercialState,
    financialState,
    productionState,
    fulfillmentState,
    installationState,
    riskState,
  }
}
