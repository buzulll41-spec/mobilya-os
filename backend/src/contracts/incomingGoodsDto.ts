import type { IncomingGoodsRecord, OrderLine, SalesOrder, Supplier } from '@prisma/client'
import { incomingGoodsPurposeLabel } from '../constants/incomingGoodsPurpose.js'
import { optionalIsoDate, toIsoDateString } from '../lib/isoDate.js'
import { decimalToNumber } from '../lib/money.js'
import {
  computeLineReadiness,
  computeOrderReadinessSummary,
  fmtQty,
  type ProductReadinessStatus,
  type ProductReadinessTone,
} from '../lib/productReadiness.js'
import { formatMoneyAmount } from '../lib/supplierLedger.js'

export type IncomingGoodsRecordDto = {
  id: string
  supplierId: string
  supplierName: string
  receivedAt: string
  productTitle: string
  productGroup: string | null
  qty: string
  unitPurchasePrice: string
  lineTotal: string
  currency: string
  purpose: string
  purposeLabel: string
  orderLineId: string | null
  salesOrderId: string | null
  orderNumber: string | null
  customerName: string | null
  invoiceNo: string | null
  documentNo: string | null
  note: string | null
  productId: string | null
  createdAt: string
}

export type PendingOrderLineForIncomingDto = {
  orderLineId: string
  salesOrderId: string
  orderNumber: string
  customerName: string
  productTitle: string
  qtyOrdered: string
  qtyReceived: string
  qtyPending: string
  dueDate: string | null
  productId: string | null
  supplierName: string | null
  supplierId: string | null
}

export type OrderLineReceivingDto = {
  orderLineId: string
  title: string
  qtyOrdered: string
  qtyReceived: string
  qtyPending: string
  readinessStatus: ProductReadinessStatus
  readinessLabel: string
  readinessTone: ProductReadinessTone
  badge: ProductReadinessStatus
  badgeLabel: string
  productId: string | null
  defaultSupplierId: string | null
  suggestedPurchasePrice: string | null
}

export type OrderReadinessSummaryDto = {
  readyCount: number
  partialCount: number
  waitingCount: number
  missingCount: number
  totalLines: number
  allReady: boolean
  orderReadyToShip: boolean
  headline: string
  detailLines: string[]
  orderBadgeLabel: string | null
}

export type IncomingGoodsKpisDto = {
  todayCount: number
  customerOrderCount: number
  stockCount: number
  displayCount: number
  totalSupplierDebt: string
  currency: string
}

export function mapIncomingGoodsRecordDto(
  row: IncomingGoodsRecord & { supplier: Pick<Supplier, 'companyName'> },
  orderMeta?: { orderNumber: string; customerName: string } | null,
): IncomingGoodsRecordDto {
  return {
    id: row.id,
    supplierId: row.supplierId,
    supplierName: row.supplier.companyName,
    receivedAt: optionalIsoDate(row.receivedAt) ?? toIsoDateString(row.receivedAt),
    productTitle: row.productTitle,
    productGroup: row.productGroup,
    qty: fmtQty(decimalToNumber(row.qty)),
    unitPurchasePrice: formatMoneyAmount(decimalToNumber(row.unitPurchasePrice)),
    lineTotal: formatMoneyAmount(decimalToNumber(row.lineTotal)),
    currency: row.currency,
    purpose: row.purpose,
    purposeLabel: incomingGoodsPurposeLabel(row.purpose),
    orderLineId: row.orderLineId,
    salesOrderId: row.salesOrderId,
    productId: row.productId,
    orderNumber: orderMeta?.orderNumber ?? null,
    customerName: orderMeta?.customerName ?? null,
    invoiceNo: row.invoiceNo,
    documentNo: row.documentNo,
    note: row.note,
    createdAt: row.createdAt.toISOString(),
  }
}

export function mapPendingOrderLineForIncoming(
  line: OrderLine,
  order: Pick<SalesOrder, 'id' | 'customerName' | 'dueDate'>,
): PendingOrderLineForIncomingDto {
  const ordered = decimalToNumber(line.qtyOrdered)
  const received = decimalToNumber(line.qtyReceived)
  const pending = Math.max(0, ordered - received)
  return {
    orderLineId: line.id,
    salesOrderId: order.id,
    orderNumber: order.id,
    customerName: order.customerName,
    productTitle: line.title,
    qtyOrdered: fmtQty(ordered),
    qtyReceived: fmtQty(received),
    qtyPending: fmtQty(pending),
    dueDate: order.dueDate ? (optionalIsoDate(order.dueDate) ?? toIsoDateString(order.dueDate)) : null,
    productId: line.productId,
    supplierName: line.supplierNameSnapshot ?? null,
    supplierId: line.supplierId ?? null,
  }
}

type OrderLineWithProduct = OrderLine & {
  product?: {
    id: string
    defaultSupplierId: string | null
    purchasePrice: import('@prisma/client').Prisma.Decimal
  } | null
  soldUnitCost?: import('@prisma/client').Prisma.Decimal | null
  supplierId?: string | null
}

export function mapOrderLineReceivingDto(
  line: OrderLineWithProduct,
  hasOpenMissingOnLine = false,
): OrderLineReceivingDto {
  const ordered = decimalToNumber(line.qtyOrdered)
  const received = decimalToNumber(line.qtyReceived)
  const pending = Math.max(0, ordered - received)
  const readiness = computeLineReadiness(ordered, received, hasOpenMissingOnLine)
  const progress =
    received > 0.0001 ? `Gelen: ${fmtQty(received)}/${fmtQty(ordered)}` : null
  const badgeLabel = progress ? `${progress} · ${readiness.label}` : readiness.label
  return {
    orderLineId: line.id,
    title: line.title,
    qtyOrdered: fmtQty(ordered),
    qtyReceived: fmtQty(received),
    qtyPending: fmtQty(pending),
    readinessStatus: readiness.status,
    readinessLabel: readiness.label,
    readinessTone: readiness.tone,
    badge: readiness.status,
    badgeLabel,
    productId: line.productId,
    defaultSupplierId: line.supplierId ?? line.product?.defaultSupplierId ?? null,
    suggestedPurchasePrice: (() => {
      const sold = decimalToNumber(line.soldUnitCost)
      if (sold > 0) return formatMoneyAmount(sold)
      if (line.product) return formatMoneyAmount(decimalToNumber(line.product.purchasePrice))
      return null
    })(),
  }
}

export function mapOrderReadinessSummaryDto(
  lines: OrderLineReceivingDto[],
): OrderReadinessSummaryDto {
  const summary = computeOrderReadinessSummary(
    lines.map((l) => ({ status: l.readinessStatus })),
  )
  return {
    ...summary,
    orderBadgeLabel: summary.orderReadyToShip ? 'Sevke hazır' : null,
  }
}
