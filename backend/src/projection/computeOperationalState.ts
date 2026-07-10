import type { SalesOrderListItemDto } from './salesOrderListItemProjection.js'

export const COMMERCIAL_STATE = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  CANCELLED: 'CANCELLED',
  CLOSED: 'CLOSED',
} as const

export const FINANCIAL_STATE = {
  NOT_DUE: 'NOT_DUE',
  PARTIAL: 'PARTIAL',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
} as const

export const PRODUCTION_STATE = {
  NOT_STARTED: 'NOT_STARTED',
  WAITING_FACTORY: 'WAITING_FACTORY',
  IN_PRODUCTION: 'IN_PRODUCTION',
  READY: 'READY',
  ISSUE: 'ISSUE',
} as const

export const FULFILLMENT_STATE = {
  NOT_PLANNED: 'NOT_PLANNED',
  PLANNED: 'PLANNED',
  PARTIAL: 'PARTIAL',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
} as const

export const INSTALLATION_STATE = {
  NOT_REQUIRED: 'NOT_REQUIRED',
  PENDING: 'PENDING',
  DONE: 'DONE',
  ISSUE: 'ISSUE',
} as const

export const OPERATIONAL_RISK_STATE = {
  NONE: 'NONE',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const

export type OrderOperationalState = {
  commercialState: (typeof COMMERCIAL_STATE)[keyof typeof COMMERCIAL_STATE]
  financialState: (typeof FINANCIAL_STATE)[keyof typeof FINANCIAL_STATE]
  productionState: (typeof PRODUCTION_STATE)[keyof typeof PRODUCTION_STATE]
  fulfillmentState: (typeof FULFILLMENT_STATE)[keyof typeof FULFILLMENT_STATE]
  installationState: (typeof INSTALLATION_STATE)[keyof typeof INSTALLATION_STATE]
  riskState: (typeof OPERATIONAL_RISK_STATE)[keyof typeof OPERATIONAL_RISK_STATE]
}

type LegacyOrder = {
  status: string
  dueDate?: string
}

function moneyToNumber(m: { amount: string }): number {
  const n = Number.parseFloat(m.amount)
  return Number.isFinite(n) ? n : 0
}

function parseQty(dto: SalesOrderListItemDto, key: 'qtyOrderedTotal' | 'qtyShippedTotal'): number {
  const raw = dto[key]
  const v = typeof raw === 'string' ? Number.parseFloat(raw) : 0
  return Number.isFinite(v) ? v : 0
}

export function computeOperationalState(
  dto: SalesOrderListItemDto,
  order: LegacyOrder,
  todayIso: string,
): OrderOperationalState {
  const status = order.status ?? dto.displayStatus
  const dueNum = moneyToNumber(dto.amountDue)
  const termin = dto.latestCommittedShipBy ?? dto.earliestCommittedShipBy ?? order.dueDate ?? null
  const terminOverdue =
    status !== 'Teslim Edildi' && typeof termin === 'string' && termin.length >= 8 && termin < todayIso

  let commercialState: OrderOperationalState['commercialState'] = COMMERCIAL_STATE.CONFIRMED
  if (status === 'Teslim Edildi') commercialState = COMMERCIAL_STATE.CLOSED

  let financialState: OrderOperationalState['financialState'] = FINANCIAL_STATE.NOT_DUE
  if (dueNum <= 0.009) financialState = FINANCIAL_STATE.PAID
  else if (dto.hasOverdueBalance || (terminOverdue && dueNum > 0.009)) financialState = FINANCIAL_STATE.OVERDUE
  else if (dueNum > 0.009) financialState = FINANCIAL_STATE.PARTIAL

  let productionState: OrderOperationalState['productionState'] = PRODUCTION_STATE.NOT_STARTED
  const openMissing = (dto.openMissingItemsCount ?? 0) > 0
  if (openMissing) productionState = PRODUCTION_STATE.ISSUE
  else if (status === 'Hazır' || status === 'Geldi') productionState = PRODUCTION_STATE.READY
  else if (status === 'Üretimde') productionState = PRODUCTION_STATE.IN_PRODUCTION
  else if (status === 'Bekleniyor') productionState = PRODUCTION_STATE.WAITING_FACTORY
  else if (status === 'Teslim Edildi') productionState = PRODUCTION_STATE.READY

  const qtyOrdered = parseQty(dto, 'qtyOrderedTotal')
  const qtyShipped = parseQty(dto, 'qtyShippedTotal')
  const fullyShipped = qtyOrdered > 0.0001 && qtyShipped >= qtyOrdered - 0.0001

  let fulfillmentState: OrderOperationalState['fulfillmentState'] = FULFILLMENT_STATE.NOT_PLANNED
  if (status === 'Teslim Edildi') fulfillmentState = FULFILLMENT_STATE.DELIVERED
  else if ((dto.inTransitShipmentCount ?? 0) > 0) fulfillmentState = FULFILLMENT_STATE.PARTIAL
  else if (dto.partiallyShipped) fulfillmentState = FULFILLMENT_STATE.PARTIAL
  else if (fullyShipped) fulfillmentState = FULFILLMENT_STATE.SHIPPED
  else if ((dto.shipmentSummaryOpenCount ?? 0) > 0) fulfillmentState = FULFILLMENT_STATE.PLANNED

  let installationState: OrderOperationalState['installationState'] = INSTALLATION_STATE.NOT_REQUIRED
  if (dto.hasShipmentIssue) installationState = INSTALLATION_STATE.ISSUE
  else if (dto.installationPending) installationState = INSTALLATION_STATE.PENDING
  else if (status === 'Teslim Edildi' && !dto.installationPending) {
    installationState = INSTALLATION_STATE.DONE
  }

  const risk = dto.currentRiskSeverity ?? 'NONE'
  const riskState = (OPERATIONAL_RISK_STATE[risk as keyof typeof OPERATIONAL_RISK_STATE] ??
    OPERATIONAL_RISK_STATE.NONE) as OrderOperationalState['riskState']

  return {
    commercialState,
    financialState,
    productionState,
    fulfillmentState,
    installationState,
    riskState,
  }
}

export function attachOperationalState(
  dto: SalesOrderListItemDto,
  order: LegacyOrder,
  todayIso: string,
): SalesOrderListItemDto {
  return {
    ...dto,
    operationalState: computeOperationalState(dto, order, todayIso),
  }
}
