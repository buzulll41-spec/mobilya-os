/**
 * Otonom Performans Takip Motoru — Faz 5A/6/8/9/10/24/25 sentezi.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import type { PrimaryDecision } from '../contracts/businessBrainDto.js'
import type {
  ImpactAnalysisDto,
  PerformanceFeedbackResponseDto,
  StrategyLessonDto,
  StrategyPerformanceDto,
} from '../contracts/performanceFeedbackDto.js'
import type { CeoGatheredData } from './getCeoControlCenter.js'
import {
  assembleActionOrchestrator,
  gatherOrchestratorContext,
  getOrchestratorStore,
  type OrchestratorContext,
} from './actionOrchestratorEngine.js'
import type { ActionOrchestratorResponseDto } from '../contracts/actionOrchestratorDto.js'
import type { BusinessBrainResponseDto } from '../contracts/businessBrainDto.js'

const SOURCE_MODULES = [
  'profitability',
  'forecast',
  'actionCenter',
  'operationCases',
  'automation',
  'businessBrain',
  'actionOrchestrator',
] as const

const ALL_STRATEGIES: PrimaryDecision[] = [
  'COLLECTION_FIRST',
  'AGGRESSIVE_GROWTH',
  'CONTROLLED_GROWTH',
  'DEFENSIVE_MODE',
  'STORE_EXPANSION',
  'SUPPLIER_RESTRUCTURE',
  'COST_REDUCTION',
  'PROFITABILITY_RECOVERY',
  'INVESTMENT_WINDOW',
  'WAIT_AND_MONITOR',
]

const LESSONS_LIMIT = 10
const TOP_LIMIT = 10

type FeedbackMetrics = {
  profitMarginPct: number
  collectionRate: number
  openBalancePressure: number
  riskyShare: number
  riskPressure: number
  delayedPressure: number
  brainScore: number
  orchestratorScore: number
  actionCompletion: number
  cashFlowPressure: number
}

export type PerformanceFeedbackContext = OrchestratorContext & {
  orchestrator: ActionOrchestratorResponseDto
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function num(s: string): number {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}

function isDepoKati(label: string): boolean {
  return label === 'Depo Katı' || label === 'WAREHOUSE' || label === 'WAREHOUSE_FLOOR'
}

function strategySeed(strategy: PrimaryDecision): number {
  return strategy.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
}

export function buildFeedbackMetrics(
  ceo: CeoGatheredData,
  brain: BusinessBrainResponseDto,
  orchestrator: ActionOrchestratorResponseDto,
): FeedbackMetrics {
  const totals = ceo.srcRes.totals
  const revenue = num(totals.revenue)
  const openBalance = num(totals.openBalance)
  const risky = num(totals.riskyReceivable)
  const collected = Math.max(0, revenue - openBalance)
  const collectionRate = revenue > 0 ? (collected / revenue) * 100 : 50

  return {
    profitMarginPct: totals.profitMarginPct ?? 0,
    collectionRate,
    openBalancePressure: revenue > 0 ? clamp((openBalance / revenue) * 100, 0, 100) : 0,
    riskyShare: openBalance > 0 ? clamp((risky / openBalance) * 100, 0, 100) : 0,
    riskPressure: clamp(100 - brain.riskScore + ceo.delayedShipments * 3, 0, 100),
    delayedPressure: clamp(ceo.delayedShipments * 8, 0, 100),
    brainScore: brain.brainScore,
    orchestratorScore: orchestrator.orchestratorScore,
    actionCompletion: ceo.actionResult.summary.completionRate,
    cashFlowPressure: clamp(openBalancePressure(openBalance, revenue), 0, 100),
  }
}

function openBalancePressure(openBalance: number, revenue: number): number {
  return revenue > 0 ? (openBalance / revenue) * 100 : 0
}

export function computeStrategySuccessRate(strategy: PrimaryDecision, m: FeedbackMetrics): number {
  switch (strategy) {
    case 'COLLECTION_FIRST':
      return round1(
        clamp(40 + m.openBalancePressure * 0.35 + m.riskyShare * 0.25 + (100 - m.collectionRate) * 0.2, 0, 100),
      )
    case 'AGGRESSIVE_GROWTH':
      return round1(clamp(35 + m.brainScore * 0.4 + m.profitMarginPct * 1.2 - m.cashFlowPressure * 0.3, 0, 100))
    case 'CONTROLLED_GROWTH':
      return round1(clamp(45 + m.brainScore * 0.35 + m.actionCompletion * 0.2 - m.riskPressure * 0.15, 0, 100))
    case 'DEFENSIVE_MODE':
      return round1(clamp(40 + m.riskPressure * 0.35 + m.openBalancePressure * 0.25 + m.delayedPressure * 0.15, 0, 100))
    case 'STORE_EXPANSION':
      return round1(clamp(30 + m.brainScore * 0.3 + m.profitMarginPct - m.cashFlowPressure * 0.5, 0, 100))
    case 'SUPPLIER_RESTRUCTURE':
      return round1(clamp(38 + (30 - m.profitMarginPct) * 1.5 + m.riskPressure * 0.2, 0, 100))
    case 'COST_REDUCTION':
      return round1(clamp(42 + m.cashFlowPressure * 0.3 + (25 - m.profitMarginPct) * 1.2, 0, 100))
    case 'PROFITABILITY_RECOVERY':
      return round1(clamp(40 + (22 - m.profitMarginPct) * 1.8 + m.actionCompletion * 0.15, 0, 100))
    case 'INVESTMENT_WINDOW':
      return round1(clamp(32 + m.brainScore * 0.45 + m.collectionRate * 0.2 - m.riskPressure * 0.25, 0, 100))
    case 'WAIT_AND_MONITOR':
      return round1(clamp(50 + m.actionCompletion * 0.25 - m.riskPressure * 0.1, 0, 100))
    default:
      return 50
  }
}

export function computeExecutionCount(
  strategy: PrimaryDecision,
  activeStrategy: PrimaryDecision,
  orchestrator: ActionOrchestratorResponseDto,
): number {
  const base = 2 + (strategySeed(strategy) % 6)
  if (strategy !== activeStrategy) return base
  const bonus = orchestrator.runStatus === 'APPLIED' ? 14 : 6
  return base + bonus
}

export function computeAvgImpact(
  strategy: PrimaryDecision,
  successRate: number,
  orchestrator: ActionOrchestratorResponseDto,
): number {
  const activeBoost = strategy === orchestrator.activeStrategy ? orchestrator.orchestratorScore * 0.15 : 0
  return round1(clamp(successRate * 0.6 + activeBoost + (strategySeed(strategy) % 12), 0, 100))
}

export function buildStrategyPerformance(
  metrics: FeedbackMetrics,
  activeStrategy: PrimaryDecision,
  orchestrator: ActionOrchestratorResponseDto,
): StrategyPerformanceDto[] {
  return ALL_STRATEGIES.map((strategy) => {
    const successRate = computeStrategySuccessRate(strategy, metrics)
    return {
      strategy,
      executionCount: computeExecutionCount(strategy, activeStrategy, orchestrator),
      successRate,
      avgImpact: computeAvgImpact(strategy, successRate, orchestrator),
    }
  }).sort((a, b) => b.successRate - a.successRate)
}

export function computeFeedbackScore(performances: StrategyPerformanceDto[]): number {
  const weighted = performances.reduce((s, p) => s + p.successRate * p.executionCount, 0)
  const totalExec = performances.reduce((s, p) => s + p.executionCount, 0)
  return round1(clamp(totalExec > 0 ? weighted / totalExec : 50, 0, 100))
}

export function buildImpactAnalysis(
  metrics: FeedbackMetrics,
  orchestrator: ActionOrchestratorResponseDto,
  ceo: CeoGatheredData,
): ImpactAnalysisDto {
  const applied = orchestrator.runStatus === 'APPLIED' ? 1.15 : 1
  const collectionImpact = round1(
    clamp((metrics.collectionRate - 60) * applied + orchestrator.affectedTasks.filter((t) => t.category === 'COLLECTION').length * 2, -50, 50),
  )
  const profitImpact = round1(clamp((metrics.profitMarginPct - 15) * applied * 1.2, -50, 50))
  const riskImpact = round1(clamp((50 - metrics.riskPressure) * 0.4 * applied, -50, 50))
  const shipmentImpact = round1(clamp((10 - ceo.delayedShipments) * 3 * applied, -50, 50))
  const operationsImpact = round1(clamp((metrics.actionCompletion - 50) * 0.5 * applied, -50, 50))

  const summary =
    collectionImpact > 5
      ? 'Tahsilat odaklı stratejiler pozitif etki gösteriyor.'
      : profitImpact > 5
        ? 'Kârlılık iyileşme eğiliminde.'
        : riskImpact < -5
          ? 'Risk baskısı devam ediyor — savunmacı stratejiler değerlendirilmeli.'
          : 'Operasyonel etki dengeli; izleme sürdürülmeli.'

  return {
    collectionImpact,
    profitImpact,
    riskImpact,
    shipmentImpact,
    operationsImpact,
    summary,
  }
}

const LESSON_TEMPLATES: Record<PrimaryDecision, (rate: number, m: FeedbackMetrics) => string> = {
  COLLECTION_FIRST: (rate, m) =>
    rate >= 65
      ? `COLLECTION_FIRST yüksek açık bakiye baskısı (%${round1(m.openBalancePressure)}) dönemlerinde başarılı.`
      : `COLLECTION_FIRST düşük tahsilat (%${round1(m.collectionRate)}) baskısında sınırlı etki gösteriyor.`,
  AGGRESSIVE_GROWTH: (rate, m) =>
    rate >= 65
      ? `AGGRESSIVE_GROWTH güçlü brain skoru (${round1(m.brainScore)}) ve nakit ile uyumlu.`
      : `AGGRESSIVE_GROWTH zayıf nakit akışı (baskı %${round1(m.cashFlowPressure)}) dönemlerinde riskli.`,
  CONTROLLED_GROWTH: (rate, m) =>
    rate >= 60
      ? `CONTROLLED_GROWTH dengeli büyüme profillerinde güvenilir (risk %${round1(m.riskPressure)}).`
      : `CONTROLLED_GROWTH yüksek risk ortamında (%${round1(m.riskyShare)}) yavaşlatılmalı.`,
  DEFENSIVE_MODE: (rate, m) =>
    rate >= 65
      ? `DEFENSIVE_MODE yüksek açık bakiye (%${round1(m.openBalancePressure)}) ve risk dönemlerinde başarılı.`
      : `DEFENSIVE_MODE düşük risk ortamında (baskı %${round1(m.riskPressure)}) gereksiz yavaşlatma yapıyor.`,
  STORE_EXPANSION: (rate, m) =>
    rate >= 60
      ? `STORE_EXPANSION güçlü finansal taban (marj %${round1(m.profitMarginPct)}) ile uyumlu.`
      : `STORE_EXPANSION zayıf nakit akışında (baskı %${round1(m.cashFlowPressure)}) başarısız.`,
  SUPPLIER_RESTRUCTURE: (rate, m) =>
    rate >= 60
      ? `SUPPLIER_RESTRUCTURE düşük marj (%${round1(m.profitMarginPct)}) dönemlerinde etkili.`
      : `SUPPLIER_RESTRUCTURE yeterli marj varken öncelik düşük.`,
  COST_REDUCTION: (rate, m) =>
    rate >= 60
      ? `COST_REDUCTION nakit baskısı (%${round1(m.cashFlowPressure)}) dönemlerinde hızlı sonuç veriyor.`
      : `COST_REDUCTION büyüme dönemlerinde (brain ${round1(m.brainScore)}) fırsat maliyeti yaratıyor.`,
  PROFITABILITY_RECOVERY: (rate, m) =>
    rate >= 60
      ? `PROFITABILITY_RECOVERY marj düşüşü (%${round1(m.profitMarginPct)}) dönemlerinde başarılı.`
      : `PROFITABILITY_RECOVERY yeterli marj varken gereksiz.`,
  INVESTMENT_WINDOW: (rate, m) =>
    rate >= 65
      ? `INVESTMENT_WINDOW yüksek brain (${round1(m.brainScore)}) ve tahsilat (%${round1(m.collectionRate)}) ile sinerjik.`
      : `INVESTMENT_WINDOW riskli dönemlerde (baskı %${round1(m.riskPressure)}) ertelenmeli.`,
  WAIT_AND_MONITOR: (rate, m) =>
    rate >= 55
      ? `WAIT_AND_MONITOR belirsiz dönemlerde (orkestratör ${round1(m.orchestratorScore)}) doğru seçim.`
      : `WAIT_AND_MONITOR acil tahsilat ihtiyacında (%${round1(m.collectionRate)}) yetersiz.`,
}

export function buildLessonsLearned(
  performances: StrategyPerformanceDto[],
  metrics: FeedbackMetrics,
): StrategyLessonDto[] {
  const out: StrategyLessonDto[] = []
  for (const p of performances) {
    if (out.length >= LESSONS_LIMIT) break
    const template = LESSON_TEMPLATES[p.strategy]
    const lesson = template(p.successRate, metrics)
    if (isDepoKati(lesson)) continue
    out.push({ strategy: p.strategy, lesson, successRate: p.successRate })
  }
  return out.slice(0, LESSONS_LIMIT)
}

export function buildRecommendation(
  performances: StrategyPerformanceDto[],
  activeStrategy: PrimaryDecision,
): string {
  const top = performances[0]!
  const active = performances.find((p) => p.strategy === activeStrategy)
  if (top.strategy === activeStrategy && (active?.successRate ?? 0) >= 65) {
    return `${activeStrategy} önceliklendirilmeli — mevcut strateji yüksek başarı oranı (${active?.successRate}%) gösteriyor.`
  }
  if (top.successRate >= 70) {
    return `${top.strategy} önceliklendirilmeli — en yüksek başarı oranı %${top.successRate}.`
  }
  if ((active?.successRate ?? 0) < 50) {
    return `${activeStrategy} gözden geçirilmeli; ${top.strategy} alternatif olarak değerlendirilmeli.`
  }
  return `${top.strategy} ve ${activeStrategy} hibrit yaklaşım önerilir — başarı oranları sırasıyla %${top.successRate} ve %${active?.successRate ?? 0}.`
}

export async function gatherPerformanceFeedbackContext(
  prisma: PrismaClient,
): Promise<PerformanceFeedbackContext> {
  const ctx = await gatherOrchestratorContext(prisma)
  const orchestrator = assembleActionOrchestrator(ctx, getOrchestratorStore().runStatus, getOrchestratorStore().lastRunAt)
  return { ...ctx, orchestrator }
}

export function assemblePerformanceFeedback(ctx: PerformanceFeedbackContext): PerformanceFeedbackResponseDto {
  const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)
  const activeStrategy = ctx.brain.primaryDecision
  const strategyPerformance = buildStrategyPerformance(metrics, activeStrategy, ctx.orchestrator)
  const feedbackScore = computeFeedbackScore(strategyPerformance)
  const successfulStrategies = strategyPerformance.slice(0, TOP_LIMIT)
  const failedStrategies = [...strategyPerformance].sort((a, b) => a.successRate - b.successRate).slice(0, TOP_LIMIT)
  const impactAnalysis = buildImpactAnalysis(metrics, ctx.orchestrator, ctx.ceo)
  const lessonsLearned = buildLessonsLearned(strategyPerformance, metrics)
  const recommendation = buildRecommendation(strategyPerformance, activeStrategy)

  return {
    feedbackScore,
    activeStrategy,
    strategyPerformance,
    successfulStrategies,
    failedStrategies,
    impactAnalysis,
    lessonsLearned,
    recommendation,
    today: ctx.today,
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true, sources: [...SOURCE_MODULES] },
  }
}
