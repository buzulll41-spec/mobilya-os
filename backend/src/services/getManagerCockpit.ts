import type { PrismaClient } from '@prisma/client'
import { moneyToNumber } from '../lib/money.js'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import {
  aggregateProfitability,
  loadProfitabilityOrders,
  type ProfitOrderInput,
  type ProfitabilityQuery,
} from './getProfitabilityAnalytics.js'
import { getDataQualityReport } from './getDataQualityReport.js'
import { listSalesOrderListItems } from './listOrdersProjection.js'
import type { SalesOrderListItemDto } from '../projection/salesOrderListItemProjection.js'
import type { DataQualityResponseDto } from '../contracts/dataQualityDto.js'
import type { ProfitabilityAnalyticsResponseDto } from '../contracts/profitabilityAnalyticsDto.js'
import type {
  CockpitAlertDto,
  CockpitCriticalOrderDto,
  CockpitPendingShipmentDto,
  CockpitRiskLevel,
  ManagerCockpitResponseDto,
} from '../contracts/managerCockpitDto.js'

const CRITICAL_ORDERS_LIMIT = 20
const PENDING_SHIPMENTS_LIMIT = 20
const MANAGER_ALERTS_LIMIT = 10
const LOW_MARGIN_THRESHOLD = 10 // %
const QUALITY_ALERT_FLOOR = 85

export type ManagerCockpitQuery = {
  from?: string
  to?: string
  month?: string // yyyy-mm
  year?: string
  salesPerson?: string
  riskLevel?: string
  paymentStatus?: string
  shipmentStatus?: string
  salesSourceType?: string
  limitedView?: boolean
}

const RISK_RANK: Record<CockpitRiskLevel, number> = {
  NONE: 0,
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
}

function num(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function diffDays(a: string, b: string): number {
  const da = Date.parse(`${a}T00:00:00Z`)
  const db = Date.parse(`${b}T00:00:00Z`)
  if (!Number.isFinite(da) || !Number.isFinite(db)) return 0
  return Math.round((da - db) / 86_400_000)
}

/** Verilen referans tarihten ay aralığı (yyyy-mm-dd). */
function resolveMonthRange(query: ManagerCockpitQuery, today: string): { from: string; to: string } {
  if (query.from && query.to) return { from: query.from, to: query.to }
  let y: number
  let m: number // 1-12
  if (query.month && /^\d{4}-\d{2}$/.test(query.month)) {
    y = Number.parseInt(query.month.slice(0, 4), 10)
    m = Number.parseInt(query.month.slice(5, 7), 10)
  } else {
    y = query.year && /^\d{4}$/.test(query.year) ? Number.parseInt(query.year, 10) : Number.parseInt(today.slice(0, 4), 10)
    m = Number.parseInt(today.slice(5, 7), 10)
  }
  const from = `${y}-${String(m).padStart(2, '0')}-01`
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const to = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
  return { from, to }
}

type AssembleArgs = {
  today: string
  monthFrom: string
  monthTo: string
  profitOrders: ProfitOrderInput[]
  srcRes: ProfitabilityAnalyticsResponseDto
  catRes: ProfitabilityAnalyticsResponseDto
  dq: DataQualityResponseDto
  listItems: SalesOrderListItemDto[]
  paymentsTodayTotal: number
  crewByOrder: Map<string, string | null>
  query: ManagerCockpitQuery
}

/** Saf montaj fonksiyonu — DB'den bağımsız, test edilebilir. */
export function assembleManagerCockpit(args: AssembleArgs): ManagerCockpitResponseDto {
  const { today, profitOrders, srcRes, catRes, dq, listItems, paymentsTodayTotal, crewByOrder, query } = args
  const limited = Boolean(query.limitedView)

  // ── Sipariş başına kâr haritası (snapshot maliyetinden) ──
  const orderProfit = new Map<string, { revenue: number; cost: number; gross: number; marginPct: number }>()
  let todaySales = 0
  let ordersToday = 0
  for (const o of profitOrders) {
    const revenue = o.lines.reduce((s, l) => s + (l.lineTotal || 0), 0)
    const cost = o.lines.reduce((s, l) => s + (l.soldUnitCost ?? 0) * (l.qtyOrdered || 0), 0)
    const gross = revenue - cost
    orderProfit.set(o.id, { revenue, cost, gross, marginPct: revenue > 0 ? (gross / revenue) * 100 : 0 })
    if (o.orderDate === today) {
      todaySales += revenue
      ordersToday += 1
    }
  }

  // ── Bugünün operasyonu ──
  let readyToShipToday = 0
  let delayedShipments = 0
  let criticalRiskOrders = 0
  for (const it of listItems) {
    const delivered = it.displayStatus === 'Teslim Edildi'
    if (it.displayStatus === 'Hazır') readyToShipToday += 1
    if (!delivered && it.plannedShipmentDate && it.plannedShipmentDate < today) delayedShipments += 1
    if (it.currentRiskSeverity === 'HIGH' || it.currentRiskSeverity === 'CRITICAL') criticalRiskOrders += 1
  }

  // ── Kârlılık öne çıkanlar (Faz 5A motoru) ──
  const sourceRows = srcRes.rows
  const topSrc = srcRes.breakdowns.source[0] ?? null
  const topPerson = srcRes.breakdowns.salesPerson[0] ?? null
  const topCat = catRes.rows[0] ?? null
  const riskiest = [...sourceRows].sort((a, b) => num(b.riskyReceivable) - num(a.riskyReceivable))[0] ?? null
  const lowestMargin = [...sourceRows]
    .filter((r) => num(r.revenue) > 0)
    .sort((a, b) => a.profitMarginPct - b.profitMarginPct)[0] ?? null
  const highestOpen = [...sourceRows].sort((a, b) => num(b.openBalance) - num(a.openBalance))[0] ?? null

  // ── Veri kalitesi (Faz 4 motoru) ──
  const catCount = (code: string): number =>
    dq.issueCategories.find((c) => c.code === code)?.count ?? 0
  const criticalIssueCount = dq.issueCategories
    .filter((c) => c.severity === 'critical')
    .reduce((s, c) => s + c.count, 0)
  const dqCriticalOrders = new Set(
    dq.rows.filter((r) => r.issues.some((i) => i.severity === 'critical')).map((r) => r.orderId),
  )

  // ── Kritik siparişler ──
  const criticalOrders: CockpitCriticalOrderDto[] = []
  for (const it of listItems) {
    const delivered = it.displayStatus === 'Teslim Edildi'
    const total = moneyToNumber(it.totalAmount)
    const open = moneyToNumber(it.remainingAmount)
    const prof = orderProfit.get(it.id)
    const problems: string[] = []

    if (open > 0 && total > 0 && open / total >= 0.5) problems.push('Açık bakiye yüksek')
    if (it.hasOverdueBalance) problems.push('Tahsilat gecikmiş')
    if (!delivered && it.plannedShipmentDate && it.plannedShipmentDate < today) problems.push('Sevk gecikmiş')
    if ((it.openMissingItemsCount ?? 0) > 0) problems.push('Eksik ürün var')
    if (prof && prof.revenue > 0 && prof.marginPct < LOW_MARGIN_THRESHOLD) problems.push('Kâr düşük')
    if (dqCriticalOrders.has(it.id)) problems.push('Veri kalitesi kritik')
    if (it.currentRiskSeverity === 'HIGH' || it.currentRiskSeverity === 'CRITICAL') problems.push('Yüksek risk')

    if (problems.length === 0) continue
    criticalOrders.push({
      riskLevel: it.currentRiskSeverity,
      orderId: it.id,
      orderNumber: it.orderNumber,
      customer: it.customerDisplayName,
      totalAmount: formatMoneyAmount(total),
      openBalance: formatMoneyAmount(open),
      grossProfit: limited ? '' : formatMoneyAmount(prof?.gross ?? 0),
      shipmentStatus: it.displayStatus,
      paymentStatus: open <= 0.0001 ? 'Tahsil edildi' : it.hasOverdueBalance ? 'Gecikmiş' : 'Kısmi',
      salesPerson: limited ? null : (it.salesPerson ?? null),
      problems,
    })
  }
  criticalOrders.sort(
    (a, b) => RISK_RANK[b.riskLevel] - RISK_RANK[a.riskLevel] || num(b.openBalance) - num(a.openBalance),
  )
  const criticalOrdersLimited = criticalOrders.slice(0, CRITICAL_ORDERS_LIMIT)

  // ── Bekleyen sevkler ──
  const pendingShipments: CockpitPendingShipmentDto[] = []
  for (const it of listItems) {
    const delivered = it.displayStatus === 'Teslim Edildi'
    if (delivered) continue
    pendingShipments.push({
      orderId: it.id,
      orderNumber: it.orderNumber,
      customer: it.customerDisplayName,
      plannedShipDate: it.plannedShipmentDate ?? null,
      dayDiff: it.plannedShipmentDate ? diffDays(it.plannedShipmentDate, today) : null,
      readiness: it.displayStatus,
      missingItems: it.openMissingItemsCount ?? 0,
      crew: crewByOrder.get(it.id) ?? null,
      riskLevel: it.currentRiskSeverity,
    })
  }
  pendingShipments.sort((a, b) => {
    if (a.dayDiff == null && b.dayDiff == null) return 0
    if (a.dayDiff == null) return 1
    if (b.dayDiff == null) return -1
    return a.dayDiff - b.dayDiff
  })
  const pendingShipmentsLimited = pendingShipments.slice(0, PENDING_SHIPMENTS_LIMIT)

  // ── Yönetici uyarıları ──
  const alerts: CockpitAlertDto[] = []
  if (topSrc && num(topSrc.grossProfit) > 0) {
    alerts.push({ severity: 'info', message: `Bu ay ${topSrc.label} en yüksek brüt kârı üretiyor.` })
  }
  if (highestOpen && num(highestOpen.openBalance) > 0) {
    alerts.push({
      severity: 'warning',
      message: `${highestOpen.label} satışlarında açık bakiye yüksek (${formatMoneyAmount(num(highestOpen.openBalance))} ₺).`,
    })
  }
  if (dq.totals.missingCostCount > 0) {
    alerts.push({
      severity: 'critical',
      message: `${dq.totals.missingCostCount} kayıtta alış maliyeti eksik, kâr raporu bozulabilir.`,
    })
  }
  if (delayedShipments > 0) {
    alerts.push({ severity: 'warning', message: `Bugün ${delayedShipments} sevk gecikmiş görünüyor.` })
  }
  if (dq.totals.averageQualityScore < QUALITY_ALERT_FLOOR) {
    alerts.push({
      severity: 'critical',
      message: `Veri kalite skoru ${dq.totals.averageQualityScore}, ${QUALITY_ALERT_FLOOR}'in altına düştü.`,
    })
  }
  if (dq.totals.unknownCount > 0) {
    alerts.push({
      severity: 'warning',
      message: `${dq.totals.unknownCount} satış kaleminde kaynak Bilinmeyen olarak işaretli.`,
    })
  }
  if (criticalRiskOrders > 0) {
    alerts.push({
      severity: 'critical',
      message: `${criticalRiskOrders} siparişte yüksek/kritik risk var, bugün müdahale gerekebilir.`,
    })
  }
  const managerAlerts = alerts.slice(0, MANAGER_ALERTS_LIMIT)

  return {
    summary: {
      todaySales: formatMoneyAmount(todaySales),
      monthRevenue: srcRes.totals.revenue,
      monthGrossProfit: srcRes.totals.grossProfit,
      avgProfitMarginPct: srcRes.totals.profitMarginPct,
      realizedProfit: srcRes.totals.realizedProfit,
      pendingProfit: srcRes.totals.pendingProfit,
      riskyReceivable: srcRes.totals.riskyReceivable,
      dataQualityScore: dq.totals.averageQualityScore,
    },
    todayOperations: {
      ordersToday,
      collectionToday: formatMoneyAmount(paymentsTodayTotal),
      readyToShipToday,
      delayedShipments,
      serviceTicketsToday: 0,
      criticalRiskOrders,
    },
    profitabilityHighlights: {
      topProfitSource: topSrc ? { key: topSrc.key, label: topSrc.label, value: topSrc.grossProfit, metric: 'grossProfit' } : null,
      topProfitSalesPerson:
        limited || !topPerson ? null : { key: topPerson.key, label: topPerson.label, value: topPerson.grossProfit, metric: 'grossProfit' },
      topProfitCategory: topCat ? { key: topCat.key, label: topCat.label, value: topCat.grossProfit, metric: 'grossProfit' } : null,
      riskiestSource: riskiest ? { key: riskiest.key, label: riskiest.label, value: riskiest.riskyReceivable, metric: 'riskyReceivable' } : null,
      lowestMarginSource: lowestMargin
        ? { key: lowestMargin.key, label: lowestMargin.label, value: String(lowestMargin.profitMarginPct), metric: 'profitMarginPct' }
        : null,
      highestOpenBalanceSource: highestOpen
        ? { key: highestOpen.key, label: highestOpen.label, value: highestOpen.openBalance, metric: 'openBalance' }
        : null,
    },
    dataQualityHighlights: {
      unknownCount: dq.totals.unknownCount,
      missingCostCount: dq.totals.missingCostCount,
      missingDisplayFloorCount: catCount('MISSING_DISPLAY_FLOOR'),
      missingExternalSupplyCount: catCount('MISSING_EXTERNAL_SUPPLY_TYPE'),
      criticalIssueCount,
      averageQualityScore: dq.totals.averageQualityScore,
    },
    criticalOrders: criticalOrdersLimited,
    pendingShipments: pendingShipmentsLimited,
    managerAlerts,
    filters: {
      from: query.from ?? null,
      to: query.to ?? null,
      month: query.month ?? null,
      year: query.year ?? null,
      salesPerson: query.salesPerson ?? null,
      riskLevel: query.riskLevel ?? null,
      paymentStatus: query.paymentStatus ?? null,
      shipmentStatus: query.shipmentStatus ?? null,
      salesSourceType: query.salesSourceType ?? null,
    },
    currency: 'TRY',
    today,
    generatedAt: new Date().toISOString(),
  }
}

export async function getManagerCockpit(
  prisma: PrismaClient,
  query: ManagerCockpitQuery = {},
): Promise<ManagerCockpitResponseDto> {
  try {
    const today = process.env.DEMO_TODAY ?? '2026-05-14'
    const { from, to } = resolveMonthRange(query, today)

    const profitQuery: ProfitabilityQuery = {
      from,
      to,
      salesPerson: query.salesPerson,
      salesSourceType: query.salesSourceType,
      riskLevel: query.riskLevel,
      paymentStatus: query.paymentStatus,
    }

    const [profitOrders, dq, listItems, payments] = await Promise.all([
      loadProfitabilityOrders(prisma),
      getDataQualityReport(prisma, { from, to, salesPerson: query.salesPerson }),
      listSalesOrderListItems(prisma),
      prisma.paymentTransaction.findMany({
        where: { occurredAt: { gte: new Date(`${today}T00:00:00.000Z`), lt: new Date(`${today}T23:59:59.999Z`) } },
        select: { amount: true },
      }),
    ])

    const srcRes = aggregateProfitability(profitOrders, { ...profitQuery, groupBy: 'source' })
    const catRes = aggregateProfitability(profitOrders, { ...profitQuery, groupBy: 'category' })

    const paymentsTodayTotal = payments.reduce((s, p) => {
      const n = Number.parseFloat(p.amount.toString())
      return s + (Number.isFinite(n) ? n : 0)
    }, 0)

    // Sevk ekibi (montaj) — tek sorgu, sipariş başına ilk dolu crew
    const shipments = await prisma.shipment.findMany({
      select: { salesOrderId: true, crewName: true },
    })
    const crewByOrder = new Map<string, string | null>()
    for (const s of shipments) {
      if (!crewByOrder.get(s.salesOrderId) && s.crewName) crewByOrder.set(s.salesOrderId, s.crewName)
    }

    return assembleManagerCockpit({
      today,
      monthFrom: from,
      monthTo: to,
      profitOrders,
      srcRes,
      catRes,
      dq,
      listItems,
      paymentsTodayTotal,
      crewByOrder,
      query,
    })
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
