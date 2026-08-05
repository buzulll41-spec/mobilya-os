/**
 * Stratejik Karar Merkezi motoru — Faz 5–14 çıktılarını orta/uzun vade analizine dönüştürür.
 * Deterministik; Depo Katı satış kaynağı olarak görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { aggregateProfitability } from './getProfitabilityAnalytics.js'
import type { ProfitabilityAnalyticsResponseDto } from '../contracts/profitabilityAnalyticsDto.js'
import {
  assembleCeoControlCenter,
  gatherCeoData,
  type CeoGatheredData,
} from './getCeoControlCenter.js'
import type { ProfitabilityRowDto } from '../contracts/profitabilityAnalyticsDto.js'
import type { ForecastStaffRowDto } from '../contracts/forecastEngineDto.js'
import type {
  BoardBriefingDto,
  CompanyHealthDto,
  GrowthAnalysisDto,
  GrowthEntryDto,
  ProductGroupDto,
  ProductStrategyDto,
  RiskForecastDto,
  RiskForecastItemDto,
  SalesPersonAnalysisDto,
  SalesPersonScoreDto,
  StrategicIntelligenceResponseDto,
  StrategicIntelligenceSummaryDto,
  StrategicRecommendationDto,
  StrategicTrend,
  SupplierAnalysisDto,
  SupplierScoreDto,
} from '../contracts/strategicIntelligenceDto.js'

const RECOMMENDATIONS_LIMIT = 10
const SCOREBOARD_LIMIT = 8
const RISK_FORECAST_HORIZON = 90

export type StrategicContext = CeoGatheredData & {
  ceo: ReturnType<typeof assembleCeoControlCenter>
  prevMonthCat: ProfitabilityAnalyticsResponseDto
  brandRes: ProfitabilityAnalyticsResponseDto
}

function num(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function isDepoKati(label: string): boolean {
  return label === 'Depo Katı' || label === 'WAREHOUSE' || label === 'WAREHOUSE_FLOOR'
}

function filterRows(rows: ProfitabilityRowDto[]): ProfitabilityRowDto[] {
  return rows.filter((r) => !isDepoKati(r.label))
}

function pctChange(current: number, previous: number): number {
  if (previous <= 0 && current <= 0) return 0
  if (previous <= 0) return 100
  return round1(((current - previous) / previous) * 100)
}

function trendFromPct(pct: number): StrategicTrend {
  if (pct >= 5) return 'UP'
  if (pct <= -5) return 'DOWN'
  return 'FLAT'
}

function growthEntry(
  key: string,
  label: string,
  current: number,
  previous: number,
): GrowthEntryDto {
  const changePct = pctChange(current, previous)
  return {
    key,
    label,
    currentRevenue: formatMoneyAmount(current),
    previousRevenue: formatMoneyAmount(previous),
    changePct,
    trend: trendFromPct(changePct),
  }
}

function buildGrowthFromPair(
  current: ProfitabilityAnalyticsResponseDto,
  previous: ProfitabilityAnalyticsResponseDto,
): GrowthEntryDto[] {
  const prevMap = new Map(previous.rows.map((r) => [r.key, num(r.revenue)]))
  return filterRows(current.rows)
    .map((r) => growthEntry(r.key, r.label, num(r.revenue), prevMap.get(r.key) ?? 0))
    .sort((a, b) => b.changePct - a.changePct)
}

function pickTopGrowth(entries: GrowthEntryDto[]): GrowthEntryDto | null {
  const up = entries.filter((e) => e.trend === 'UP')
  return up[0] ?? entries[0] ?? null
}

function pickTopDecline(entries: GrowthEntryDto[]): GrowthEntryDto | null {
  const down = [...entries].filter((e) => e.trend === 'DOWN').sort((a, b) => a.changePct - b.changePct)
  return down[0] ?? null
}

export function buildGrowthAnalysis(ctx: StrategicContext): GrowthAnalysisDto {
  const sourceTrends = buildGrowthFromPair(ctx.srcRes, ctx.prevMonthSrc)
  const catCurrent = aggregateProfitability(ctx.profitOrders, {
    from: ctx.monthFrom,
    to: ctx.monthTo,
    groupBy: 'category',
  })
  const prevYm = ctx.today.slice(0, 7)
  const prevMonth = prevMonthBoundsFromYm(prevYm)
  const catPrev = aggregateProfitability(ctx.profitOrders, {
    from: prevMonth.from,
    to: prevMonth.to,
    groupBy: 'category',
  })
  const categoryTrendsFixed = buildGrowthFromPair(catCurrent, catPrev)

  return {
    topGrowthSource: pickTopGrowth(sourceTrends),
    topDecliningSource: pickTopDecline(sourceTrends),
    topGrowthCategory: pickTopGrowth(categoryTrendsFixed),
    topDecliningCategory: pickTopDecline(categoryTrendsFixed),
    sourceTrends: sourceTrends.slice(0, 10),
    categoryTrends: categoryTrendsFixed.slice(0, 10),
  }
}

function prevMonthBoundsFromYm(ym: string): { from: string; to: string } {
  let year = Number.parseInt(ym.slice(0, 4), 10)
  let month = Number.parseInt(ym.slice(5, 7), 10) - 1
  if (month < 1) {
    month = 12
    year -= 1
  }
  const prevYm = `${year}-${String(month).padStart(2, '0')}`
  const total = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return { from: `${prevYm}-01`, to: `${prevYm}-${String(total).padStart(2, '0')}` }
}

function productStrategicScore(row: ProfitabilityRowDto): number {
  const revenue = num(row.revenue)
  const margin = row.profitMarginPct
  const collected = num(row.collected)
  const open = num(row.openBalance)
  const collRatio = collected + open > 0 ? (collected / (collected + open)) * 100 : 100
  const months = row.detail.months
  let trendBonus = 0
  if (months.length >= 2) {
    const last = num(months[months.length - 1]!.revenue)
    const prev = num(months[months.length - 2]!.revenue)
    trendBonus = pctChange(last, prev) * 0.2
  }
  return round1(clamp(margin * 0.35 + collRatio * 0.25 + trendBonus + Math.min(30, revenue / 10000), 0, 100))
}

function rowTrend(row: ProfitabilityRowDto): StrategicTrend {
  const months = row.detail.months
  if (months.length < 2) return 'FLAT'
  const last = num(months[months.length - 1]!.revenue)
  const prev = num(months[months.length - 2]!.revenue)
  return trendFromPct(pctChange(last, prev))
}

export function buildProductStrategy(ctx: StrategicContext): ProductStrategyDto {
  const catRes = aggregateProfitability(ctx.profitOrders, {
    from: ctx.monthFrom,
    to: ctx.monthTo,
    groupBy: 'category',
  })
  const groups: ProductGroupDto[] = filterRows(catRes.rows).map((r) => ({
    key: r.key,
    label: r.label,
    revenue: r.revenue,
    grossProfit: r.grossProfit,
    profitMarginPct: r.profitMarginPct,
    collected: r.collected,
    riskyReceivable: r.riskyReceivable,
    strategicScore: productStrategicScore(r),
    trend: rowTrend(r),
  }))
  groups.sort((a, b) => b.strategicScore - a.strategicScore)
  const top = groups.slice(0, 5)
  const weak = [...groups].sort((a, b) => a.strategicScore - b.strategicScore).slice(0, 5)
  const recommendedFocusAreas = top
    .filter((g) => g.trend === 'UP' || g.strategicScore >= 55)
    .slice(0, 3)
    .map((g) => `${g.label} — marj %${g.profitMarginPct}, skor ${g.strategicScore}`)
  return { topProductGroups: top, weakProductGroups: weak, recommendedFocusAreas }
}

function supplierScore(row: ProfitabilityRowDto): SupplierScoreDto {
  const revenue = num(row.revenue)
  const open = num(row.openBalance)
  const margin = row.profitMarginPct
  const risky = num(row.riskyReceivable)
  const openShare = revenue > 0 ? open / revenue : 0
  const riskyShare = open > 0 ? risky / open : 0
  const score = round1(
    clamp(margin * 0.4 + (100 - openShare * 100) * 0.3 + (100 - riskyShare * 100) * 0.3, 0, 100),
  )
  const riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' =
    riskyShare > 0.4 || openShare > 0.5 ? 'HIGH' : riskyShare > 0.2 ? 'MEDIUM' : 'LOW'
  return {
    key: row.key,
    label: row.label,
    revenue: row.revenue,
    grossProfit: row.grossProfit,
    openBalance: row.openBalance,
    profitMarginPct: row.profitMarginPct,
    score,
    riskLevel,
  }
}

export function buildSupplierAnalysis(ctx: StrategicContext): SupplierAnalysisDto {
  const scored = filterRows(ctx.supplierRes.rows).map(supplierScore)
  scored.sort((a, b) => b.score - a.score)
  const bestSuppliers = scored.filter((s) => s.riskLevel !== 'HIGH').slice(0, 5)
  const riskySuppliers = [...scored]
    .filter((s) => s.riskLevel === 'HIGH')
    .sort((a, b) => num(b.openBalance) - num(a.openBalance))
    .slice(0, 5)
  return {
    bestSuppliers,
    riskySuppliers,
    supplierScoreboard: scored.slice(0, SCOREBOARD_LIMIT),
  }
}

function staffMap(forecast: StrategicContext['forecast']): Map<string, ForecastStaffRowDto> {
  return new Map(forecast.staffForecast.map((s) => [s.key, s]))
}

function salesPersonScore(row: ProfitabilityRowDto, staff?: ForecastStaffRowDto): SalesPersonScoreDto {
  const collected = num(row.collected)
  const open = num(row.openBalance)
  const margin = row.profitMarginPct
  const collRatio = collected + open > 0 ? (collected / (collected + open)) * 100 : 100
  const achievement = staff?.achievementPct ?? 0
  const score = round1(clamp(margin * 0.25 + collRatio * 0.25 + achievement * 0.5, 0, 100))
  return {
    key: row.key,
    label: row.label,
    revenue: row.revenue,
    grossProfit: row.grossProfit,
    collected: row.collected,
    openBalance: row.openBalance,
    achievementPct: achievement,
    score,
    status: staff?.status ?? 'HEDEF_ALTINDA',
  }
}

export function buildSalesPersonAnalysis(ctx: StrategicContext): SalesPersonAnalysisDto {
  const staff = staffMap(ctx.forecast)
  const scored = filterRows(ctx.personRes.rows)
    .filter((r) => r.key !== 'UNASSIGNED')
    .map((r) => salesPersonScore(r, staff.get(r.key)))
  scored.sort((a, b) => b.score - a.score)
  const topSalesPeople = scored.slice(0, 5)
  const needsImprovement = [...scored]
    .filter((s) => s.status === 'HEDEF_ALTINDA' || s.score < 50)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
  return {
    topSalesPeople,
    needsImprovement,
    salesScoreboard: scored.slice(0, SCOREBOARD_LIMIT),
  }
}

export function buildRiskForecast(ctx: StrategicContext): RiskForecastDto {
  const items: RiskForecastItemDto[] = []
  const totals = ctx.srcRes.totals
  const risky = num(totals.riskyReceivable)
  const open = num(totals.openBalance)
  const dq = ctx.dq.totals.averageQualityScore

  if (risky > 0 && open > 0 && risky / open > 0.2) {
    items.push({
      id: 'rf:collection',
      riskTitle: 'Tahsilat Riski',
      horizonDays: RISK_FORECAST_HORIZON,
      severity: risky / open > 0.35 ? 'CRITICAL' : 'WARNING',
      description: `90 gün içinde ${formatMoneyAmount(risky)} ₺ riskli alacak tahsilat baskısı oluşturabilir.`,
      mitigation: 'Tahsilat planı ve risk segmentasyonu uygulayın.',
    })
  }

  if (dq < 85) {
    items.push({
      id: 'rf:data-quality',
      riskTitle: 'Veri Kalitesi Riski',
      horizonDays: RISK_FORECAST_HORIZON,
      severity: dq < 70 ? 'CRITICAL' : 'WARNING',
      description: `Ortalama veri kalite skoru ${dq}; kârlılık raporları güvenilirliğini kaybedebilir.`,
      mitigation: 'ZERO_COST ve UNKNOWN_SOURCE kayıtlarını önceliklendirin.',
    })
  }

  const shipmentIntensity = ctx.forecast.shipmentForecast?.intensity ?? 'LOW'
  if (ctx.delayedShipments > 0 || shipmentIntensity === 'HIGH') {
    items.push({
      id: 'rf:shipment',
      riskTitle: 'Sevkiyat Yoğunluğu Riski',
      horizonDays: RISK_FORECAST_HORIZON,
      severity: ctx.delayedShipments >= 5 ? 'CRITICAL' : 'WARNING',
      description: `${ctx.delayedShipments} geciken sevk; yoğunluk ${shipmentIntensity}.`,
      mitigation: 'Sevk kapasitesi ve termin planını gözden geçirin.',
    })
  }

  const declining = buildGrowthFromPair(ctx.srcRes, ctx.prevMonthSrc).find((e) => e.trend === 'DOWN')
  if (declining) {
    items.push({
      id: 'rf:revenue-decline',
      riskTitle: `${declining.label} gelir düşüşü`,
      horizonDays: RISK_FORECAST_HORIZON,
      severity: declining.changePct <= -15 ? 'CRITICAL' : 'WARNING',
      description: `${declining.label} geçen aya göre %${Math.abs(declining.changePct)} düştü.`,
      mitigation: 'Kaynak bazlı satış ve teşvik stratejisi geliştirin.',
    })
  }

  for (const alert of ctx.ceo.topAlerts.slice(0, 3)) {
    if (items.length >= 8) break
    if (items.some((i) => i.riskTitle === alert.title)) continue
    items.push({
      id: `rf:alert:${alert.id}`,
      riskTitle: alert.title,
      horizonDays: RISK_FORECAST_HORIZON,
      severity: alert.severity === 'CRITICAL' ? 'CRITICAL' : alert.severity === 'WARNING' ? 'WARNING' : 'INFO',
      description: alert.message,
      mitigation: 'İlgili operasyon modülünde aksiyon alın.',
    })
  }

  return { horizonDays: RISK_FORECAST_HORIZON, items: items.slice(0, 8) }
}

function healthBand(score: number): string {
  if (score >= 85) return 'Mükemmel'
  if (score >= 70) return 'İyi'
  if (score >= 55) return 'Orta'
  if (score >= 40) return 'Zayıf'
  return 'Kritik'
}

export function buildCompanyHealth(ctx: StrategicContext): CompanyHealthDto {
  const totals = ctx.srcRes.totals
  const margin = totals.profitMarginPct
  const collected = num(totals.collected)
  const open = num(totals.openBalance)
  const risky = num(totals.riskyReceivable)
  const collRatio = collected + open > 0 ? (collected / (collected + open)) * 100 : 100
  const riskyShare = open > 0 ? risky / open : 0
  const dq = ctx.dq.totals.averageQualityScore
  const shipmentScore = 100 - Math.min(100, ctx.delayedShipments * 8)
  const opsScore = ctx.ceo.managerScore.score
  const profitabilityScore = clamp(margin, 0, 30) / 30 * 100
  const collectionScore = collRatio
  const riskScore = 100 - Math.min(100, riskyShare * 4 * 100)
  const dataQualityScore = clamp(dq, 0, 100)
  const operationScore = opsScore

  const components = [
    { id: 'profitability', label: 'Kârlılık', score: round1(profitabilityScore), weight: 20 },
    { id: 'collection', label: 'Tahsilat', score: round1(collectionScore), weight: 20 },
    { id: 'risk', label: 'Risk', score: round1(riskScore), weight: 15 },
    { id: 'dataQuality', label: 'Veri Kalitesi', score: round1(dataQualityScore), weight: 15 },
    { id: 'shipment', label: 'Sevkiyat', score: round1(shipmentScore), weight: 15 },
    { id: 'operations', label: 'Operasyon', score: round1(operationScore), weight: 15 },
  ]

  const breakdown = components.map((c) => ({
    ...c,
    weighted: round1((c.score * c.weight) / 100),
  }))
  const score = round1(breakdown.reduce((s, c) => s + c.weighted, 0))
  const prevDq = ctx.forecast.dataQualityTrend?.previousScore ?? dq
  const trend: StrategicTrend =
    dq > prevDq + 2 ? 'UP' : dq < prevDq - 2 ? 'DOWN' : 'FLAT'

  return {
    score,
    band: healthBand(score),
    breakdown,
    trend,
    trendLabel: trend === 'UP' ? 'İyileşiyor' : trend === 'DOWN' ? 'Geriliyor' : 'Stabil',
  }
}

export function buildBoardBriefing(
  ctx: StrategicContext,
  growth: GrowthAnalysisDto,
  health: CompanyHealthDto,
  riskForecast: RiskForecastDto,
  recommendations: StrategicRecommendationDto[],
): BoardBriefingDto {
  const opportunity =
    growth.topGrowthSource != null
      ? `${growth.topGrowthSource.label} satışlarının artırılması (%${growth.topGrowthSource.changePct} büyüme).`
      : growth.topGrowthCategory != null
        ? `${growth.topGrowthCategory.label} kategorisine yatırım.`
        : 'Mevcut kârlı kaynaklarda kapasite artırımı.'

  const biggestRisk =
    riskForecast.items[0]?.riskTitle ??
    (num(ctx.srcRes.totals.riskyReceivable) > 0 ? 'Tahsilat performansı' : 'Operasyonel yoğunluk')

  return {
    headline: `Şirket sağlık endeksi ${health.score} (${health.band}) — ${ctx.today.slice(0, 7)} stratejik görünüm`,
    biggestOpportunity: opportunity,
    biggestRisk: typeof biggestRisk === 'string' ? biggestRisk : String(biggestRisk),
    recommendedActions: recommendations.slice(0, 4).map((r) => r.title),
    nextQuarterFocus:
      growth.topGrowthSource?.label != null
        ? `${growth.topGrowthSource.label} büyümesini ölçeklendirmek ve tahsilat disiplinini güçlendirmek.`
        : 'Kârlılık ve tahsilat dengesini koruyarak seçili kategorilerde büyüme.',
  }
}

export function buildStrategicRecommendations(
  ctx: StrategicContext,
  growth: GrowthAnalysisDto,
  product: ProductStrategyDto,
  supplier: SupplierAnalysisDto,
  sales: SalesPersonAnalysisDto,
  health: CompanyHealthDto,
): StrategicRecommendationDto[] {
  const out: StrategicRecommendationDto[] = []

  if (growth.topGrowthSource) {
    out.push({
      id: 'rec:growth-source',
      category: 'GROWTH',
      title: `${growth.topGrowthSource.label} yatırımını artır`,
      reason: `Geçen aya göre %${growth.topGrowthSource.changePct} büyüme.`,
      priority: 'HIGH',
    })
  }
  if (growth.topDecliningSource) {
    out.push({
      id: 'rec:decline-source',
      category: 'RISK',
      title: `${growth.topDecliningSource.label} gerilemesini araştır`,
      reason: `%${Math.abs(growth.topDecliningSource.changePct)} ciro düşüşü.`,
      priority: 'HIGH',
    })
  }
  if (product.recommendedFocusAreas[0]) {
    out.push({
      id: 'rec:product',
      category: 'GROWTH',
      title: 'Ürün portföyüne odaklan',
      reason: product.recommendedFocusAreas[0]!,
      priority: 'MEDIUM',
    })
  }
  if (supplier.riskySuppliers[0]) {
    out.push({
      id: 'rec:supplier',
      category: 'SUPPLIER',
      title: `${supplier.riskySuppliers[0]!.label} tedarik riskini yönet`,
      reason: `Açık bakiye ${supplier.riskySuppliers[0]!.openBalance} ₺, risk ${supplier.riskySuppliers[0]!.riskLevel}.`,
      priority: 'HIGH',
    })
  }
  if (sales.needsImprovement[0]) {
    out.push({
      id: 'rec:sales',
      category: 'SALES',
      title: `${sales.needsImprovement[0]!.label} performans planı`,
      reason: `Skor ${sales.needsImprovement[0]!.score}, durum ${sales.needsImprovement[0]!.status}.`,
      priority: 'MEDIUM',
    })
  }
  if (num(ctx.srcRes.totals.riskyReceivable) > 0) {
    out.push({
      id: 'rec:finance',
      category: 'FINANCE',
      title: 'Tahsilat stratejisi güncelle',
      reason: `Riskli alacak ${ctx.srcRes.totals.riskyReceivable} ₺.`,
      priority: 'HIGH',
    })
  }
  if (ctx.dq.totals.averageQualityScore < 85) {
    out.push({
      id: 'rec:operations',
      category: 'OPERATIONS',
      title: 'Veri kalitesi iyileştirme programı',
      reason: `Ortalama skor ${ctx.dq.totals.averageQualityScore}.`,
      priority: health.score < 55 ? 'HIGH' : 'MEDIUM',
    })
  }
  if (ctx.delayedShipments > 3) {
    out.push({
      id: 'rec:shipment',
      category: 'OPERATIONS',
      title: 'Sevk kapasitesi planla',
      reason: `${ctx.delayedShipments} geciken sevk.`,
      priority: 'MEDIUM',
    })
  }

  const priorityRank = { HIGH: 1, MEDIUM: 2, LOW: 3 }
  out.sort((a, b) => priorityRank[a.priority] - priorityRank[b.priority])
  return out.slice(0, RECOMMENDATIONS_LIMIT)
}

export async function gatherStrategicContext(prisma: PrismaClient): Promise<StrategicContext> {
  const data = await gatherCeoData(prisma)
  const prevYm = data.today.slice(0, 7)
  const prev = prevMonthBoundsFromYm(prevYm)
  const prevMonthCat = aggregateProfitability(data.profitOrders, {
    from: prev.from,
    to: prev.to,
    groupBy: 'category',
  })
  const brandRes = aggregateProfitability(data.profitOrders, {
    from: data.monthFrom,
    to: data.monthTo,
    groupBy: 'brand',
  })
  const ceo = assembleCeoControlCenter(data)
  return { ...data, ceo, prevMonthCat, brandRes }
}

export function assembleStrategicIntelligence(ctx: StrategicContext): StrategicIntelligenceResponseDto {
  const growthAnalysis = buildGrowthAnalysis(ctx)
  const productStrategy = buildProductStrategy(ctx)
  const supplierAnalysis = buildSupplierAnalysis(ctx)
  const salesPersonAnalysis = buildSalesPersonAnalysis(ctx)
  const companyHealth = buildCompanyHealth(ctx)
  const riskForecast = buildRiskForecast(ctx)
  const recommendations = buildStrategicRecommendations(
    ctx,
    growthAnalysis,
    productStrategy,
    supplierAnalysis,
    salesPersonAnalysis,
    companyHealth,
  )
  const boardBriefing = buildBoardBriefing(ctx, growthAnalysis, companyHealth, riskForecast, recommendations)

  const totals = ctx.srcRes.totals
  const summary: StrategicIntelligenceSummaryDto = {
    companyHealthScore: companyHealth.score,
    companyHealthBand: companyHealth.band,
    topGrowthLabel: growthAnalysis.topGrowthSource?.label ?? null,
    topRiskLabel: riskForecast.items[0]?.riskTitle ?? null,
    recommendationCount: recommendations.length,
    analysisMonth: ctx.today.slice(0, 7),
    generatedAt: new Date().toISOString(),
  }

  return {
    summary,
    growthAnalysis,
    profitabilityAnalysis: {
      monthRevenue: totals.revenue,
      monthGrossProfit: totals.grossProfit,
      profitMarginPct: totals.profitMarginPct,
      realizedProfit: totals.realizedProfit,
      pendingProfit: totals.pendingProfit,
      riskyReceivable: totals.riskyReceivable,
      mostProfitableSource: ctx.srcRes.summary.mostProfitableSource?.label ?? null,
      mostProfitableSalesPerson: ctx.srcRes.summary.mostProfitableSalesPerson?.label ?? null,
    },
    supplierAnalysis,
    salesPersonAnalysis,
    riskForecast,
    companyHealth,
    boardBriefing,
    recommendations,
    today: ctx.today,
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true },
  }
}
