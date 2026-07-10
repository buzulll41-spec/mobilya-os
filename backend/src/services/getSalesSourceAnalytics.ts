import type { PrismaClient } from '@prisma/client'
import { decimalToNumber } from '../lib/money.js'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { isIsoDateString } from '../lib/isoDate.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import {
  resolveSalesSourceBucket,
  SALES_SOURCE_BUCKETS,
  type SalesSourceBucket,
} from '../constants/salesSourceBuckets.js'
import type {
  SalesSourceAnalyticsResponseDto,
  SalesSourceAnalyticsRowDto,
} from '../contracts/salesSourceAnalyticsDto.js'

export type SalesSourceAnalyticsQuery = {
  from?: string
  to?: string
  salesPerson?: string
  salesSourceType?: string
  displayFloor?: string
  externalSupplyType?: string
  category?: string
  supplierId?: string
}

/** Aggregation girdisi — DB'den bağımsız (birim test için). */
export type AnalyticsLineInput = {
  lineTotal: number
  qtyOrdered: number
  soldUnitCost: number | null
  soldSalesSourceType: string | null
  soldDisplayFloor: string | null
  soldExternalSupplyType: string | null
  category: string | null
  supplierId: string | null
}

export type AnalyticsOrderInput = {
  id: string
  orderDate: string // ISO yyyy-mm-dd
  salesPerson: string | null
  paidAmount: number
  remainingAmount: number
  lines: AnalyticsLineInput[]
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function trimOrUndef(v?: string): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

type Accumulator = {
  bucket: SalesSourceBucket
  salesCount: number
  unitsSold: number
  revenue: number
  purchaseCost: number
  collected: number
  openBalance: number
  orderIds: Set<string>
}

/**
 * Saf aggregation: satış kalemi snapshot'larına göre kırılım üretir.
 * Sipariş seviyesi tahsilat / açık bakiye, kalemin ciro oranına göre dağıtılır
 * (denominator = siparişin TÜM kalemlerinin ciro toplamı).
 *
 * Depo Katı (physicalLocation) bu fonksiyona hiç girmez — bucket yalnızca
 * satış kaynağı snapshot'ından türetilir.
 */
export function aggregateSalesSourceAnalytics(
  orders: AnalyticsOrderInput[],
  query: SalesSourceAnalyticsQuery = {},
): SalesSourceAnalyticsResponseDto {
  const fSource = trimOrUndef(query.salesSourceType)
  const fFloor = trimOrUndef(query.displayFloor)
  const fExt = trimOrUndef(query.externalSupplyType)
  const fCategory = trimOrUndef(query.category)
  const fSupplier = trimOrUndef(query.supplierId)
  const fSalesPerson = trimOrUndef(query.salesPerson)
  const fFrom = isIsoDateString(query.from ?? '') ? (query.from as string) : undefined
  const fTo = isIsoDateString(query.to ?? '') ? (query.to as string) : undefined

  const accByKey = new Map<string, Accumulator>()

  for (const order of orders) {
    if (fFrom && order.orderDate < fFrom) continue
    if (fTo && order.orderDate > fTo) continue
    if (fSalesPerson && (order.salesPerson ?? '') !== fSalesPerson) continue

    const orderLineTotalSum = order.lines.reduce((s, l) => s + (l.lineTotal || 0), 0)
    const lineCount = order.lines.length

    for (const line of order.lines) {
      if (fSource && (line.soldSalesSourceType ?? '') !== fSource) continue
      if (fFloor && (line.soldDisplayFloor ?? '') !== fFloor) continue
      if (fExt && (line.soldExternalSupplyType ?? '') !== fExt) continue
      if (fCategory && (line.category ?? '') !== fCategory) continue
      if (fSupplier && (line.supplierId ?? '') !== fSupplier) continue

      const revenue = line.lineTotal || 0
      const qty = line.qtyOrdered || 0
      const unitCost = line.soldUnitCost ?? 0
      const cost = unitCost * qty
      const share =
        orderLineTotalSum > 0
          ? revenue / orderLineTotalSum
          : lineCount > 0
            ? 1 / lineCount
            : 0
      const collected = order.paidAmount * share
      const openBalance = order.remainingAmount * share

      const bucket = resolveSalesSourceBucket(line)
      let acc = accByKey.get(bucket.key)
      if (!acc) {
        acc = {
          bucket,
          salesCount: 0,
          unitsSold: 0,
          revenue: 0,
          purchaseCost: 0,
          collected: 0,
          openBalance: 0,
          orderIds: new Set<string>(),
        }
        accByKey.set(bucket.key, acc)
      }
      acc.salesCount += 1
      acc.unitsSold += qty
      acc.revenue += revenue
      acc.purchaseCost += cost
      acc.collected += collected
      acc.openBalance += openBalance
      acc.orderIds.add(order.id)
    }
  }

  const totalRevenue = [...accByKey.values()].reduce((s, a) => s + a.revenue, 0)

  const rows: SalesSourceAnalyticsRowDto[] = [...accByKey.values()]
    .sort((a, b) => a.bucket.sortIndex - b.bucket.sortIndex)
    .map((a) => {
      const profit = a.revenue - a.purchaseCost
      return {
        key: a.bucket.key,
        label: a.bucket.label,
        group: a.bucket.group,
        salesCount: a.salesCount,
        orderCount: a.orderIds.size,
        unitsSold: round1(a.unitsSold),
        revenue: formatMoneyAmount(a.revenue),
        purchaseCost: formatMoneyAmount(a.purchaseCost),
        profit: formatMoneyAmount(profit),
        profitMarginPct: a.revenue > 0 ? round1((profit / a.revenue) * 100) : 0,
        collected: formatMoneyAmount(a.collected),
        openBalance: formatMoneyAmount(a.openBalance),
        revenueSharePct: totalRevenue > 0 ? round1((a.revenue / totalRevenue) * 100) : 0,
      }
    })

  const totalSalesCount = rows.reduce((s, r) => s + r.salesCount, 0)
  const totalUnits = [...accByKey.values()].reduce((s, a) => s + a.unitsSold, 0)
  const totalCost = [...accByKey.values()].reduce((s, a) => s + a.purchaseCost, 0)
  const totalCollected = [...accByKey.values()].reduce((s, a) => s + a.collected, 0)
  const totalOpen = [...accByKey.values()].reduce((s, a) => s + a.openBalance, 0)
  const totalProfit = totalRevenue - totalCost
  const allOrderIds = new Set<string>()
  for (const a of accByKey.values()) for (const id of a.orderIds) allOrderIds.add(id)

  return {
    rows,
    totals: {
      salesCount: totalSalesCount,
      orderCount: allOrderIds.size,
      unitsSold: round1(totalUnits),
      revenue: formatMoneyAmount(totalRevenue),
      purchaseCost: formatMoneyAmount(totalCost),
      profit: formatMoneyAmount(totalProfit),
      profitMarginPct: totalRevenue > 0 ? round1((totalProfit / totalRevenue) * 100) : 0,
      collected: formatMoneyAmount(totalCollected),
      openBalance: formatMoneyAmount(totalOpen),
    },
    filters: {
      from: fFrom ?? null,
      to: fTo ?? null,
      salesPerson: fSalesPerson ?? null,
      salesSourceType: fSource ?? null,
      displayFloor: fFloor ?? null,
      externalSupplyType: fExt ?? null,
      category: fCategory ?? null,
      supplierId: fSupplier ?? null,
    },
    currency: 'TRY',
    generatedAt: new Date().toISOString(),
  }
}

/** Kanonik kırılım listesi (UI'da boş bucket'ları da göstermek için). */
export function listSalesSourceBuckets() {
  return SALES_SOURCE_BUCKETS.map((b) => ({ key: b.key, label: b.label, group: b.group }))
}

export async function getSalesSourceAnalytics(
  prisma: PrismaClient,
  query: SalesSourceAnalyticsQuery = {},
): Promise<SalesSourceAnalyticsResponseDto> {
  try {
    const rows = await prisma.salesOrder.findMany({
      select: {
        id: true,
        orderDate: true,
        salesPerson: true,
        paidAmount: true,
        remainingAmount: true,
        lines: {
          select: {
            lineTotal: true,
            qtyOrdered: true,
            soldUnitCost: true,
            soldSalesSourceType: true,
            soldDisplayFloor: true,
            soldExternalSupplyType: true,
            productGroupSnapshot: true,
            supplierId: true,
            product: { select: { category: true } },
          },
        },
      },
      orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
    })

    const orders: AnalyticsOrderInput[] = rows.map((o) => ({
      id: o.id,
      orderDate: o.orderDate.toISOString().slice(0, 10),
      salesPerson: o.salesPerson ?? null,
      paidAmount: decimalToNumber(o.paidAmount),
      remainingAmount: decimalToNumber(o.remainingAmount),
      lines: o.lines.map((l) => ({
        lineTotal: decimalToNumber(l.lineTotal),
        qtyOrdered: decimalToNumber(l.qtyOrdered),
        soldUnitCost: l.soldUnitCost != null ? decimalToNumber(l.soldUnitCost) : null,
        soldSalesSourceType: l.soldSalesSourceType ?? null,
        soldDisplayFloor: l.soldDisplayFloor ?? null,
        soldExternalSupplyType: l.soldExternalSupplyType ?? null,
        category: l.productGroupSnapshot ?? l.product?.category ?? null,
        supplierId: l.supplierId ?? null,
      })),
    }))

    return aggregateSalesSourceAnalytics(orders, query)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
