import type { PrismaClient } from '@prisma/client'
import { decimalToNumber } from '../lib/money.js'
import { toIsoDateString } from '../lib/isoDate.js'
import {
  buildSupplierLinkage,
  extractSupplierCity,
  filterOpenProductsForSupplier,
  sumLedgerTotals,
  type PendingLineCore,
} from '../lib/supplierOperationsCore.js'
import {
  computeSupplierHealth,
  daysSinceIsoDate,
  formatLastActivityLabel,
} from '../lib/supplierHealth.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../constants/supplierLedgerEntryTypes.js'
import { isOrderLinePendingForIncomingEntry } from '../lib/incomingPendingLineRules.js'

const CLOSED_STATUSES = new Set(['Teslim Edildi', 'İptal'])

export async function loadPendingLinesCore(prisma: PrismaClient): Promise<PendingLineCore[]> {
  const lines = await prisma.orderLine.findMany({
    include: {
      salesOrder: {
        select: { id: true, customerName: true, dueDate: true, displayStatus: true, orderDate: true },
      },
    },
    take: 800,
  })

  const out: PendingLineCore[] = []
  for (const line of lines) {
    if (CLOSED_STATUSES.has(line.salesOrder.displayStatus)) continue
    const ordered = decimalToNumber(line.qtyOrdered)
    const received = decimalToNumber(line.qtyReceived)
    if (
      !isOrderLinePendingForIncomingEntry({
        supplyStatus: line.supplyStatus,
        warehouseEntryStatus: line.warehouseEntryStatus,
        shipmentReady: line.shipmentReady,
        qtyOrdered: ordered,
        qtyReceived: received,
      })
    ) {
      continue
    }
    out.push({
      orderLineId: line.id,
      salesOrderId: line.salesOrderId,
      orderNumber: line.salesOrder.id,
      customerName: line.salesOrder.customerName,
      productTitle: line.title,
      qtyOrdered: ordered,
      qtyReceived: received,
      supplierId: line.supplierId,
      orderDate: toIsoDateString(line.salesOrder.orderDate),
      estimatedUnitCost:
        decimalToNumber(line.soldUnitCost) ||
        (ordered > 0 ? decimalToNumber(line.lineTotal) / ordered : 0) ||
        decimalToNumber(line.unitPrice),
      dueDate: line.salesOrder.dueDate ? toIsoDateString(line.salesOrder.dueDate) : null,
    })
  }
  return out
}

export async function loadIncomingLinksBySupplier(
  prisma: PrismaClient,
): Promise<Map<string, { orderLineId: string | null; salesOrderId: string | null }[]>> {
  const rows = await prisma.incomingGoodsRecord.findMany({
    select: { supplierId: true, orderLineId: true, salesOrderId: true },
  })
  const map = new Map<string, { orderLineId: string | null; salesOrderId: string | null }[]>()
  for (const row of rows) {
    const list = map.get(row.supplierId) ?? []
    list.push({ orderLineId: row.orderLineId, salesOrderId: row.salesOrderId })
    map.set(row.supplierId, list)
  }
  return map
}

export type SupplierOpsMetrics = {
  openProductCount: number
  pendingOrderCount: number
  missingQtyTotal: number
  pendingQtyTotal: number
  hasOverdueDelivery: boolean
  healthStatus: ReturnType<typeof computeSupplierHealth>['status']
  healthLabel: string
  lastActivityLabel: string
  daysSinceLastPayment: number | null
}

export function computeSupplierOpsMetrics(
  pendingLines: PendingLineCore[],
  incomingLinks: { orderLineId: string | null; salesOrderId: string | null }[],
  todayIso: string,
  balance: { openBalance: number; lastMovementAt: Date | null },
  isActive: boolean,
  lastPaymentAt: string | null,
  supplierId: string,
): SupplierOpsMetrics {
  const linkage = buildSupplierLinkage(incomingLinks)
  const ops = filterOpenProductsForSupplier(pendingLines, linkage, todayIso, supplierId)
  const daysSinceLastMovement = daysSinceIsoDate(
    balance.lastMovementAt ? toIsoDateString(balance.lastMovementAt) : null,
    todayIso,
  )
  const daysSinceLastPayment = daysSinceIsoDate(lastPaymentAt, todayIso)
  const health = computeSupplierHealth({
    isActive,
    openBalance: balance.openBalance,
    openProductCount: ops.openProductCount,
    pendingOrderCount: ops.pendingOrderCount,
    missingQtyTotal: ops.missingQtyTotal,
    pendingQtyTotal: ops.pendingQtyTotal,
    hasOverdueDelivery: ops.hasOverdueDelivery,
    daysSinceLastMovement,
    daysSinceLastPayment,
  })
  return {
    openProductCount: ops.openProductCount,
    pendingOrderCount: ops.pendingOrderCount,
    missingQtyTotal: ops.missingQtyTotal,
    pendingQtyTotal: ops.pendingQtyTotal,
    hasOverdueDelivery: ops.hasOverdueDelivery,
    healthStatus: health.status,
    healthLabel: health.label,
    lastActivityLabel: formatLastActivityLabel(daysSinceLastMovement),
    daysSinceLastPayment,
  }
}

export async function loadLastPaymentDates(
  prisma: PrismaClient,
  supplierIds: string[],
): Promise<Map<string, string | null>> {
  const map = new Map<string, string | null>()
  if (!supplierIds.length) return map

  const rows = await prisma.supplierLedgerEntry.findMany({
    where: {
      supplierId: { in: supplierIds },
      entryType: SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT,
    },
    select: { supplierId: true, occurredAt: true },
    orderBy: [{ occurredAt: 'desc' }],
  })

  for (const row of rows) {
    if (!map.has(row.supplierId)) {
      map.set(row.supplierId, toIsoDateString(row.occurredAt))
    }
  }
  for (const id of supplierIds) {
    if (!map.has(id)) map.set(id, null)
  }
  return map
}

export async function estimateOpenProductCost(
  prisma: PrismaClient,
  supplierId: string,
  openProducts: { orderLineId: string; qtyMissing: string; estimatedUnitCost?: string }[],
): Promise<number> {
  if (!openProducts.length) return 0
  const lineIds = openProducts.map((p) => p.orderLineId)
  const priceRows = await prisma.incomingGoodsRecord.findMany({
    where: { supplierId, orderLineId: { in: lineIds } },
    select: { orderLineId: true, unitPurchasePrice: true },
    orderBy: [{ receivedAt: 'desc' }],
  })
  /** @type {Map<string, number>} */
  const unitByLine = new Map()
  for (const row of priceRows) {
    if (!row.orderLineId || unitByLine.has(row.orderLineId)) continue
    unitByLine.set(row.orderLineId, decimalToNumber(row.unitPurchasePrice))
  }
  let sum = 0
  for (const p of openProducts) {
    const fromIncoming = unitByLine.get(p.orderLineId)
    const unit =
      fromIncoming ??
      (p.estimatedUnitCost ? Number.parseFloat(p.estimatedUnitCost) : 0)
    const missing = Number.parseFloat(p.qtyMissing)
    sum += unit * (Number.isFinite(missing) ? missing : 0)
  }
  return sum
}

export { sumLedgerTotals, extractSupplierCity, buildSupplierLinkage, filterOpenProductsForSupplier }
