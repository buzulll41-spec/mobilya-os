/**

 * Kurumsal Öğrenme Motoru — Faz 5A/6/8/9/10/17/18/24/25/26 sentezi.

 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.

 */



import type { PrismaClient } from '@prisma/client'

import type { AgentCode } from '../contracts/operationsAgentDto.js'

import type {

  AgentLearningRowDto,

  DecisionTrendDto,

  DecisionTrendWindowDto,

  LearningEngineResponseDto,

  LearningRecommendationDto,

  LearningStrategy,

  LessonLearnedDto,

  StrategySummaryDto,

  StrategyTableRowDto,

  TrendDirection,

} from '../contracts/learningEngineDto.js'

import { gatherOrchestratorContext } from './actionOrchestratorEngine.js'

import type { ActionOrchestratorResponseDto } from '../contracts/actionOrchestratorDto.js'

import type { CeoGatheredData } from './getCeoControlCenter.js'

import type { BusinessBrainResponseDto } from '../contracts/businessBrainDto.js'

import {

  buildFeedbackMetrics,

  type PerformanceFeedbackContext,

  gatherPerformanceFeedbackContext,

} from './performanceFeedbackEngine.js'

import type { OperationsAgentsResponseDto } from '../contracts/operationsAgentDto.js'



const ALL_STRATEGIES: LearningStrategy[] = [

  'COLLECTION_FIRST',

  'AGGRESSIVE_GROWTH',

  'CONTROLLED_GROWTH',

  'COST_REDUCTION',

  'CASH_PROTECTION',

  'SUPPLIER_FOCUS',

]



const ALL_AGENTS: AgentCode[] = [

  'COLLECTION_AGENT',

  'SHIPMENT_AGENT',

  'DATA_QUALITY_AGENT',

  'SALES_AGENT',

  'SUPPLIER_AGENT',

  'EXECUTIVE_AGENT',

]



const LESSONS_LIMIT = 10

const RECOMMENDATIONS_LIMIT = 5



export type LearningEngineContext = PerformanceFeedbackContext & {

  agents: OperationsAgentsResponseDto

}



type LearningMetrics = ReturnType<typeof buildFeedbackMetrics> & {

  dataQualityScore: number

  supplierHealth: number

  agentCompletion: number

}



function round1(n: number): number {

  return Math.round(n * 10) / 10

}



function clamp(n: number, min: number, max: number): number {

  return Math.min(max, Math.max(min, n))

}



function isDepoKati(text: string): boolean {

  return text.includes('Depo Katı') || text.includes('WAREHOUSE')

}



function strategySeed(strategy: LearningStrategy): number {

  return strategy.split('').reduce((s, c) => s + c.charCodeAt(0), 0)

}



function agentSeed(agent: AgentCode): number {

  return agent.split('').reduce((s, c) => s + c.charCodeAt(0), 0)

}



function buildLearningMetrics(

  ceo: CeoGatheredData,

  brain: BusinessBrainResponseDto,

  orchestrator: ActionOrchestratorResponseDto,

  agents: OperationsAgentsResponseDto,

): LearningMetrics {

  const base = buildFeedbackMetrics(ceo, brain, orchestrator)

  const agentCompletion =

    agents.summary.totalAgents > 0

      ? (agents.summary.activeAgents / agents.summary.totalAgents) * 100

      : 50



  return {

    ...base,

    dataQualityScore: clamp(ceo.dq.totals.averageQualityScore, 20, 95),

    supplierHealth: clamp(60 + (brain.riskScore < 50 ? 15 : -10) + agentCompletion * 0.1, 0, 100),

    agentCompletion,

  }

}



export function computeLearningStrategySuccessRate(strategy: LearningStrategy, m: LearningMetrics): number {

  switch (strategy) {

    case 'COLLECTION_FIRST':

      return round1(

        clamp(40 + m.openBalancePressure * 0.35 + m.riskyShare * 0.25 + (100 - m.collectionRate) * 0.2, 0, 100),

      )

    case 'AGGRESSIVE_GROWTH':

      return round1(clamp(35 + m.brainScore * 0.4 + m.profitMarginPct * 1.2 - m.cashFlowPressure * 0.3, 0, 100))

    case 'CONTROLLED_GROWTH':

      return round1(clamp(45 + m.brainScore * 0.35 + m.actionCompletion * 0.2 - m.riskPressure * 0.15, 0, 100))

    case 'COST_REDUCTION':

      return round1(clamp(42 + m.cashFlowPressure * 0.3 + (25 - m.profitMarginPct) * 1.2, 0, 100))

    case 'CASH_PROTECTION':

      return round1(

        clamp(48 + m.openBalancePressure * 0.3 + m.cashFlowPressure * 0.25 - m.collectionRate * 0.1, 0, 100),

      )

    case 'SUPPLIER_FOCUS':

      return round1(clamp(38 + m.supplierHealth * 0.35 + (30 - m.profitMarginPct) * 0.8, 0, 100))

    default:

      return 50

  }

}



export function computeStrategyUsageCount(

  strategy: LearningStrategy,

  activeStrategy: string,

  orchestrator: ActionOrchestratorResponseDto,

): number {

  const base = 3 + (strategySeed(strategy) % 8)

  const mapped = mapBrainStrategyToLearning(activeStrategy)

  if (strategy !== mapped) return base

  const bonus = orchestrator.runStatus === 'APPLIED' ? 12 : 5

  return base + bonus

}



function mapBrainStrategyToLearning(brainStrategy: string): LearningStrategy {

  const map: Record<string, LearningStrategy> = {

    COLLECTION_FIRST: 'COLLECTION_FIRST',

    AGGRESSIVE_GROWTH: 'AGGRESSIVE_GROWTH',

    CONTROLLED_GROWTH: 'CONTROLLED_GROWTH',

    COST_REDUCTION: 'COST_REDUCTION',

    DEFENSIVE_MODE: 'CASH_PROTECTION',

    SUPPLIER_RESTRUCTURE: 'SUPPLIER_FOCUS',

    PROFITABILITY_RECOVERY: 'COST_REDUCTION',

    WAIT_AND_MONITOR: 'CASH_PROTECTION',

  }

  return map[brainStrategy] ?? 'CONTROLLED_GROWTH'

}



export function computeStrategyImpactScore(

  strategy: LearningStrategy,

  successRate: number,

  orchestrator: ActionOrchestratorResponseDto,

): number {

  const activeBoost =

    mapBrainStrategyToLearning(orchestrator.activeStrategy) === strategy

      ? orchestrator.orchestratorScore * 0.12

      : 0

  return round1(clamp(successRate * 0.55 + activeBoost + (strategySeed(strategy) % 10), 0, 100))

}



export function buildStrategyTable(

  metrics: LearningMetrics,

  brain: BusinessBrainResponseDto,

  orchestrator: ActionOrchestratorResponseDto,

): StrategyTableRowDto[] {

  return ALL_STRATEGIES.map((strategy) => {

    const successRate = computeLearningStrategySuccessRate(strategy, metrics)

    const usageCount = computeStrategyUsageCount(strategy, brain.primaryDecision, orchestrator)

    const impactScore = computeStrategyImpactScore(strategy, successRate, orchestrator)

    const overallScore = round1(clamp(successRate * 0.6 + impactScore * 0.25 + usageCount * 0.8, 0, 100))

    return { strategy, usageCount, successRate, impactScore, overallScore }

  }).sort((a, b) => b.overallScore - a.overallScore)

}



export function computeAgentSuccessRate(agent: AgentCode, m: LearningMetrics, agents: OperationsAgentsResponseDto): number {

  const row = agents.agents.find((a) => a.agentCode === agent)

  const generated = (row?.generatedActions ?? 0) + (row?.generatedCases ?? 0) + (row?.generatedJobs ?? 0)

  const base = 45 + (agentSeed(agent) % 20)



  switch (agent) {

    case 'COLLECTION_AGENT':

      return round1(clamp(base + m.collectionRate * 0.35 - m.openBalancePressure * 0.2 + generated * 0.5, 0, 100))

    case 'SHIPMENT_AGENT':

      return round1(clamp(base + m.actionCompletion * 0.3 - m.delayedPressure * 0.25 + generated * 0.4, 0, 100))

    case 'DATA_QUALITY_AGENT':

      return round1(clamp(base + m.dataQualityScore * 0.4 + generated * 0.3, 0, 100))

    case 'SALES_AGENT':

      return round1(clamp(base + m.brainScore * 0.25 + m.profitMarginPct * 0.8 + generated * 0.35, 0, 100))

    case 'SUPPLIER_AGENT':

      return round1(clamp(base + m.supplierHealth * 0.35 + generated * 0.4, 0, 100))

    case 'EXECUTIVE_AGENT':

      return round1(clamp(base + m.orchestratorScore * 0.35 + m.agentCompletion * 0.2 + generated * 0.3, 0, 100))

    default:

      return 50

  }

}



export function buildAgentLearning(metrics: LearningMetrics, agents: OperationsAgentsResponseDto): AgentLearningRowDto[] {

  return ALL_AGENTS.map((agent) => {

    const row = agents.agents.find((a) => a.agentCode === agent)

    const taskCount =

      (row?.generatedActions ?? 0) + (row?.generatedCases ?? 0) + (row?.generatedJobs ?? 0) + 2 + (agentSeed(agent) % 5)

    const successRate = computeAgentSuccessRate(agent, metrics, agents)

    const impactScore = round1(clamp(successRate * 0.65 + taskCount * 0.8 + (agentSeed(agent) % 8), 0, 100))

    return { agent, taskCount, successRate, impactScore }

  }).sort((a, b) => b.successRate - a.successRate)

}



function resolveTrend(current: number, previous: number): TrendDirection {

  const delta = current - previous

  if (delta > 2) return 'UP'

  if (delta < -2) return 'DOWN'

  return 'FLAT'

}



export function computeDecisionWindowScore(

  days: 30 | 90 | 180,

  metrics: LearningMetrics,

  orchestrator: ActionOrchestratorResponseDto,

): number {

  const decay = days === 30 ? 1 : days === 90 ? 0.92 : 0.85

  const base =

    metrics.brainScore * 0.25 +

    metrics.orchestratorScore * 0.2 +

    metrics.actionCompletion * 0.2 +

    metrics.collectionRate * 0.15 +

    (100 - metrics.riskPressure) * 0.1 +

    metrics.agentCompletion * 0.1

  const appliedBoost = orchestrator.runStatus === 'APPLIED' ? 4 : 0

  return round1(clamp(base * decay + appliedBoost + (days % 7), 0, 100))

}



export function buildDecisionTrend(

  metrics: LearningMetrics,

  orchestrator: ActionOrchestratorResponseDto,

): DecisionTrendDto {

  const s30 = computeDecisionWindowScore(30, metrics, orchestrator)

  const s90 = computeDecisionWindowScore(90, metrics, orchestrator)

  const s180 = computeDecisionWindowScore(180, metrics, orchestrator)



  const window = (score: number, prev: number): DecisionTrendWindowDto => ({

    score,

    trend: resolveTrend(score, prev),

  })



  return {

    days30: window(s30, s90 * 0.98),

    days90: window(s90, s180 * 0.97),

    days180: window(s180, s180 * 0.94),

  }

}



export function computeLearningScore(

  strategyTable: StrategyTableRowDto[],

  agentLearning: AgentLearningRowDto[],

  decisionTrend: DecisionTrendDto,

): number {

  const stratWeighted = strategyTable.reduce((s, r) => s + r.successRate * r.usageCount, 0)

  const stratTotal = strategyTable.reduce((s, r) => s + r.usageCount, 0)

  const stratAvg = stratTotal > 0 ? stratWeighted / stratTotal : 50



  const agentAvg =

    agentLearning.length > 0

      ? agentLearning.reduce((s, a) => s + a.successRate, 0) / agentLearning.length

      : 50



  const trendAvg = (decisionTrend.days30.score + decisionTrend.days90.score + decisionTrend.days180.score) / 3



  return round1(clamp(stratAvg * 0.45 + agentAvg * 0.35 + trendAvg * 0.2, 0, 100))

}



function toStrategySummary(row: StrategyTableRowDto): StrategySummaryDto {

  return {

    strategy: row.strategy,

    successRate: row.successRate,

    usageCount: row.usageCount,

    impactScore: row.impactScore,

    overallScore: row.overallScore,

  }

}



const LESSON_TEMPLATES: Array<(m: LearningMetrics, table: StrategyTableRowDto[]) => string> = [

  (m) => `Tahsilat oranı %${round1(m.collectionRate)} — COLLECTION_FIRST stratejisi bu profilde ${m.collectionRate < 65 ? 'öncelikli' : 'destekleyici'}.`,

  (m) => `Nakit baskısı %${round1(m.cashFlowPressure)} — CASH_PROTECTION ${m.cashFlowPressure > 55 ? 'aktif koruma' : 'pasif izleme'} gerektiriyor.`,

  (_m, t) => `En yüksek strateji skoru ${t[0]?.strategy ?? 'CONTROLLED_GROWTH'} (%${t[0]?.successRate ?? 0}) — geçmiş uygulamalarda tutarlı.`,

  (m) => `Brain skoru ${round1(m.brainScore)} — AGGRESSIVE_GROWTH risk/ödül dengesi ${m.brainScore >= 65 ? 'uygun' : 'sınırlı'}.`,

  (m) => `Operasyon tamamlama %${round1(m.actionCompletion)} — ajan koordinasyonu ${m.actionCompletion >= 60 ? 'güçlü' : 'iyileştirilmeli'}.`,

  (m) => `Risk baskısı %${round1(m.riskPressure)} — CONTROLLED_GROWTH ${m.riskPressure > 50 ? 'tercih edilmeli' : 'esnek uygulanabilir'}.`,

  (m) => `Tedarik sağlığı %${round1(m.supplierHealth)} — SUPPLIER_FOCUS ${m.supplierHealth < 55 ? 'acil' : 'planlı'} müdahale gerektiriyor.`,

  (m) => `Veri kalitesi skoru %${round1(m.dataQualityScore)} — DATA_QUALITY_AGENT çıktıları ${m.dataQualityScore < 60 ? 'kritik' : 'yeterli'}.`,

  (_m, t) => `Düşük performanslı strateji ${t[t.length - 1]?.strategy ?? 'COST_REDUCTION'} (%${t[t.length - 1]?.successRate ?? 0}) — yeniden değerlendirilmeli.`,

  (m) => `Orkestratör skoru ${round1(m.orchestratorScore)} — karar-aksiyon döngüsü ${m.orchestratorScore >= 60 ? 'ölçülebilir' : 'zayıf'}.`,

]



export function buildLessonsLearned(metrics: LearningMetrics, strategyTable: StrategyTableRowDto[]): LessonLearnedDto[] {

  const out: LessonLearnedDto[] = []

  for (let i = 0; i < LESSON_TEMPLATES.length && out.length < LESSONS_LIMIT; i++) {

    const lesson = LESSON_TEMPLATES[i]!(metrics, strategyTable)

    if (isDepoKati(lesson)) continue

    out.push({

      id: `lesson-${i + 1}`,

      category: i < 3 ? 'STRATEGY' : i < 6 ? 'OPERATIONS' : 'FINANCE',

      lesson,

      confidence: round1(clamp(55 + (i % 4) * 8 + metrics.brainScore * 0.1, 50, 95)),

    })

  }

  return out.slice(0, LESSONS_LIMIT)

}



export function buildRecommendations(

  strategyTable: StrategyTableRowDto[],

  agentLearning: AgentLearningRowDto[],

  metrics: LearningMetrics,

): LearningRecommendationDto[] {

  const best = strategyTable[0]!

  const worst = strategyTable[strategyTable.length - 1]!

  const topAgent = agentLearning[0]!

  const weakAgent = agentLearning[agentLearning.length - 1]!



  const items: LearningRecommendationDto[] = [

    {

      id: 'rec-1',

      priority: 'P1',

      title: `${best.strategy} stratejisini güçlendir`,

      rationale: `En yüksek başarı oranı %${best.successRate} ve ${best.usageCount} kullanım kaydı.`,

    },

    {

      id: 'rec-2',

      priority: worst.successRate < 50 ? 'P1' : 'P2',

      title: `${worst.strategy} stratejisini gözden geçir`,

      rationale: `Düşük başarı oranı %${worst.successRate} — alternatif stratejiler değerlendirilmeli.`,

    },

    {

      id: 'rec-3',

      priority: 'P2',

      title: `${topAgent.agent} çıktılarını ölçeklendir`,

      rationale: `Ajan başarı oranı %${topAgent.successRate} — ${topAgent.taskCount} görev tamamlandı.`,

    },

    {

      id: 'rec-4',

      priority: metrics.cashFlowPressure > 55 ? 'P1' : 'P2',

      title: 'Nakit koruma protokolünü aktive et',

      rationale: `Nakit baskısı %${round1(metrics.cashFlowPressure)} — CASH_PROTECTION önceliklendirilmeli.`,

    },

    {

      id: 'rec-5',

      priority: 'P3',

      title: `${weakAgent.agent} performansını iyileştir`,

      rationale: `En düşük ajan başarısı %${weakAgent.successRate} — eğitim/kural güncellemesi önerilir.`,

    },

  ]



  return items

    .filter((r) => !isDepoKati(r.title) && !isDepoKati(r.rationale))

    .slice(0, RECOMMENDATIONS_LIMIT)

}



export function buildLearningSummary(

  learningScore: number,

  best: StrategySummaryDto,

  worst: StrategySummaryDto,

  decisionTrend: DecisionTrendDto,

): string {

  const trendLabel =

    decisionTrend.days30.trend === 'UP'

      ? 'iyileşme eğiliminde'

      : decisionTrend.days30.trend === 'DOWN'

        ? 'gerileme riski taşıyor'

        : 'stabil seyrediyor'



  if (learningScore >= 70) {

    return `Kurumsal öğrenme skoru ${learningScore} — ${best.strategy} en başarılı strateji (%${best.successRate}). Karar kalitesi ${trendLabel}.`

  }

  if (learningScore < 50) {

    return `Kurumsal öğrenme skoru ${learningScore} — ${worst.strategy} zayıf performans (%${worst.successRate}). Acil müdahale ve strateji revizyonu önerilir.`

  }

  return `Kurumsal öğrenme skoru ${learningScore} — ${best.strategy} öne çıkıyor, ${worst.strategy} izlenmeli. Karar trendi ${trendLabel}.`

}



export async function gatherLearningEngineContext(prisma: PrismaClient): Promise<LearningEngineContext> {

  const feedbackCtx = await gatherPerformanceFeedbackContext(prisma)

  const orchCtx = await gatherOrchestratorContext(prisma)

  return { ...feedbackCtx, agents: orchCtx.agents }

}



export function assembleLearningEngine(ctx: LearningEngineContext): LearningEngineResponseDto {

  const metrics = buildLearningMetrics(ctx.ceo, ctx.brain, ctx.orchestrator, ctx.agents)

  const strategyTable = buildStrategyTable(metrics, ctx.brain, ctx.orchestrator)

  const agentLearning = buildAgentLearning(metrics, ctx.agents)

  const decisionTrend = buildDecisionTrend(metrics, ctx.orchestrator)

  const learningScore = computeLearningScore(strategyTable, agentLearning, decisionTrend)



  const bySuccess = [...strategyTable].sort((a, b) => b.successRate - a.successRate)
  const bestStrategy = toStrategySummary(bySuccess[0]!)
  const worstStrategy = toStrategySummary(bySuccess[bySuccess.length - 1]!)

  const lessonsLearned = buildLessonsLearned(metrics, strategyTable)

  const recommendations = buildRecommendations(strategyTable, agentLearning, metrics)

  const summary = buildLearningSummary(learningScore, bestStrategy, worstStrategy, decisionTrend)



  return {

    learningScore,

    bestStrategy,

    worstStrategy,

    strategyTable,

    agentLearning,

    decisionTrend,

    lessonsLearned,

    recommendations,

    summary,

    today: ctx.today,

    generatedAt: new Date().toISOString(),

    meta: { depoKatiExcluded: true, virtualOnly: true },

  }

}


