import type { OrderLine, PaymentTransaction, SalesOrder, Shipment, ShipmentLine, ShipmentPlan } from '@prisma/client'
import { decimalToNumber, moneyToNumber, numberToMoney, type Money } from '../lib/money.js'
import {
  OPEN_SHIPMENT_PIPELINE,
  SHIPPED_QTY_STATUSES,
  normalizeShipmentStatusValue,
} from '../constants/shipmentStatuses.js'
import { attachOperationalState } from './computeOperationalState.js'
import { deriveShipmentInstallationSummary } from './deriveShipmentInstallationSummary.js'
import { enrichSalesOrderListItemWithMissingItemsSummary } from './enrichMissingItemsSummary.js'
import {
  deriveOrderDisplayStatusFromLines,
  fulfillmentProgressFromDerivedDisplayStatus,
  type OrderLineDisplayStatusInput,
} from '../lib/deriveOrderDisplayStatus.js'
import { countOpenMissingItems } from '../lib/autoShipmentReady.js'
import { resolveShipmentAwareDisplayStatus } from '../lib/orderShipmentDisplayStatus.js'

const DEFAULT_CURRENCY = 'TRY'

const ORDER_CHANNELS = { STORE: 'STORE' } as const

const SALES_ORDER_LIFECYCLE = {
  DRAFT: 'DRAFT',
  CONFIRMED: 'CONFIRMED',
  IN_FULFILLMENT: 'IN_FULFILLMENT',
  PARTIALLY_SHIPPED: 'PARTIALLY_SHIPPED',
  SHIPPED: 'SHIPPED',
  DELIVERED: 'DELIVERED',
  CLOSED: 'CLOSED',
  CANCELLED: 'CANCELLED',
} as const

const RISK_SEVERITY = {
  NONE: 'NONE',
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const

const SHIPMENT_STATUS = {
  PLANNED: 'PLANNED',
  PICKING: 'PICKING',
  READY_TO_DISPATCH: 'READY_TO_DISPATCH',
  DISPATCHED: 'DISPATCHED',
  CLOSED: 'CLOSED',
  ON_HOLD: 'ON_HOLD',
  CANCELLED: 'CANCELLED',
} as const

const PAYMENT_TRANSACTION_KIND = {
  CAPTURE: 'CAPTURE',
  MAIL_ORDER: 'MAIL_ORDER',
  REFUND: 'REFUND',
  ADJUSTMENT: 'ADJUSTMENT',
  CHARGEBACK: 'CHARGEBACK',
} as const

const PAYMENT_TRANSACTION_STATUS = {
  PENDING: 'PENDING',
  POSTED: 'POSTED',
  FAILED: 'FAILED',
  CANCELLED: 'CANCELLED',
} as const

type SalesOrderLifecycleStatus = (typeof SALES_ORDER_LIFECYCLE)[keyof typeof SALES_ORDER_LIFECYCLE]
type RiskSeverity = (typeof RISK_SEVERITY)[keyof typeof RISK_SEVERITY]
type ShipmentStatus = (typeof SHIPMENT_STATUS)[keyof typeof SHIPMENT_STATUS]
type PaymentKind = (typeof PAYMENT_TRANSACTION_KIND)[keyof typeof PAYMENT_TRANSACTION_KIND]
type PaymentStatus = (typeof PAYMENT_TRANSACTION_STATUS)[keyof typeof PAYMENT_TRANSACTION_STATUS]

/** Liste DTO — client `SalesOrderListItemDto` ile aynı wire */
export type SalesOrderListItemDto = {
  id: string
  orderNumber: string
  customerId: string
  customerDisplayName: string
  customerPhone: string | null
  channel: string
  currency: string
  placedAt: string
  createdAt?: string
  lifecycleStatus: SalesOrderLifecycleStatus
  version: number
  subtotalAmount: Money
  discountAmount: Money
  totalAmount: Money
  amountPaid: Money
  amountDue: Money
  remainingAmount: Money
  fulfillmentProgress: number
  currentRiskSeverity: RiskSeverity
  earliestCommittedShipBy: string | null
  latestCommittedShipBy: string | null
  lineSummaryTitle: string
  displayStatus: string
  plannedShipmentDate: string | null
  salesPerson: string | null | undefined
  lineCostAmount: Money | null
  notesSnapshot: string | null
  qtyOrderedTotal?: string
  qtyShippedTotal?: string
  remainingQty?: string
  partiallyShipped?: boolean
  shipmentSummaryOpenCount?: number
  shipmentSummaryNextPlannedDate?: string | null
  paymentProgress?: number
  hasOverdueBalance?: boolean
  lastPaymentAt?: string | null
  riskSignalOverduePartialShipment?: boolean
  missingItemsCount?: number
  openMissingItemsCount?: number
  resolvedMissingItemsCount?: number
  missingItemsOpenStatusCount?: number
  hasShipmentIssue?: boolean
  installationPending?: boolean
  inTransitShipmentCount?: number
  operationalState?: import('./computeOperationalState.js').OrderOperationalState
  pendingApprovalPaymentCount?: number
  pendingMailOrderApprovalCount?: number
}

type LegacyOrder = {
  id: string
  customer: string
  phone?: string | null
  product: string
  status: string
  amount: number
  subtotalAmount?: number
  discountAmount?: number
  remainingAmount?: number
  cost?: number
  orderDate: string
  dueDate?: string
  shipmentDate?: string | null
  paid?: boolean
  paidAmount?: number
  notes?: string | null
  salesPerson?: string | null
}

type ShipmentLineDto = { id: string; shipmentId: string; orderLineId: string; qty: string }
type ShipmentDto = {
  id: string
  salesOrderId: string
  shipmentNumber: string
  status: ShipmentStatus
  originLocationId: string
  plannedShipDate: string | null
  actualShipDate: string | null
  version: number
  lines: ShipmentLineDto[]
}

type PaymentTransactionDto = {
  id: string
  salesOrderId: string
  kind: PaymentKind
  status: PaymentStatus
  amount: Money
  occurredAt: string
}

type OrderLineSeed = { id: string; salesOrderId: string; qtyOrdered: string }

const STATUS_TO_LIFECYCLE: Record<string, SalesOrderLifecycleStatus> = {
  Bekleniyor: SALES_ORDER_LIFECYCLE.CONFIRMED,
  Üretimde: SALES_ORDER_LIFECYCLE.IN_FULFILLMENT,
  Geldi: SALES_ORDER_LIFECYCLE.IN_FULFILLMENT,
  'Kısmi Geldi': SALES_ORDER_LIFECYCLE.IN_FULFILLMENT,
  'Eksik Var': SALES_ORDER_LIFECYCLE.IN_FULFILLMENT,
  Hazır: SALES_ORDER_LIFECYCLE.IN_FULFILLMENT,
  'Sevke Hazır': SALES_ORDER_LIFECYCLE.IN_FULFILLMENT,
  'Teslim Edildi': SALES_ORDER_LIFECYCLE.DELIVERED,
}

function fulfillmentProgressFromStatus(status: string): number {
  return fulfillmentProgressFromDerivedDisplayStatus(status)
}

function mapLineDisplayStatusInputs(row: SalesOrderWithRelations): OrderLineDisplayStatusInput[] {
  return row.lines.map((line) => ({
    warehouseEntryStatus: line.warehouseEntryStatus,
    shipmentReady: line.shipmentReady,
  }))
}

function enrichSalesOrderListItemWithDerivedDisplayStatus(
  dto: SalesOrderListItemDto,
  lines: OrderLineDisplayStatusInput[],
  storedDisplayStatus: string,
  openMissingItemsCount: number,
): SalesOrderListItemDto {
  const displayStatus = storedDisplayStatus.trim()
    ? storedDisplayStatus
    : deriveOrderDisplayStatusFromLines(lines, storedDisplayStatus, {
        openMissingItemsCount,
      })
  return {
    ...dto,
    displayStatus,
    fulfillmentProgress: fulfillmentProgressFromDerivedDisplayStatus(displayStatus),
    lifecycleStatus: STATUS_TO_LIFECYCLE[displayStatus] ?? dto.lifecycleStatus,
  }
}

function riskSeverityFromOrder(o: LegacyOrder, todayIso: string): RiskSeverity {
  if (o.status === 'Eksik Var') return RISK_SEVERITY.HIGH
  if (o.status !== 'Teslim Edildi' && o.dueDate && o.dueDate < todayIso) return RISK_SEVERITY.MEDIUM
  return RISK_SEVERITY.NONE
}

function remainingBalance(o: LegacyOrder): number {
  if (typeof o.remainingAmount === 'number') return Math.max(0, o.remainingAmount)
  if (o.paid) return 0
  const collected = o.paidAmount ?? 0
  return Math.max(0, o.amount - collected)
}

function legacyOrderToSalesOrderListItemDto(order: LegacyOrder, todayIso: string): SalesOrderListItemDto {
  const currency = DEFAULT_CURRENCY
  const total = order.amount
  const subtotal = order.subtotalAmount ?? total
  const discount = order.discountAmount ?? 0
  const paidTotal = order.paid ? total : (order.paidAmount ?? 0)
  const due = remainingBalance(order)
  const lifecycle = STATUS_TO_LIFECYCLE[order.status] ?? SALES_ORDER_LIFECYCLE.IN_FULFILLMENT

  return {
    id: order.id,
    orderNumber: order.id,
    customerId: `C-${order.id.replace(/[^a-zA-Z0-9]/g, '')}`,
    customerDisplayName: order.customer,
    customerPhone: order.phone ?? null,
    channel: ORDER_CHANNELS.STORE,
    currency,
    placedAt: `${order.orderDate}T10:00:00.000Z`,
    lifecycleStatus: lifecycle,
    version: 1,
    subtotalAmount: numberToMoney(subtotal, currency),
    discountAmount: numberToMoney(discount, currency),
    totalAmount: numberToMoney(total, currency),
    amountPaid: numberToMoney(paidTotal, currency),
    amountDue: numberToMoney(due, currency),
    remainingAmount: numberToMoney(due, currency),
    fulfillmentProgress: fulfillmentProgressFromStatus(order.status),
    currentRiskSeverity: riskSeverityFromOrder(order, todayIso),
    earliestCommittedShipBy: order.dueDate ?? null,
    latestCommittedShipBy: order.dueDate ?? null,
    lineSummaryTitle: order.product,
    displayStatus: order.status,
    plannedShipmentDate: order.shipmentDate ?? null,
    salesPerson: order.salesPerson,
    lineCostAmount: typeof order.cost === 'number' ? numberToMoney(order.cost, currency) : null,
    notesSnapshot: order.notes ?? null,
  }
}


function parseDec(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function formatDec(n: number): string {
  return n.toFixed(2)
}

function effectiveLineSeeds(lineSeeds: OrderLineSeed[], order: LegacyOrder): OrderLineSeed[] {
  if (lineSeeds.length) return lineSeeds
  return [{ id: `OL-${order.id}-1`, salesOrderId: order.id, qtyOrdered: '1.00' }]
}

function qtyShippedCompleted(shipments: ShipmentDto[]): number {
  let q = 0
  for (const sh of shipments) {
    if (!SHIPPED_QTY_STATUSES.has(normalizeShipmentStatusValue(String(sh.status)))) continue
    for (const ln of sh.lines) {
      q += parseDec(ln.qty)
    }
  }
  return q
}

function openPipelineShipments(shipments: ShipmentDto[]): ShipmentDto[] {
  return shipments.filter((s) => OPEN_SHIPMENT_PIPELINE.has(normalizeShipmentStatusValue(String(s.status))))
}

function nextPlannedShipDate(openShipments: ShipmentDto[], fallbackDate: string | null | undefined): string | null {
  const dates = openShipments
    .map((s) => s.plannedShipDate)
    .filter((d): d is string => typeof d === 'string' && d.length >= 8)
  if (!dates.length) return fallbackDate ?? null
  return [...dates].sort()[0] ?? null
}

function enrichSalesOrderListItemWithShipmentSummary(
  dto: SalesOrderListItemDto,
  order: LegacyOrder,
  shipments: ShipmentDto[],
  lineSeeds: OrderLineSeed[],
): SalesOrderListItemDto {
  const seeds = effectiveLineSeeds(lineSeeds, order)
  let qtyOrdered = 0
  for (const s of seeds) qtyOrdered += parseDec(s.qtyOrdered)

  const shipped = qtyShippedCompleted(shipments)
  const remaining = Math.max(0, qtyOrdered - shipped)
  const partiallyShipped = shipped > 0.0001 && remaining > 0.0001

  const open = openPipelineShipments(shipments)
  const shipmentSummaryOpenCount = open.length
  const fallbackShip = order.shipmentDate ?? dto.plannedShipmentDate ?? null
  const shipmentSummaryNextPlannedDate =
    nextPlannedShipDate(open, fallbackShip) ?? (remaining > 0.0001 ? fallbackShip : null)

  const install = deriveShipmentInstallationSummary(
    shipments.map((s) => ({ status: String(s.status) })),
  )

  return {
    ...dto,
    qtyOrderedTotal: formatDec(qtyOrdered),
    qtyShippedTotal: formatDec(shipped),
    remainingQty: formatDec(remaining),
    partiallyShipped,
    shipmentSummaryOpenCount,
    shipmentSummaryNextPlannedDate,
    hasShipmentIssue: install.hasShipmentIssue,
    installationPending: install.installationPending,
    inTransitShipmentCount: install.inTransitShipmentCount,
  }
}

function ledgerPostedTotal(transactions: PaymentTransactionDto[]): number {
  let sum = 0
  for (const tx of transactions) {
    if (tx.status !== PAYMENT_TRANSACTION_STATUS.POSTED) continue
    const v = moneyToNumber(tx.amount)
    if (tx.kind === PAYMENT_TRANSACTION_KIND.CAPTURE) sum += v
    else if (tx.kind === PAYMENT_TRANSACTION_KIND.MAIL_ORDER) sum += v
    else if (tx.kind === PAYMENT_TRANSACTION_KIND.REFUND) sum -= v
    else if (tx.kind === PAYMENT_TRANSACTION_KIND.ADJUSTMENT) sum += v
    else if (tx.kind === PAYMENT_TRANSACTION_KIND.CHARGEBACK) sum -= v
  }
  return Math.max(0, sum)
}

function lastPostedCaptureAt(transactions: PaymentTransactionDto[]): string | null {
  const times: string[] = []
  for (const tx of transactions) {
    if (tx.status !== PAYMENT_TRANSACTION_STATUS.POSTED) continue
    if (tx.kind !== PAYMENT_TRANSACTION_KIND.CAPTURE) continue
    times.push(tx.occurredAt)
  }
  if (!times.length) return null
  return times.sort().at(-1) ?? null
}

function terminOverdue(order: LegacyOrder, todayIso: string): boolean {
  if (order.status === 'Teslim Edildi') return false
  if (!order.dueDate) return false
  return order.dueDate < todayIso
}

function enrichSalesOrderListItemWithPaymentSummary(
  dto: SalesOrderListItemDto,
  order: LegacyOrder,
  transactions: PaymentTransactionDto[],
  todayIso: string,
): SalesOrderListItemDto {
  const currency = dto.currency
  const total = moneyToNumber(dto.totalAmount)

  const ledgerPaid = ledgerPostedTotal(transactions)
  const paidNum = transactions.length > 0 ? ledgerPaid : moneyToNumber(dto.amountPaid)

  const dueNum = Math.max(0, total - paidNum)
  const paymentProgress = total > 0.0001 ? Math.min(1, paidNum / total) : 0
  const overdueBal = dueNum > 0.009 && terminOverdue(order, todayIso)
  const lastAt = transactions.length ? lastPostedCaptureAt(transactions) : null

  return {
    ...dto,
    amountPaid: numberToMoney(paidNum, currency),
    amountDue: numberToMoney(dueNum, currency),
    remainingAmount: numberToMoney(dueNum, currency),
    paymentProgress,
    hasOverdueBalance: overdueBal,
    lastPaymentAt: lastAt,
  }
}

const RISK_RANK: Record<RiskSeverity, number> = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
}

function maxRiskSeverity(a: RiskSeverity, b: RiskSeverity): RiskSeverity {
  return RISK_RANK[a] >= RISK_RANK[b] ? a : b
}

function orderHasAnyShipmentActivity(d: SalesOrderListItemDto): boolean {
  const shipped = Number.parseFloat(d.qtyShippedTotal ?? '0')
  const open = d.shipmentSummaryOpenCount ?? 0
  const transit = d.inTransitShipmentCount ?? 0
  return open > 0 || transit > 0 || (Number.isFinite(shipped) && shipped > 0.0001)
}

function applyCompositeListItemRisk(dto: SalesOrderListItemDto, order: LegacyOrder, todayIso: string): SalesOrderListItemDto {
  const overdueTermin =
    order.status !== 'Teslim Edildi' && order.dueDate != null && order.dueDate < todayIso
  const partialShip = Boolean(dto.partiallyShipped)
  const riskSignalOverduePartialShipment = overdueTermin && partialShip

  let currentRiskSeverity: RiskSeverity = RISK_SEVERITY.NONE
  const openMissing = (dto.openMissingItemsCount ?? 0) > 0
  const hasShipmentIssue = Boolean(dto.hasShipmentIssue)
  const noShipmentPlan =
    (dto.shipmentSummaryOpenCount ?? 0) === 0 &&
    !orderHasAnyShipmentActivity(dto) &&
    order.status !== 'Teslim Edildi'

  if (openMissing || hasShipmentIssue) {
    currentRiskSeverity = RISK_SEVERITY.HIGH
  } else if (riskSignalOverduePartialShipment) {
    currentRiskSeverity = RISK_SEVERITY.HIGH
  } else if (overdueTermin && noShipmentPlan) {
    currentRiskSeverity = RISK_SEVERITY.HIGH
  } else if (overdueTermin) {
    currentRiskSeverity = RISK_SEVERITY.MEDIUM
  }

  if ((dto.missingItemsOpenStatusCount ?? 0) > 0) {
    currentRiskSeverity = maxRiskSeverity(currentRiskSeverity, RISK_SEVERITY.MEDIUM)
  }

  return {
    ...dto,
    currentRiskSeverity,
    riskSignalOverduePartialShipment,
  }
}

export function toIsoDate(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function optionalIsoDate(d: Date | null): string | undefined {
  if (!d) return undefined
  return toIsoDate(d)
}

function optionalIsoDateOrNull(d: Date | null): string | null {
  if (!d) return null
  return toIsoDate(d)
}

export type SalesOrderWithRelations = SalesOrder & {
  lines: OrderLine[]
  payments: PaymentTransaction[]
  shipments: (Shipment & { lines: ShipmentLine[] })[]
  shipmentPlans?: ShipmentPlan[]
  missingItems: { status: string }[]
}

function mapDbOrderToLegacy(row: SalesOrderWithRelations): LegacyOrder {
  const total = decimalToNumber(row.totalAmount)
  const subtotal = decimalToNumber(row.subtotalAmount)
  const discount = decimalToNumber(row.discountAmount)
  const paidAmt = decimalToNumber(row.paidAmount)
  const remaining = decimalToNumber(row.remainingAmount)
  return {
    id: row.id,
    customer: row.customerName,
    phone: row.customerPhone,
    product: row.productSummary,
    status: row.displayStatus,
    amount: total,
    subtotalAmount: subtotal,
    discountAmount: discount,
    remainingAmount: remaining,
    cost: row.lineCostAmount != null ? decimalToNumber(row.lineCostAmount) : undefined,
    orderDate: toIsoDate(row.orderDate),
    dueDate: optionalIsoDate(row.dueDate),
    shipmentDate: optionalIsoDateOrNull(row.shipmentDate),
    paid: row.isFullyPaid,
    paidAmount: paidAmt,
    notes: row.notes,
    salesPerson: row.salesPerson,
  }
}

function mapShipments(row: SalesOrderWithRelations): ShipmentDto[] {
  return row.shipments.map((sh) => ({
    id: sh.id,
    salesOrderId: sh.salesOrderId,
    shipmentNumber: sh.id,
    status: sh.status as ShipmentStatus,
    originLocationId: 'WH-1',
    plannedShipDate: optionalIsoDateOrNull(sh.plannedShipDate),
    actualShipDate: null,
    version: 1,
    lines: sh.lines.map((ln) => ({
      id: ln.id,
      shipmentId: ln.shipmentId,
      orderLineId: ln.orderLineId,
      qty: decimalToNumber(ln.qty).toFixed(2),
    })),
  }))
}

function mapPayments(row: SalesOrderWithRelations): PaymentTransactionDto[] {
  return row.payments.map((p) => ({
    id: p.id,
    salesOrderId: p.salesOrderId,
    kind: p.kind as PaymentKind,
    status: p.status as PaymentStatus,
    amount: numberToMoney(decimalToNumber(p.amount), p.currency || DEFAULT_CURRENCY),
    occurredAt: p.occurredAt.toISOString(),
  }))
}

function mapLineSeeds(row: SalesOrderWithRelations): OrderLineSeed[] {
  return row.lines.map((ln) => ({
    id: ln.id,
    salesOrderId: ln.salesOrderId,
    qtyOrdered: decimalToNumber(ln.qtyOrdered).toFixed(2),
  }))
}

/**
 * DB aggregate + client ile aynı liste projection kuralları (`DEMO_TODAY` env ile).
 */
export function projectSalesOrderListItemFromDbRow(row: SalesOrderWithRelations, todayIso: string): SalesOrderListItemDto {
  const order = mapDbOrderToLegacy(row)
  const shipments = mapShipments(row)
  const payments = mapPayments(row)
  const lineSeeds = mapLineSeeds(row)

  const base = legacyOrderToSalesOrderListItemDto(order, todayIso)
  const openMissingItemsCount = countOpenMissingItems(row.missingItems ?? [])
  const withDerivedStatus = enrichSalesOrderListItemWithDerivedDisplayStatus(
    base,
    mapLineDisplayStatusInputs(row),
    row.displayStatus,
    openMissingItemsCount,
  )
  const plan = row.shipmentPlans?.[0]
  const withShipmentDisplay = {
    ...withDerivedStatus,
    displayStatus: resolveShipmentAwareDisplayStatus(
      withDerivedStatus.displayStatus,
      row.shipments ?? [],
      plan ? { status: plan.status } : undefined,
    ),
  }
  const pendingApprovalPaymentCount = row.payments.filter((p) => p.status === 'PENDING_APPROVAL').length
  const pendingMailOrderApprovalCount = row.payments.filter(
    (p) => p.status === 'PENDING_APPROVAL' && p.kind === 'MAIL_ORDER',
  ).length
  const withShip = enrichSalesOrderListItemWithShipmentSummary(withShipmentDisplay, order, shipments, lineSeeds)
  const withPay = enrichSalesOrderListItemWithPaymentSummary(withShip, order, payments, todayIso)
  const withMissing = enrichSalesOrderListItemWithMissingItemsSummary(withPay, row.missingItems ?? [])
  const projected = attachOperationalState(
    applyCompositeListItemRisk(withMissing, order, todayIso),
    order,
    todayIso,
  )
  return {
    ...projected,
    pendingApprovalPaymentCount,
    pendingMailOrderApprovalCount,
    createdAt: row.createdAt.toISOString(),
  }
}
