import { numberToMoney } from './moneyHelpers.js'
import { computeOperationalState } from './operational/computeOperationalState.js'
import { DEMO_TODAY } from '../data/constants.js'

/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../contracts/v1/money.js').Money} Money */

/**
 * @param {unknown} value
 * @returns {Money}
 */
/** @param {unknown} value */
function coerceCount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value)
    return Number.isFinite(n) ? n : 0
  }
  return 0
}

function coerceMoney(value, currency = 'TRY') {
  if (value && typeof value === 'object' && 'amount' in value) {
    const amount = String(/** @type {{ amount: unknown }} */ (value).amount)
    const cur =
      'currency' in value && typeof /** @type {{ currency?: string }} */ (value).currency === 'string'
        ? /** @type {{ currency: string }} */ (value).currency
        : currency
    return { amount, currency: cur }
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return numberToMoney(value, currency)
  }
  return numberToMoney(0, currency)
}

/** @typedef {import('../contracts/v1/orderOperationalState.js').OrderOperationalState} OrderOperationalState */

/**
 * @param {unknown} raw
 * @returns {OrderOperationalState | undefined}
 */
function coerceOperationalState(raw) {
  if (!raw || typeof raw !== 'object') return undefined
  const o = /** @type {Record<string, unknown>} */ (raw)
  const keys = [
    'commercialState',
    'financialState',
    'productionState',
    'fulfillmentState',
    'installationState',
    'riskState',
  ]
  if (!keys.every((k) => typeof o[k] === 'string')) return undefined
  return /** @type {OrderOperationalState} */ (o)
}

/**
 * API wire → güvenli liste DTO (eksik alanlarda render crash önlenir).
 * @param {unknown} raw
 * @returns {SalesOrderListItemDto}
 */
export function normalizeSalesOrderListItemDto(raw) {
  const r = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
  const currency = typeof r.currency === 'string' ? r.currency : 'TRY'
  const id = typeof r.id === 'string' ? r.id : ''
  const placedAt =
    typeof r.placedAt === 'string' && r.placedAt.length >= 10
      ? r.placedAt
      : '2026-05-14T10:00:00.000Z'

  /** @type {SalesOrderListItemDto} */
  const dto = {
    id,
    orderNumber: typeof r.orderNumber === 'string' ? r.orderNumber : id,
    customerId: typeof r.customerId === 'string' ? r.customerId : `C-${id.replace(/[^a-zA-Z0-9]/g, '')}`,
    customerDisplayName: typeof r.customerDisplayName === 'string' ? r.customerDisplayName : '—',
    customerPhone: typeof r.customerPhone === 'string' ? r.customerPhone : null,
    channel: typeof r.channel === 'string' ? /** @type {SalesOrderListItemDto['channel']} */ (r.channel) : 'STORE',
    currency,
    placedAt,
    ...(typeof r.createdAt === 'string' && r.createdAt.length >= 10
      ? { createdAt: r.createdAt }
      : {}),
    lifecycleStatus:
      typeof r.lifecycleStatus === 'string'
        ? /** @type {SalesOrderListItemDto['lifecycleStatus']} */ (r.lifecycleStatus)
        : 'IN_FULFILLMENT',
    version: typeof r.version === 'number' ? r.version : 1,
    subtotalAmount: coerceMoney(r.subtotalAmount ?? r.totalAmount, currency),
    discountAmount: coerceMoney(r.discountAmount, currency),
    totalAmount: coerceMoney(r.totalAmount, currency),
    amountPaid: coerceMoney(r.amountPaid, currency),
    amountDue: coerceMoney(r.amountDue, currency),
    remainingAmount: coerceMoney(r.remainingAmount ?? r.amountDue, currency),
    fulfillmentProgress: typeof r.fulfillmentProgress === 'number' ? r.fulfillmentProgress : 0.2,
    currentRiskSeverity:
      typeof r.currentRiskSeverity === 'string'
        ? /** @type {SalesOrderListItemDto['currentRiskSeverity']} */ (r.currentRiskSeverity)
        : 'NONE',
    earliestCommittedShipBy:
      typeof r.earliestCommittedShipBy === 'string' ? r.earliestCommittedShipBy : null,
    latestCommittedShipBy: typeof r.latestCommittedShipBy === 'string' ? r.latestCommittedShipBy : null,
    lineSummaryTitle: typeof r.lineSummaryTitle === 'string' ? r.lineSummaryTitle : '—',
    displayStatus: typeof r.displayStatus === 'string' ? r.displayStatus : 'Bekleniyor',
    plannedShipmentDate: typeof r.plannedShipmentDate === 'string' ? r.plannedShipmentDate : null,
    salesPerson: typeof r.salesPerson === 'string' ? r.salesPerson : undefined,
    lineCostAmount:
      r.lineCostAmount != null ? coerceMoney(r.lineCostAmount, currency) : null,
    notesSnapshot: typeof r.notesSnapshot === 'string' ? r.notesSnapshot : null,
    qtyOrderedTotal: typeof r.qtyOrderedTotal === 'string' ? r.qtyOrderedTotal : '1.00',
    qtyShippedTotal: typeof r.qtyShippedTotal === 'string' ? r.qtyShippedTotal : '0.00',
    remainingQty: typeof r.remainingQty === 'string' ? r.remainingQty : '1.00',
    partiallyShipped: Boolean(r.partiallyShipped),
    shipmentSummaryOpenCount:
      typeof r.shipmentSummaryOpenCount === 'number' ? r.shipmentSummaryOpenCount : 0,
    shipmentSummaryNextPlannedDate:
      typeof r.shipmentSummaryNextPlannedDate === 'string' ? r.shipmentSummaryNextPlannedDate : null,
    hasShipmentIssue: Boolean(r.hasShipmentIssue),
    installationPending: Boolean(r.installationPending),
    inTransitShipmentCount:
      typeof r.inTransitShipmentCount === 'number' ? r.inTransitShipmentCount : 0,
    paymentProgress: typeof r.paymentProgress === 'number' ? r.paymentProgress : 0,
    hasOverdueBalance: Boolean(r.hasOverdueBalance),
    lastPaymentAt: typeof r.lastPaymentAt === 'string' ? r.lastPaymentAt : null,
    riskSignalOverduePartialShipment: Boolean(r.riskSignalOverduePartialShipment),
    missingItemsCount: coerceCount(r.missingItemsCount),
    openMissingItemsCount: coerceCount(r.openMissingItemsCount),
    resolvedMissingItemsCount: coerceCount(r.resolvedMissingItemsCount),
    missingItemsOpenStatusCount: coerceCount(r.missingItemsOpenStatusCount),
    pendingApprovalPaymentCount: coerceCount(r.pendingApprovalPaymentCount),
    pendingApprovalPaymentAmount: coerceCount(r.pendingApprovalPaymentAmount),
    pendingMailOrderApprovalCount: coerceCount(r.pendingMailOrderApprovalCount),
    operationalState: /** @type {OrderOperationalState} */ ({
      commercialState: 'CONFIRMED',
      financialState: 'NOT_DUE',
      productionState: 'NOT_STARTED',
      fulfillmentState: 'NOT_PLANNED',
      installationState: 'NOT_REQUIRED',
      riskState: 'NONE',
    }),
  }

  const preserved = coerceOperationalState(r.operationalState)
  dto.operationalState =
    preserved ??
    computeOperationalState(dto, {
      status: dto.displayStatus,
      dueDate: dto.latestCommittedShipBy ?? dto.earliestCommittedShipBy ?? undefined,
    }, DEMO_TODAY)

  return dto
}
