import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { assertServiceErrorMapped } from '../errors/mapServiceError.js'
import { resolveSalesSourceBucket } from '../constants/salesSourceBuckets.js'
import {
  aggregateProfitability,
  loadProfitabilityOrders,
  type ProfitOrderInput,
} from './getProfitabilityAnalytics.js'
import { getDataQualityReport } from './getDataQualityReport.js'
import type {
  ForecastAlertDto,
  ForecastEngineResponseDto,
  ForecastProjectionDto,
  ForecastSourceTrendDto,
  ForecastStaffRowDto,
  ForecastTrend,
  ShipmentIntensity,
  StaffStatus,
} from '../contracts/forecastEngineDto.js'

const ALERTS_LIMIT = 10
const TREND_PCT_THRESHOLD = 5
const QUALITY_TREND_THRESHOLD = 2

export type ForecastQuery = {
  month?: string // yyyy-mm
  salesPerson?: string
  salesSourceType?: string
  limitedView?: boolean
}

export type ForecastShipmentWindows = { last30: number; last60: number; last90: number }
export type ForecastQualityScores = { currentScore: number; previousScore: number }

export type BuildForecastArgs = {
  today: string
  profitOrders: ProfitOrderInput[]
  shipmentWindows: ForecastShipmentWindows
  dataQuality: ForecastQualityScores
  query: ForecastQuery
}

function num(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function daysInMonth(year: number, month1: number): number {
  return new Date(Date.UTC(year, month1, 0)).getUTCDate()
}
function addDays(iso: string, delta: number): string {
  const t = Date.parse(`${iso}T00:00:00Z`)
  return new Date(t + delta * 86_400_000).toISOString().slice(0, 10)
}
function monthBounds(ym: string): { from: string; to: string; total: number; year: number; month: number } {
  const year = Number.parseInt(ym.slice(0, 4), 10)
  const month = Number.parseInt(ym.slice(5, 7), 10)
  const total = daysInMonth(year, month)
  return {
    from: `${ym}-01`,
    to: `${ym}-${String(total).padStart(2, '0')}`,
    total,
    year,
    month,
  }
}
function prevMonthYm(ym: string): string {
  let year = Number.parseInt(ym.slice(0, 4), 10)
  let month = Number.parseInt(ym.slice(5, 7), 10) - 1
  if (month < 1) {
    month = 12
    year -= 1
  }
  return `${year}-${String(month).padStart(2, '0')}`
}

function growthPct(recent: number, recentDays: number, base: number, baseDays: number): number {
  const rRate = recentDays > 0 ? recent / recentDays : 0
  const bRate = baseDays > 0 ? base / baseDays : 0
  if (bRate <= 0) return rRate > 0 ? 100 : 0
  return ((rRate - bRate) / bRate) * 100
}
function trendFromPct(pct: number): ForecastTrend {
  if (pct >= TREND_PCT_THRESHOLD) return 'UP'
  if (pct <= -TREND_PCT_THRESHOLD) return 'DOWN'
  return 'FLAT'
}

function projection(current: number, elapsed: number, total: number): ForecastProjectionDto {
  const daily = elapsed > 0 ? current / elapsed : 0
  const projected = elapsed > 0 ? (current / elapsed) * total : current
  return {
    current: formatMoneyAmount(current),
    projected: formatMoneyAmount(projected),
    dailyRate: formatMoneyAmount(daily),
    basis:
      elapsed > 0
        ? `Mevcut ${formatMoneyAmount(current)} ₺ / ${elapsed} gün × ${total} gün`
        : `Henüz veri yok (0 gün)`,
  }
}

/** Saf tahmin fonksiyonu — DB'den bağımsız, test edilebilir. */
export function buildForecast(args: BuildForecastArgs): ForecastEngineResponseDto {
  const { today, profitOrders, shipmentWindows, dataQuality, query } = args
  const limited = Boolean(query.limitedView)
  const salesPerson = query.salesPerson?.trim() || undefined
  const salesSourceType = query.salesSourceType?.trim() || undefined

  const ym = query.month && /^\d{4}-\d{2}$/.test(query.month) ? query.month : today.slice(0, 7)
  const { from, to, total } = monthBounds(ym)
  const prevYm = prevMonthYm(ym)
  const prev = monthBounds(prevYm)

  let elapsed: number
  if (today > to) elapsed = total
  else if (today < from) elapsed = 0
  else elapsed = Number.parseInt(today.slice(8, 10), 10)

  // ── Bu ay toplamları (Faz 5A motoru yeniden kullanılır) ──
  const monthRes = aggregateProfitability(profitOrders, {
    from,
    to,
    salesPerson,
    salesSourceType,
    groupBy: 'source',
  })
  const t = monthRes.totals

  const salesForecast = projection(num(t.revenue), elapsed, total)
  const grossForecast = projection(num(t.grossProfit), elapsed, total)
  const realizedForecast = projection(num(t.realizedProfit), elapsed, total)
  const collectionForecast = projection(num(t.collected), elapsed, total)
  const openBalanceForecast = projection(num(t.openBalance), elapsed, total)
  const riskyForecast = projection(num(t.riskyReceivable), elapsed, total)

  // ── Pencere agregasyonları (7/30/90 gün) ──
  const d7 = addDays(today, -6)
  const d30 = addDays(today, -29)
  const d90 = addDays(today, -89)
  const sourceWin = new Map<string, { label: string; r7: number; r30: number; r90: number }>()
  let ob7 = 0
  let ob30 = 0
  let ob90 = 0
  for (const o of profitOrders) {
    if (salesPerson && (o.salesPerson ?? '') !== salesPerson) continue
    const date = o.orderDate
    const in7 = date >= d7 && date <= today
    const in30 = date >= d30 && date <= today
    const in90 = date >= d90 && date <= today
    if (in90) ob90 += o.remainingAmount
    if (in30) ob30 += o.remainingAmount
    if (in7) ob7 += o.remainingAmount
    for (const line of o.lines) {
      if (salesSourceType && (line.soldSalesSourceType ?? '') !== salesSourceType) continue
      const b = resolveSalesSourceBucket(line)
      const acc = sourceWin.get(b.key) ?? { label: b.label, r7: 0, r30: 0, r90: 0 }
      const rev = line.lineTotal || 0
      if (in90) acc.r90 += rev
      if (in30) acc.r30 += rev
      if (in7) acc.r7 += rev
      sourceWin.set(b.key, acc)
    }
  }

  const sourceTrends: ForecastSourceTrendDto[] = [...sourceWin.entries()]
    .map(([key, v]) => {
      const pct7 = round1(growthPct(v.r7, 7, v.r30, 30))
      const pct30 = round1(growthPct(v.r30, 30, v.r90, 90))
      return {
        key,
        label: v.label,
        revenue7: formatMoneyAmount(v.r7),
        revenue30: formatMoneyAmount(v.r30),
        revenue90: formatMoneyAmount(v.r90),
        pct7,
        pct30,
        trend: trendFromPct(pct7 !== 0 ? pct7 : pct30),
      }
    })
    .sort((a, b) => num(b.revenue30) - num(a.revenue30))

  // ── Personel hedef tahmini (hedef = geçen ay satışı) ──
  const curPersons = aggregateProfitability(profitOrders, { from, to, salesPerson, groupBy: 'salesPerson' }).rows
  const prevPersons = aggregateProfitability(profitOrders, {
    from: prev.from,
    to: prev.to,
    salesPerson,
    groupBy: 'salesPerson',
  }).rows
  const prevByKey = new Map(prevPersons.map((r) => [r.key, num(r.revenue)]))
  const staffForecast: ForecastStaffRowDto[] = curPersons.map((r) => {
    const current = num(r.revenue)
    const target = prevByKey.get(r.key) ?? 0
    const projected = elapsed > 0 ? (current / elapsed) * total : current
    const achievementPct = target > 0 ? round1((projected / target) * 100) : projected > 0 ? 100 : 0
    let status: StaffStatus = 'HEDEFE_YAKIN'
    if (achievementPct < 90) status = 'HEDEF_ALTINDA'
    else if (achievementPct > 110) status = 'HEDEF_USTU'
    return {
      key: r.key,
      label: r.label,
      currentSales: formatMoneyAmount(current),
      target: formatMoneyAmount(target),
      projectedSales: formatMoneyAmount(projected),
      achievementPct,
      status,
    }
  })

  // ── Şirket hedef gerçekleşme (ciro) ──
  const prevRevenue = num(
    aggregateProfitability(profitOrders, {
      from: prev.from,
      to: prev.to,
      salesPerson,
      salesSourceType,
      groupBy: 'source',
    }).totals.revenue,
  )
  const projectedRevenue = num(salesForecast.projected)
  const targetAchievementPct = prevRevenue > 0 ? round1((projectedRevenue / prevRevenue) * 100) : 0

  // ── Risk tahmini ──
  const openTrendPct = growthPct(ob7, 7, ob30, 30)
  const riskTrend = trendFromPct(round1(openTrendPct))
  const projectedOpen = num(openBalanceForecast.projected)
  const projectedRisky = num(riskyForecast.projected)
  const shareOfOpenPct = projectedOpen > 0 ? round1((projectedRisky / projectedOpen) * 100) : 0

  // ── Sevk tahmini ──
  const dailyAvg30 = shipmentWindows.last30 / 30
  const dailyAvg90 = shipmentWindows.last90 / 90
  const expectedNextWeek = Math.round(dailyAvg30 * 7)
  const expectedNextMonth = Math.round(dailyAvg30 * 30)
  const shipmentTrend = trendFromPct(round1(growthPct(shipmentWindows.last30, 30, shipmentWindows.last90, 90)))
  let intensity: ShipmentIntensity = 'LOW'
  if (expectedNextWeek > 7) intensity = 'HIGH'
  else if (expectedNextWeek >= 3) intensity = 'MEDIUM'

  // ── Veri kalitesi trendi ──
  const qChange = round1(dataQuality.currentScore - dataQuality.previousScore)
  const qTrend: ForecastTrend = qChange >= QUALITY_TREND_THRESHOLD ? 'UP' : qChange <= -QUALITY_TREND_THRESHOLD ? 'DOWN' : 'FLAT'

  // ── Yönetici tahmin uyarıları ──
  const alerts: ForecastAlertDto[] = []
  if (prevRevenue > 0) {
    alerts.push({
      severity: targetAchievementPct >= 100 ? 'info' : 'warning',
      message: `Ay sonu ciro geçen ayın %${targetAchievementPct}'i seviyesinde bekleniyor.`,
    })
  }
  if (riskTrend === 'UP') {
    alerts.push({ severity: 'warning', message: 'Açık bakiye büyüme trendinde.' })
  }
  const decliningSource = sourceTrends.find((s) => s.trend === 'DOWN' && num(s.revenue30) > 0)
  if (decliningSource) {
    alerts.push({ severity: 'warning', message: `${decliningSource.label} satışları düşüyor.` })
  }
  if (qTrend === 'DOWN') {
    alerts.push({ severity: 'critical', message: `Veri kalite skoru son 30 günde ${Math.abs(qChange)} puan geriledi.` })
  }
  if (shipmentTrend === 'UP' || intensity === 'HIGH') {
    alerts.push({ severity: 'info', message: 'Sevk yoğunluğu artıyor.' })
  }
  for (const s of staffForecast) {
    if (s.status === 'HEDEF_USTU') {
      alerts.push({ severity: 'info', message: `${s.label} hedefini aşacak görünüyor (%${s.achievementPct}).` })
    }
  }

  return {
    summary: {
      monthRevenueProjected: salesForecast.projected,
      monthGrossProfitProjected: grossForecast.projected,
      monthRealizedProfitProjected: realizedForecast.projected,
      monthCollectionProjected: collectionForecast.projected,
      monthOpenBalanceProjected: openBalanceForecast.projected,
      riskyReceivableProjected: riskyForecast.projected,
      elapsedDays: elapsed,
      totalDays: total,
      targetAchievementPct,
    },
    salesForecast,
    profitForecast: { gross: grossForecast, realized: realizedForecast },
    collectionForecast,
    openBalanceForecast,
    riskForecast: {
      expectedRiskyReceivable: riskyForecast.projected,
      shareOfOpenPct,
      trend: riskTrend,
    },
    shipmentForecast: {
      expectedNextWeek,
      expectedNextMonth,
      dailyAvg30: round1(dailyAvg30),
      intensity,
      trend: shipmentTrend,
      basis: `Son 30 gün ${shipmentWindows.last30} sevk → günlük ${round1(dailyAvg30)}; 90 gün günlük ${round1(dailyAvg90)}`,
    },
    staffForecast,
    sourceTrends,
    dataQualityTrend: {
      currentScore: dataQuality.currentScore,
      previousScore: dataQuality.previousScore,
      change: qChange,
      trend: qTrend,
    },
    alerts: alerts.slice(0, ALERTS_LIMIT),
    filters: {
      month: query.month ?? null,
      salesPerson: salesPerson ?? null,
      salesSourceType: salesSourceType ?? null,
      limitedView: limited,
    },
    currency: 'TRY',
    today,
    generatedAt: new Date().toISOString(),
  }
}

export async function getForecastEngine(
  prisma: PrismaClient,
  query: ForecastQuery = {},
): Promise<ForecastEngineResponseDto> {
  try {
    const today = process.env.DEMO_TODAY ?? '2026-05-14'

    const [profitOrders, dqCurrent, dqPrevious, shipments] = await Promise.all([
      loadProfitabilityOrders(prisma),
      getDataQualityReport(prisma, { from: addDays(today, -29), to: today, salesPerson: query.salesPerson }),
      getDataQualityReport(prisma, { from: addDays(today, -59), to: addDays(today, -30), salesPerson: query.salesPerson }),
      prisma.shipment.findMany({
        where: { plannedShipDate: { gte: new Date(`${addDays(today, -89)}T00:00:00.000Z`) } },
        select: { plannedShipDate: true },
      }),
    ])

    const d30 = addDays(today, -29)
    const d60 = addDays(today, -59)
    const d90 = addDays(today, -89)
    let last30 = 0
    let last60 = 0
    let last90 = 0
    for (const s of shipments) {
      const ref = s.plannedShipDate
      if (!ref) continue
      const iso = ref.toISOString().slice(0, 10)
      if (iso > today) continue
      if (iso >= d90) last90 += 1
      if (iso >= d60) last60 += 1
      if (iso >= d30) last30 += 1
    }

    return buildForecast({
      today,
      profitOrders,
      shipmentWindows: { last30, last60, last90 },
      dataQuality: {
        currentScore: dqCurrent.totals.averageQualityScore,
        previousScore: dqPrevious.totals.averageQualityScore,
      },
      query,
    })
  } catch (err) {
    assertServiceErrorMapped(err)
    throw err
  }
}
