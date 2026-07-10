import type { PrismaClient } from '@prisma/client'
import { decimalToNumber } from '../lib/money.js'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { isIsoDateString } from '../lib/isoDate.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import { resolveSalesSourceBucket } from '../constants/salesSourceBuckets.js'
import type {
  ProfitabilityAnalyticsResponseDto,
  ProfitabilityGroupBy,
  ProfitabilityRiskLevel,
  ProfitabilityRowDetailDto,
  ProfitabilityRowDto,
  ProfitabilityTopEntryDto,
} from '../contracts/profitabilityAnalyticsDto.js'

const GROUP_BY_VALUES: ProfitabilityGroupBy[] = [
  'source',
  'salesPerson',
  'supplier',
  'category',
  'brand',
  'product',
  'month',
  'year',
]

export type ProfitLineInput = {
  lineTotal: number
  qtyOrdered: number
  soldUnitCost: number | null
  soldSalesSourceType: string | null
  soldDisplayFloor: string | null
  soldExternalSupplyType: string | null
  supplierId: string | null
  supplierName: string | null
  category: string | null
  /** Marka — veri modelinde ayrı alan olmadığından tedarikçi adından türetilir. */
  brand: string | null
  productId: string | null
  productTitle: string
}

export type ProfitOrderInput = {
  id: string
  orderDate: string // yyyy-mm-dd
  salesPerson: string | null
  customerName: string
  paidAmount: number
  remainingAmount: number
  riskLevel: ProfitabilityRiskLevel
  lines: ProfitLineInput[]
}

export type ProfitabilityQuery = {
  from?: string
  to?: string
  salesPerson?: string
  salesSourceType?: string
  category?: string
  brand?: string
  supplierId?: string
  productId?: string
  customer?: string
  /** 'paid' | 'partial' | 'open' */
  paymentStatus?: string
  /** 'none' | 'medium' | 'high' */
  riskLevel?: string
  groupBy?: string
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function trimOrUndef(v?: string): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function normalizeGroupBy(v?: string): ProfitabilityGroupBy {
  const t = typeof v === 'string' ? v.trim() : ''
  return (GROUP_BY_VALUES as string[]).includes(t) ? (t as ProfitabilityGroupBy) : 'source'
}

const MONTH_TR = [
  'Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara',
]

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  const idx = Number.parseInt(m ?? '', 10) - 1
  return idx >= 0 && idx < 12 ? `${MONTH_TR[idx]} ${y}` : ym
}

function resolveGroupKey(
  groupBy: ProfitabilityGroupBy,
  line: ProfitLineInput,
  order: ProfitOrderInput,
): { key: string; label: string } {
  switch (groupBy) {
    case 'salesPerson':
      return { key: order.salesPerson || 'UNASSIGNED', label: order.salesPerson || 'Atanmamış' }
    case 'supplier':
      return { key: line.supplierId || 'NONE', label: line.supplierName || 'Tedarikçi yok' }
    case 'category':
      return { key: line.category || 'NONE', label: line.category || 'Kategori yok' }
    case 'brand':
      return { key: line.brand || 'NONE', label: line.brand || 'Marka yok' }
    case 'product':
      return { key: line.productId || `t:${line.productTitle}`, label: line.productTitle || 'Ürün' }
    case 'month': {
      const ym = order.orderDate.slice(0, 7)
      return { key: ym, label: monthLabel(ym) }
    }
    case 'year': {
      const y = order.orderDate.slice(0, 4)
      return { key: y, label: y }
    }
    case 'source':
    default: {
      const b = resolveSalesSourceBucket(line)
      return { key: b.key, label: b.label }
    }
  }
}

type RowAcc = {
  key: string
  label: string
  salesCount: number
  unitsSold: number
  revenue: number
  purchaseCost: number
  collected: number
  openBalance: number
  riskyReceivable: number
  realizedProfit: number
  pendingProfit: number
  orderIds: Set<string>
  months: Map<string, { revenue: number; grossProfit: number }>
  orders: Map<string, { revenue: number; openBalance: number; riskLevel: ProfitabilityRiskLevel }>
  products: Map<string, { title: string; units: number; grossProfit: number }>
}

function newRowAcc(key: string, label: string): RowAcc {
  return {
    key,
    label,
    salesCount: 0,
    unitsSold: 0,
    revenue: 0,
    purchaseCost: 0,
    collected: 0,
    openBalance: 0,
    riskyReceivable: 0,
    realizedProfit: 0,
    pendingProfit: 0,
    orderIds: new Set(),
    months: new Map(),
    orders: new Map(),
    products: new Map(),
  }
}

type MiniAcc = { key: string; label: string; revenue: number; grossProfit: number }

function buildDetail(acc: RowAcc): ProfitabilityRowDetailDto {
  const months = [...acc.months.entries()]
    .sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0))
    .slice(-12)
    .map(([month, v]) => ({
      month,
      revenue: formatMoneyAmount(v.revenue),
      grossProfit: formatMoneyAmount(v.grossProfit),
    }))

  let biggestOrder: ProfitabilityRowDetailDto['biggestOrder'] = null
  let riskiestOrder: ProfitabilityRowDetailDto['riskiestOrder'] = null
  const riskRank: Record<ProfitabilityRiskLevel, number> = { NONE: 0, MEDIUM: 1, HIGH: 2 }
  for (const [orderId, o] of acc.orders) {
    if (!biggestOrder || o.revenue > Number.parseFloat(biggestOrder.revenue)) {
      biggestOrder = { orderId, revenue: formatMoneyAmount(o.revenue) }
    }
    if (
      !riskiestOrder ||
      riskRank[o.riskLevel] > riskRank[riskiestOrder.riskLevel] ||
      (riskRank[o.riskLevel] === riskRank[riskiestOrder.riskLevel] &&
        o.openBalance > Number.parseFloat(riskiestOrder.openBalance))
    ) {
      riskiestOrder = {
        orderId,
        openBalance: formatMoneyAmount(o.openBalance),
        riskLevel: o.riskLevel,
      }
    }
  }

  let topProductByUnits: ProfitabilityRowDetailDto['topProductByUnits'] = null
  let topProductByProfit: ProfitabilityRowDetailDto['topProductByProfit'] = null
  for (const p of acc.products.values()) {
    if (!topProductByUnits || p.units > topProductByUnits.units) {
      topProductByUnits = { title: p.title, units: round1(p.units) }
    }
    if (!topProductByProfit || p.grossProfit > Number.parseFloat(topProductByProfit.grossProfit)) {
      topProductByProfit = { title: p.title, grossProfit: formatMoneyAmount(p.grossProfit) }
    }
  }

  const grossProfit = acc.revenue - acc.purchaseCost
  return {
    months,
    totalOrders: acc.orderIds.size,
    totalGrossProfit: formatMoneyAmount(grossProfit),
    avgMarginPct: acc.revenue > 0 ? round1((grossProfit / acc.revenue) * 100) : 0,
    biggestOrder,
    riskiestOrder,
    topProductByUnits,
    topProductByProfit,
  }
}

function miniRows(map: Map<string, MiniAcc>): ProfitabilityTopEntryDto[] {
  return [...map.values()]
    .sort((a, b) => b.grossProfit - a.grossProfit)
    .map((m) => ({
      key: m.key,
      label: m.label,
      revenue: formatMoneyAmount(m.revenue),
      grossProfit: formatMoneyAmount(m.grossProfit),
    }))
}

/**
 * Saf kârlılık aggregation'ı (DB'den bağımsız — birim test için).
 */
export function aggregateProfitability(
  orders: ProfitOrderInput[],
  query: ProfitabilityQuery = {},
): ProfitabilityAnalyticsResponseDto {
  const groupBy = normalizeGroupBy(query.groupBy)
  const fFrom = isIsoDateString(query.from ?? '') ? (query.from as string) : undefined
  const fTo = isIsoDateString(query.to ?? '') ? (query.to as string) : undefined
  const fSalesPerson = trimOrUndef(query.salesPerson)
  const fSource = trimOrUndef(query.salesSourceType)
  const fCategory = trimOrUndef(query.category)
  const fBrand = trimOrUndef(query.brand)
  const fSupplier = trimOrUndef(query.supplierId)
  const fProduct = trimOrUndef(query.productId)
  const fCustomer = trimOrUndef(query.customer)?.toLocaleLowerCase('tr')
  const fPayment = trimOrUndef(query.paymentStatus)?.toLowerCase()
  const fRisk = trimOrUndef(query.riskLevel)?.toUpperCase()

  const rowsMap = new Map<string, RowAcc>()
  const sourceMap = new Map<string, MiniAcc>()
  const personMap = new Map<string, MiniAcc>()

  for (const order of orders) {
    if (fFrom && order.orderDate < fFrom) continue
    if (fTo && order.orderDate > fTo) continue
    if (fSalesPerson && (order.salesPerson ?? '') !== fSalesPerson) continue
    if (fCustomer && !order.customerName.toLocaleLowerCase('tr').includes(fCustomer)) continue
    if (fRisk && order.riskLevel !== fRisk) continue

    const paymentStatus =
      order.remainingAmount <= 0.0001 ? 'paid' : order.paidAmount <= 0.0001 ? 'open' : 'partial'
    if (fPayment && paymentStatus !== fPayment) continue

    const orderRevenueSum = order.lines.reduce((s, l) => s + (l.lineTotal || 0), 0)
    const lineCount = order.lines.length
    const collectionRate =
      orderRevenueSum > 0
        ? Math.min(1, Math.max(0, order.paidAmount / orderRevenueSum))
        : order.paidAmount > 0
          ? 1
          : 0
    const ym = order.orderDate.slice(0, 7)

    for (const line of order.lines) {
      if (fSource && (line.soldSalesSourceType ?? '') !== fSource) continue
      if (fCategory && (line.category ?? '') !== fCategory) continue
      if (fBrand && (line.brand ?? '') !== fBrand) continue
      if (fSupplier && (line.supplierId ?? '') !== fSupplier) continue
      if (fProduct && (line.productId ?? '') !== fProduct) continue

      const revenue = line.lineTotal || 0
      const qty = line.qtyOrdered || 0
      const cost = (line.soldUnitCost ?? 0) * qty
      const grossProfit = revenue - cost
      const share =
        orderRevenueSum > 0 ? revenue / orderRevenueSum : lineCount > 0 ? 1 / lineCount : 0
      const collected = order.paidAmount * share
      const openBalance = order.remainingAmount * share
      const riskyReceivable = order.riskLevel === 'HIGH' ? openBalance : 0
      const realizedProfit = grossProfit * collectionRate
      const pendingProfit = grossProfit - realizedProfit

      const { key, label } = resolveGroupKey(groupBy, line, order)
      let acc = rowsMap.get(key)
      if (!acc) {
        acc = newRowAcc(key, label)
        rowsMap.set(key, acc)
      }
      acc.salesCount += 1
      acc.unitsSold += qty
      acc.revenue += revenue
      acc.purchaseCost += cost
      acc.collected += collected
      acc.openBalance += openBalance
      acc.riskyReceivable += riskyReceivable
      acc.realizedProfit += realizedProfit
      acc.pendingProfit += pendingProfit
      acc.orderIds.add(order.id)

      const mo = acc.months.get(ym) ?? { revenue: 0, grossProfit: 0 }
      mo.revenue += revenue
      mo.grossProfit += grossProfit
      acc.months.set(ym, mo)

      const oo = acc.orders.get(order.id) ?? {
        revenue: 0,
        openBalance: 0,
        riskLevel: order.riskLevel,
      }
      oo.revenue += revenue
      oo.openBalance += openBalance
      acc.orders.set(order.id, oo)

      const pkey = line.productId || `t:${line.productTitle}`
      const pp = acc.products.get(pkey) ?? { title: line.productTitle || 'Ürün', units: 0, grossProfit: 0 }
      pp.units += qty
      pp.grossProfit += grossProfit
      acc.products.set(pkey, pp)

      // Özet için kaynak & personel kırılımları (groupBy'dan bağımsız)
      const sb = resolveSalesSourceBucket(line)
      const sAcc = sourceMap.get(sb.key) ?? { key: sb.key, label: sb.label, revenue: 0, grossProfit: 0 }
      sAcc.revenue += revenue
      sAcc.grossProfit += grossProfit
      sourceMap.set(sb.key, sAcc)

      const pKey = order.salesPerson || 'UNASSIGNED'
      const pLabel = order.salesPerson || 'Atanmamış'
      const pAcc = personMap.get(pKey) ?? { key: pKey, label: pLabel, revenue: 0, grossProfit: 0 }
      pAcc.revenue += revenue
      pAcc.grossProfit += grossProfit
      personMap.set(pKey, pAcc)
    }
  }

  const allAcc = [...rowsMap.values()]
  const totalRevenue = allAcc.reduce((s, a) => s + a.revenue, 0)
  const totalCost = allAcc.reduce((s, a) => s + a.purchaseCost, 0)
  const totalGrossProfit = totalRevenue - totalCost

  const rows: ProfitabilityRowDto[] = allAcc
    .map((a) => {
      const grossProfit = a.revenue - a.purchaseCost
      return {
        key: a.key,
        label: a.label,
        groupBy,
        salesCount: a.salesCount,
        orderCount: a.orderIds.size,
        unitsSold: round1(a.unitsSold),
        revenue: formatMoneyAmount(a.revenue),
        purchaseCost: formatMoneyAmount(a.purchaseCost),
        grossProfit: formatMoneyAmount(grossProfit),
        profitMarginPct: a.revenue > 0 ? round1((grossProfit / a.revenue) * 100) : 0,
        collected: formatMoneyAmount(a.collected),
        openBalance: formatMoneyAmount(a.openBalance),
        riskyReceivable: formatMoneyAmount(a.riskyReceivable),
        realizedProfit: formatMoneyAmount(a.realizedProfit),
        pendingProfit: formatMoneyAmount(a.pendingProfit),
        revenueSharePct: totalRevenue > 0 ? round1((a.revenue / totalRevenue) * 100) : 0,
        profitSharePct: totalGrossProfit !== 0 ? round1((grossProfit / totalGrossProfit) * 100) : 0,
        detail: buildDetail(a),
      }
    })

  // Kararlı sıralama: ciro azalan.
  rows.sort((a, b) => Number.parseFloat(b.revenue) - Number.parseFloat(a.revenue))

  const allOrderIds = new Set<string>()
  for (const a of allAcc) for (const id of a.orderIds) allOrderIds.add(id)

  const totalCollected = allAcc.reduce((s, a) => s + a.collected, 0)
  const totalOpen = allAcc.reduce((s, a) => s + a.openBalance, 0)
  const totalRisky = allAcc.reduce((s, a) => s + a.riskyReceivable, 0)
  const totalRealized = allAcc.reduce((s, a) => s + a.realizedProfit, 0)
  const totalPending = allAcc.reduce((s, a) => s + a.pendingProfit, 0)
  const totalUnits = allAcc.reduce((s, a) => s + a.unitsSold, 0)
  const totalSalesCount = allAcc.reduce((s, a) => s + a.salesCount, 0)

  const sourceRows = miniRows(sourceMap)
  const personRows = miniRows(personMap)

  return {
    groupBy,
    rows,
    summary: {
      revenue: formatMoneyAmount(totalRevenue),
      grossProfit: formatMoneyAmount(totalGrossProfit),
      profitMarginPct: totalRevenue > 0 ? round1((totalGrossProfit / totalRevenue) * 100) : 0,
      realizedProfit: formatMoneyAmount(totalRealized),
      pendingProfit: formatMoneyAmount(totalPending),
      riskyReceivable: formatMoneyAmount(totalRisky),
      mostProfitableSource: sourceRows[0] ?? null,
      mostProfitableSalesPerson: personRows[0] ?? null,
    },
    totals: {
      salesCount: totalSalesCount,
      orderCount: allOrderIds.size,
      unitsSold: round1(totalUnits),
      revenue: formatMoneyAmount(totalRevenue),
      purchaseCost: formatMoneyAmount(totalCost),
      grossProfit: formatMoneyAmount(totalGrossProfit),
      profitMarginPct: totalRevenue > 0 ? round1((totalGrossProfit / totalRevenue) * 100) : 0,
      collected: formatMoneyAmount(totalCollected),
      openBalance: formatMoneyAmount(totalOpen),
      riskyReceivable: formatMoneyAmount(totalRisky),
      realizedProfit: formatMoneyAmount(totalRealized),
      pendingProfit: formatMoneyAmount(totalPending),
    },
    breakdowns: { source: sourceRows, salesPerson: personRows },
    filters: {
      from: fFrom ?? null,
      to: fTo ?? null,
      salesPerson: fSalesPerson ?? null,
      salesSourceType: fSource ?? null,
      category: fCategory ?? null,
      brand: fBrand ?? null,
      supplierId: fSupplier ?? null,
      productId: fProduct ?? null,
      customer: trimOrUndef(query.customer) ?? null,
      paymentStatus: fPayment ?? null,
      riskLevel: fRisk ?? null,
    },
    currency: 'TRY',
    generatedAt: new Date().toISOString(),
  }
}

/** Sipariş risk seviyesi (basit, snapshot/akış alanlarından deterministik). */
export function deriveOrderRiskLevel(
  order: { displayStatus: string; dueDate: string | null; remainingAmount: number },
  todayIso: string,
): ProfitabilityRiskLevel {
  const delivered = order.displayStatus === 'Teslim Edildi'
  const overdue = !delivered && order.dueDate != null && order.dueDate < todayIso
  if (order.displayStatus === 'Eksik Var') return 'HIGH'
  if (overdue && order.remainingAmount > 0) return 'HIGH'
  if (overdue || (!delivered && order.remainingAmount > 0)) return 'MEDIUM'
  return 'NONE'
}

/**
 * Sipariş + kalem snapshot verisini kârlılık girdisine dönüştürür.
 * Diğer raporlar (ör. Yönetici Kokpiti) bu fetch'i yeniden kullanır → tek sorgu.
 */
export async function loadProfitabilityOrders(prisma: PrismaClient): Promise<ProfitOrderInput[]> {
  const todayIso = process.env.DEMO_TODAY ?? new Date().toISOString().slice(0, 10)
  const rows = await prisma.salesOrder.findMany({
    select: {
      id: true,
      orderDate: true,
      dueDate: true,
      displayStatus: true,
      salesPerson: true,
      customerName: true,
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
          supplierId: true,
          supplierNameSnapshot: true,
          productId: true,
          productTitleSnapshot: true,
          title: true,
          productGroupSnapshot: true,
          product: { select: { category: true } },
        },
      },
    },
    orderBy: [{ orderDate: 'desc' }, { id: 'desc' }],
  })

  return rows.map((o) => {
    const remainingAmount = decimalToNumber(o.remainingAmount)
    return {
      id: o.id,
      orderDate: o.orderDate.toISOString().slice(0, 10),
      salesPerson: o.salesPerson ?? null,
      customerName: o.customerName,
      paidAmount: decimalToNumber(o.paidAmount),
      remainingAmount,
      riskLevel: deriveOrderRiskLevel(
        {
          displayStatus: o.displayStatus,
          dueDate: o.dueDate ? o.dueDate.toISOString().slice(0, 10) : null,
          remainingAmount,
        },
        todayIso,
      ),
      lines: o.lines.map((l) => {
        const supplierName = l.supplierNameSnapshot ?? null
        return {
          lineTotal: decimalToNumber(l.lineTotal),
          qtyOrdered: decimalToNumber(l.qtyOrdered),
          soldUnitCost: l.soldUnitCost != null ? decimalToNumber(l.soldUnitCost) : null,
          soldSalesSourceType: l.soldSalesSourceType ?? null,
          soldDisplayFloor: l.soldDisplayFloor ?? null,
          soldExternalSupplyType: l.soldExternalSupplyType ?? null,
          supplierId: l.supplierId ?? null,
          supplierName,
          category: l.productGroupSnapshot ?? l.product?.category ?? null,
          brand: supplierName,
          productId: l.productId ?? null,
          productTitle: l.productTitleSnapshot ?? l.title,
        }
      }),
    }
  })
}

export async function getProfitabilityAnalytics(
  prisma: PrismaClient,
  query: ProfitabilityQuery = {},
): Promise<ProfitabilityAnalyticsResponseDto> {
  try {
    const orders = await loadProfitabilityOrders(prisma)
    return aggregateProfitability(orders, query)
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
