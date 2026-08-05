/**
 * Kurumsal Gelecek Motoru — Faz 5–19 sentezi ile 6 senaryo × 4 ufuk simülasyonu.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import {
  buildCompanyHealth,
  buildGrowthAnalysis,
  buildSalesPersonAnalysis,
  type StrategicContext,
} from './strategicIntelligenceEngine.js'
import { computeHealthFromMetrics } from './companySimulationEngine.js'
import {
  assembleChairmanIntelligence,
  gatherChairmanContext,
  type ChairmanContext,
} from './chairmanEngine.js'
import type { ChairmanIntelligenceResponseDto } from '../contracts/chairmanDto.js'
import type {
  FutureEngineResponseDto,
  FutureEngineSummaryDto,
  FutureHorizonDays,
  FutureHorizonProjectionDto,
  FutureMetricsDto,
  FutureScenarioDto,
  FutureScenarioId,
  ScenarioVerdict,
} from '../contracts/futureEngineDto.js'

const HORIZONS: FutureHorizonDays[] = [30, 90, 180, 365]

const SOURCE_MODULES = [
  'profitability',
  'forecast',
  'advisor',
  'actionCenter',
  'operationCases',
  'automation',
  'ceoControlCenter',
  'operationsAgents',
  'strategicIntelligence',
  'companySimulation',
  'boardDirectors',
  'ceoIntelligence',
  'chairman',
] as const

const SCENARIO_NAMES: Record<FutureScenarioId, string> = {
  BASELINE: 'Mevcut Gidişat',
  AGGRESSIVE_GROWTH: 'Agresif Büyüme',
  DEFENSIVE: 'Defansif',
  COLLECTION_FIRST: 'Tahsilat Öncelikli',
  EXPANSION: 'Genişleme (Yeni Mağaza)',
  CRISIS: 'Kriz Senaryosu',
}

const VERDICT_LABELS: Record<ScenarioVerdict, string> = {
  RECOMMENDED: 'Önerilir',
  NEUTRAL: 'Nötr',
  AVOID: 'Kaçınılmalı',
}

type BaseState = {
  revenue: number
  profit: number
  collected: number
  openBalance: number
  riskyReceivable: number
  profitMarginPct: number
  delayedShipments: number
  dataQualityScore: number
  managerScore: number
  staffCount: number
  supplierRiskScore: number
  collectionRate: number
  health: number
  risk: number
}

export type EnterpriseFutureContext = ChairmanContext & {
  chairmanReport: ChairmanIntelligenceResponseDto
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

function scoreBand(score: number): string {
  if (score >= 85) return 'Mükemmel'
  if (score >= 70) return 'İyi'
  if (score >= 55) return 'Orta'
  if (score >= 40) return 'Zayıf'
  return 'Kritik'
}

export function extractBaseState(ctx: EnterpriseFutureContext): BaseState {
  const totals = ctx.strategic.srcRes.totals
  const collected = num(totals.collected)
  const openBalance = num(totals.openBalance)
  const riskyReceivable = num(totals.riskyReceivable)
  const revenue = num(totals.revenue)
  const profit = num(totals.grossProfit)
  const collectionRate = collected + openBalance > 0 ? (collected / (collected + openBalance)) * 100 : 100
  const sales = buildSalesPersonAnalysis(ctx.strategic)
  const staffCount = Math.max(1, sales.salesScoreboard.length)
  const supplierRiskScore = clamp(ctx.strategic.supplierRes.rows.filter((r) => r.profitMarginPct < 15).length * 12, 0, 100)

  const virtual = {
    revenue,
    grossProfit: profit,
    profitMarginPct: totals.profitMarginPct,
    collected,
    openBalance,
    riskyReceivable,
    delayedShipments: ctx.strategic.delayedShipments,
    dataQualityScore: ctx.strategic.dq.totals.averageQualityScore,
    managerScore: ctx.strategic.ceo.managerScore.score,
    externalSupplyShare: 0,
  }
  const { risk } = computeHealthFromMetrics(virtual)

  return {
    revenue,
    profit,
    collected,
    openBalance,
    riskyReceivable,
    profitMarginPct: totals.profitMarginPct,
    delayedShipments: ctx.strategic.delayedShipments,
    dataQualityScore: ctx.strategic.dq.totals.averageQualityScore,
    managerScore: ctx.strategic.ceo.managerScore.score,
    staffCount,
    supplierRiskScore,
    collectionRate,
    health: buildCompanyHealth(ctx.strategic).score,
    risk,
  }
}

type ScenarioFactors = {
  revenueGrowthPer30d: number
  marginDeltaPer30d: number
  collectionDeltaPer30d: number
  openBalanceDeltaPer30d: number
  riskyDeltaPer30d: number
  shipmentDeltaPer30d: number
  staffDeltaPer30d: number
  supplierRiskDeltaPer30d: number
  dqDeltaPer30d: number
}

const SCENARIO_FACTORS: Record<FutureScenarioId, ScenarioFactors> = {
  BASELINE: {
    revenueGrowthPer30d: 0.015,
    marginDeltaPer30d: 0,
    collectionDeltaPer30d: 0.003,
    openBalanceDeltaPer30d: 0.01,
    riskyDeltaPer30d: 0.005,
    shipmentDeltaPer30d: 0.05,
    staffDeltaPer30d: 0,
    supplierRiskDeltaPer30d: 0,
    dqDeltaPer30d: 0.2,
  },
  AGGRESSIVE_GROWTH: {
    revenueGrowthPer30d: 0.035,
    marginDeltaPer30d: -0.15,
    collectionDeltaPer30d: -0.005,
    openBalanceDeltaPer30d: 0.025,
    riskyDeltaPer30d: 0.015,
    shipmentDeltaPer30d: 0.2,
    staffDeltaPer30d: 0.15,
    supplierRiskDeltaPer30d: 0.08,
    dqDeltaPer30d: -0.1,
  },
  DEFENSIVE: {
    revenueGrowthPer30d: 0.005,
    marginDeltaPer30d: 0.1,
    collectionDeltaPer30d: 0.01,
    openBalanceDeltaPer30d: -0.01,
    riskyDeltaPer30d: -0.02,
    shipmentDeltaPer30d: -0.05,
    staffDeltaPer30d: 0,
    supplierRiskDeltaPer30d: -0.05,
    dqDeltaPer30d: 0.3,
  },
  COLLECTION_FIRST: {
    revenueGrowthPer30d: 0.008,
    marginDeltaPer30d: 0.05,
    collectionDeltaPer30d: 0.025,
    openBalanceDeltaPer30d: -0.03,
    riskyDeltaPer30d: -0.025,
    shipmentDeltaPer30d: 0,
    staffDeltaPer30d: 0.05,
    supplierRiskDeltaPer30d: -0.02,
    dqDeltaPer30d: 0.25,
  },
  EXPANSION: {
    revenueGrowthPer30d: 0.045,
    marginDeltaPer30d: -0.2,
    collectionDeltaPer30d: -0.01,
    openBalanceDeltaPer30d: 0.04,
    riskyDeltaPer30d: 0.02,
    shipmentDeltaPer30d: 0.35,
    staffDeltaPer30d: 0.25,
    supplierRiskDeltaPer30d: 0.1,
    dqDeltaPer30d: -0.15,
  },
  CRISIS: {
    revenueGrowthPer30d: -0.02,
    marginDeltaPer30d: -0.35,
    collectionDeltaPer30d: -0.02,
    openBalanceDeltaPer30d: 0.05,
    riskyDeltaPer30d: 0.04,
    shipmentDeltaPer30d: 0.15,
    staffDeltaPer30d: -0.1,
    supplierRiskDeltaPer30d: 0.15,
    dqDeltaPer30d: -0.5,
  },
}

function projectMetrics(base: BaseState, scenario: FutureScenarioId, days: number): FutureMetricsDto {
  const f = SCENARIO_FACTORS[scenario]
  const periods = days / 30
  const growthFactor = Math.pow(1 + f.revenueGrowthPer30d, periods)
  const revenue = base.revenue * growthFactor
  const margin = clamp(base.profitMarginPct + f.marginDeltaPer30d * periods, 5, 35)
  const profit = revenue * (margin / 100)
  const collectionRate = clamp(base.collectionRate + f.collectionDeltaPer30d * periods * 100, 30, 98)
  const openBalance = Math.max(0, base.openBalance * Math.pow(1 + f.openBalanceDeltaPer30d, periods))
  const riskyReceivable = Math.min(openBalance, base.riskyReceivable * Math.pow(1 + f.riskyDeltaPer30d, periods))
  const cashFlow = profit * (collectionRate / 100) - riskyReceivable * 0.05
  const shipmentLoad = round1(clamp(base.delayedShipments + f.shipmentDeltaPer30d * periods * 10, 0, 50))
  const staffLoad = round1(clamp(base.staffCount * (1 + f.staffDeltaPer30d * periods), 1, 50))
  const supplierRisk = round1(clamp(base.supplierRiskScore + f.supplierRiskDeltaPer30d * periods * 100, 0, 100))
  const dq = clamp(base.dataQualityScore + f.dqDeltaPer30d * periods, 40, 100)

  const virtual = {
    revenue,
    grossProfit: profit,
    profitMarginPct: margin,
    collected: revenue * (collectionRate / 100),
    openBalance,
    riskyReceivable,
    delayedShipments: shipmentLoad,
    dataQualityScore: dq,
    managerScore: clamp(base.managerScore - (scenario === 'CRISIS' ? periods * 3 : 0), 0, 100),
    externalSupplyShare: 0,
  }
  const { health, risk } = computeHealthFromMetrics(virtual)

  return {
    revenue: formatMoneyAmount(revenue),
    profit: formatMoneyAmount(profit),
    cashFlow: formatMoneyAmount(cashFlow),
    openBalance: formatMoneyAmount(openBalance),
    risk: round1(risk),
    shipmentLoad,
    staffLoad,
    supplierRisk,
    collectionRate: round1(collectionRate),
    companyHealth: round1(health),
  }
}

function scenarioBasis(scenario: FutureScenarioId, base: BaseState): string {
  switch (scenario) {
    case 'BASELINE':
      return `Mevcut ciro ${formatMoneyAmount(base.revenue)} ₺ ve %${base.profitMarginPct} marj ile doğrusal extrapolasyon.`
    case 'AGGRESSIVE_GROWTH':
      return 'Aylık %3.5 ciro artışı; operasyon ve risk yükü artar.'
    case 'DEFENSIVE':
      return 'Düşük büyüme, marj koruma ve risk azaltma öncelikli.'
    case 'COLLECTION_FIRST':
      return 'Tahsilat oranı iyileşir; açık bakiye ve riskli alacak düşer.'
    case 'EXPANSION':
      return 'Yeni mağaza yatırımı ile yüksek ciro; sevk ve personel yükü artar.'
    case 'CRISIS':
      return 'Ciro düşüşü, marj baskısı ve risk artışı simüle edildi.'
  }
}

function resolveVerdict(scenario: FutureScenarioId, metrics365: FutureMetricsDto): ScenarioVerdict {
  const h = metrics365.companyHealth
  const r = metrics365.risk
  if (scenario === 'CRISIS') return 'AVOID'
  if (h >= 68 && r >= 55 && scenario !== 'AGGRESSIVE_GROWTH') return 'RECOMMENDED'
  if (scenario === 'COLLECTION_FIRST' && h >= 60 && r >= 50) return 'RECOMMENDED'
  if (scenario === 'DEFENSIVE' && h >= 62) return 'RECOMMENDED'
  if (h < 45 || r < 40) return 'AVOID'
  if (scenario === 'EXPANSION' && h < 58) return 'AVOID'
  return 'NEUTRAL'
}

export function buildScenario(base: BaseState, scenarioId: FutureScenarioId): FutureScenarioDto {
  const horizons: FutureHorizonProjectionDto[] = HORIZONS.map((days) => ({
    days,
    metrics: projectMetrics(base, scenarioId, days),
  }))
  const m365 = horizons.find((h) => h.days === 365)!.metrics
  const verdict = resolveVerdict(scenarioId, m365)

  return {
    scenarioId,
    scenarioName: SCENARIO_NAMES[scenarioId],
    verdict,
    verdictLabel: VERDICT_LABELS[verdict],
    basis: scenarioBasis(scenarioId, base),
    horizons,
  }
}

export function computeFutureScore(scenarios: FutureScenarioDto[], ctx: EnterpriseFutureContext): number {
  const baseline365 = scenarios.find((s) => s.scenarioId === 'BASELINE')?.horizons.find((h) => h.days === 365)?.metrics
  const health = baseline365?.companyHealth ?? 50
  const chairman = ctx.chairmanReport.chairmanScore
  const ceo = ctx.ceoReport.ceoScore
  const growth = growthTrendScore(ctx.strategic)
  return round1(health * 0.35 + chairman * 0.25 + ceo * 0.2 + growth * 0.2)
}

function growthTrendScore(ctx: StrategicContext): number {
  const growth = buildGrowthAnalysis(ctx)
  const top = growth.topGrowthSource
  if (!top) return 50
  if (top.trend === 'UP') return clamp(50 + top.changePct * 2, 50, 95)
  if (top.trend === 'DOWN') return clamp(50 + top.changePct * 2, 10, 50)
  return 50
}

export function pickBestWorst(scenarios: FutureScenarioDto[]): { best: FutureScenarioDto; worst: FutureScenarioDto } {
  let best = scenarios[0]!
  let worst = scenarios[0]!
  for (const s of scenarios) {
    const h365 = s.horizons.find((h) => h.days === 365)!.metrics.companyHealth
    const bestH = best.horizons.find((h) => h.days === 365)!.metrics.companyHealth
    const worstH = worst.horizons.find((h) => h.days === 365)!.metrics.companyHealth
    if (h365 > bestH) best = s
    if (h365 < worstH) worst = s
  }
  return { best, worst }
}

export function buildManagementBriefing(ctx: EnterpriseFutureContext, best: FutureScenarioDto, worst: FutureScenarioDto, futureScore: number): string[] {
  const base = extractBaseState(ctx)
  const growth = buildGrowthAnalysis(ctx.strategic)
  const paragraphs: string[] = []

  paragraphs.push(
    `Kurumsal Gelecek Motoru bugünkü baseline sağlık skoru ${base.health} ve gelecek skoru ${futureScore} ile çalıştı. ` +
      `Başkan kararı ${ctx.chairmanReport.chairmanDecision}, CEO kararı ${ctx.ceoReport.ceoDecision} — uzun vadeli simülasyon bu önceliklerle hizalandı.`,
  )

  paragraphs.push(
    `En iyi 365 günlük senaryo: ${best.scenarioName} (sağlık ${best.horizons.find((h) => h.days === 365)!.metrics.companyHealth}, ${best.verdictLabel}). ` +
      `En kötü senaryo: ${worst.scenarioName} (sağlık ${worst.horizons.find((h) => h.days === 365)!.metrics.companyHealth}). ` +
      `Yönetim ${best.verdict === 'RECOMMENDED' ? 'agresif olmayan kontrollü büyüme veya tahsilat disiplini yolunu değerlendirmeli' : 'risk azaltma öncelikli kalmalı'}.`,
  )

  if (growth.topGrowthSource) {
    paragraphs.push(
      `Büyüme trendi ${growth.topGrowthSource.label} kaynağında %${growth.topGrowthSource.changePct} (${growth.topGrowthSource.trend}). ` +
        `90 günlük ufukta baseline ciro ${scenarios365Revenue(ctx, 'BASELINE', 90)} seviyesine evrilir; genişleme senaryosu operasyon yükünü artırır.`,
    )
  } else {
    paragraphs.push(
      `Büyüme trendi belirsiz; 90 günlük ufuk baseline koruma senaryosuna yakın seyreder. Operasyon kapasitesi mevcut seviyede tutulmalı.`,
    )
  }

  paragraphs.push(
    `Tahsilat oranı bugün %${round1(base.collectionRate)}; Tahsilat Öncelikli senaryoda 365. gün %${scenarios365Collection(ctx, 'COLLECTION_FIRST')} hedeflenir. ` +
      `Kriz senaryosunda nakit akışı ve risk skoru yönetim kuruluna acil brifing gerektirir.`,
  )

  paragraphs.push(
    `Başkan notu: ${ctx.chairmanReport.chairmanReason[0] ?? '—'} ` +
      `Önerilen yönetim aksiyonu — ${best.scenarioName} senaryosu ${best.verdictLabel}; ` +
      `${worst.scenarioId === 'CRISIS' ? 'kriz planı hazır tutulmalı' : 'kriz senaryosu referans bandı olarak izlenmeli'}.`,
  )

  return paragraphs
}

function scenarios365Revenue(ctx: EnterpriseFutureContext, id: FutureScenarioId, days: number): string {
  const base = extractBaseState(ctx)
  return projectMetrics(base, id, days).revenue
}

function scenarios365Collection(ctx: EnterpriseFutureContext, id: FutureScenarioId): number {
  const base = extractBaseState(ctx)
  return projectMetrics(base, id, 365).collectionRate
}

export async function gatherEnterpriseFutureContext(prisma: PrismaClient): Promise<EnterpriseFutureContext> {
  const chairmanCtx = await gatherChairmanContext(prisma)
  const chairmanReport = assembleChairmanIntelligence(chairmanCtx)
  return { ...chairmanCtx, chairmanReport }
}

export function assembleEnterpriseFuture(ctx: EnterpriseFutureContext): FutureEngineResponseDto {
  const base = extractBaseState(ctx)
  const scenarioIds: FutureScenarioId[] = [
    'BASELINE',
    'AGGRESSIVE_GROWTH',
    'DEFENSIVE',
    'COLLECTION_FIRST',
    'EXPANSION',
    'CRISIS',
  ]
  const scenarios = scenarioIds.map((id) => buildScenario(base, id))
  const { best, worst } = pickBestWorst(scenarios)
  const futureScore = computeFutureScore(scenarios, ctx)
  const generatedAt = new Date().toISOString()

  const summary: FutureEngineSummaryDto = {
    futureScore,
    futureScoreBand: scoreBand(futureScore),
    scenarioCount: scenarios.length,
    bestScenarioId: best.scenarioId,
    worstScenarioId: worst.scenarioId,
    chairmanDecision: ctx.chairmanReport.chairmanDecision,
    ceoDecision: ctx.ceoReport.ceoDecision,
    horizons: HORIZONS,
    generatedAt,
  }

  return {
    summary,
    futureScore,
    scenarios,
    bestScenario: best,
    worstScenario: worst,
    managementBriefing: buildManagementBriefing(ctx, best, worst, futureScore),
    today: ctx.strategic.today,
    generatedAt,
    meta: { depoKatiExcluded: true, virtualOnly: true, sources: [...SOURCE_MODULES] },
  }
}
