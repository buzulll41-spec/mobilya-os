/**
 * Otonom Optimizasyon Motoru — Faz 5A/6/8/10/13/24/25/26/27 sentezi.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import type { AgentCode } from '../contracts/operationsAgentDto.js'
import type { BusinessBrainResponseDto } from '../contracts/businessBrainDto.js'
import type { PerformanceFeedbackResponseDto } from '../contracts/performanceFeedbackDto.js'
import type { LearningEngineResponseDto } from '../contracts/learningEngineDto.js'
import type {
  AgentOptimizationDto,
  OptimizationDecision,
  OptimizationEngineResponseDto,
  OptimizationStrategy,
  RecommendedChangeDto,
  StrategyOptimizationDto,
} from '../contracts/optimizationEngineDto.js'
import type { ActionOrchestratorResponseDto } from '../contracts/actionOrchestratorDto.js'
import {
  assembleLearningEngine,
  gatherLearningEngineContext,
  type LearningEngineContext,
} from './learningEngine.js'
import {
  assemblePerformanceFeedback,
  buildFeedbackMetrics,
} from './performanceFeedbackEngine.js'

const ALL_STRATEGIES: OptimizationStrategy[] = [
  'COLLECTION_FIRST',
  'AGGRESSIVE_GROWTH',
  'CONTROLLED_GROWTH',
  'DEFENSIVE_MODE',
  'COST_REDUCTION',
  'SUPPLIER_RESTRUCTURE',
  'DATA_QUALITY_FIRST',
  'BALANCED_MODE',
]

const ALL_AGENTS: AgentCode[] = [
  'COLLECTION_AGENT',
  'SHIPMENT_AGENT',
  'DATA_QUALITY_AGENT',
  'SALES_AGENT',
  'SUPPLIER_AGENT',
  'EXECUTIVE_AGENT',
]

const CHANGES_LIMIT = 10
const BRIEFING_LIMIT = 5
const BASE_WEIGHT = 100

type OptimizationStore = {
  applyStatus: 'PENDING' | 'APPLIED'
  lastAppliedAt: string | null
  appliedChanges: number
}

const store: OptimizationStore = {
  applyStatus: 'PENDING',
  lastAppliedAt: null,
  appliedChanges: 0,
}

export function getOptimizationStore(): OptimizationStore {
  return { ...store }
}

export function resetOptimizationStore(): void {
  store.applyStatus = 'PENDING'
  store.lastAppliedAt = null
  store.appliedChanges = 0
}

export type OptimizationEngineContext = LearningEngineContext & {
  learning: LearningEngineResponseDto
  feedback: PerformanceFeedbackResponseDto
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n))
}

function isForbidden(text: string): boolean {
  return text.includes('Depo Katı') || text.includes('WAREHOUSE')
}

function strategySeed(strategy: OptimizationStrategy): number {
  return strategy.split('').reduce((s, c) => s + c.charCodeAt(0), 0)
}

function mapLearningSuccess(
  strategy: OptimizationStrategy,
  learning: LearningEngineResponseDto,
  feedback: PerformanceFeedbackResponseDto,
  brain: BusinessBrainResponseDto,
  _orchestrator: ActionOrchestratorResponseDto,
  feedbackMetrics: ReturnType<typeof buildFeedbackMetrics>,
): number {
  const learningMap: Record<string, OptimizationStrategy> = {
    COLLECTION_FIRST: 'COLLECTION_FIRST',
    AGGRESSIVE_GROWTH: 'AGGRESSIVE_GROWTH',
    CONTROLLED_GROWTH: 'CONTROLLED_GROWTH',
    COST_REDUCTION: 'COST_REDUCTION',
    CASH_PROTECTION: 'DEFENSIVE_MODE',
    SUPPLIER_FOCUS: 'SUPPLIER_RESTRUCTURE',
  }

  const fromLearning = learning.strategyTable.find((r) => learningMap[r.strategy] === strategy)
  if (fromLearning) return fromLearning.successRate

  const fromFeedback = feedback.strategyPerformance.find((p) => p.strategy === strategy)
  if (fromFeedback) return fromFeedback.successRate

  switch (strategy) {
    case 'DATA_QUALITY_FIRST':
      return round1(
        clamp(
          45 + (learning.agentLearning.find((a) => a.agent === 'DATA_QUALITY_AGENT')?.successRate ?? 50) * 0.45,
          0,
          100,
        ),
      )
    case 'BALANCED_MODE':
      return round1(
        learning.strategyTable.reduce((s, r) => s + r.successRate, 0) / Math.max(learning.strategyTable.length, 1),
      )
    case 'DEFENSIVE_MODE':
      return round1(
        clamp(50 + feedbackMetrics.openBalancePressure * 0.3 + (100 - feedbackMetrics.riskPressure) * 0.1, 0, 100),
      )
    case 'SUPPLIER_RESTRUCTURE':
      return round1(clamp(40 + (learning.agentLearning.find((a) => a.agent === 'SUPPLIER_AGENT')?.successRate ?? 50) * 0.5, 0, 100))
    default:
      return round1(clamp(45 + (strategySeed(strategy) % 25) + brain.brainScore * 0.15, 0, 100))
  }
}

export function computeRecommendedWeight(successRate: number): number {
  const delta = (successRate - 50) * 0.7
  return round1(clamp(BASE_WEIGHT + delta, 50, 150))
}

function strategyReason(strategy: OptimizationStrategy, successRate: number, recommended: number): string {
  if (recommended > BASE_WEIGHT) {
    return `${strategy} stratejisi yüksek başarı (%${successRate}) üretiyor — ağırlık artırılmalı.`
  }
  if (recommended < BASE_WEIGHT) {
    return `${strategy} stratejisi mevcut risk seviyesinde zayıf (%${successRate}) — ağırlık düşürülmeli.`
  }
  return `${strategy} stratejisi dengeli performans gösteriyor (%${successRate}).`
}

export function buildStrategyOptimizations(
  learning: LearningEngineResponseDto,
  feedback: PerformanceFeedbackResponseDto,
  brain: BusinessBrainResponseDto,
  orchestrator: ActionOrchestratorResponseDto,
  feedbackMetrics: ReturnType<typeof buildFeedbackMetrics>,
): StrategyOptimizationDto[] {
  return ALL_STRATEGIES.map((strategy) => {
    const successRate = mapLearningSuccess(
      strategy,
      learning,
      feedback,
      brain,
      orchestrator,
      feedbackMetrics,
    )
    const recommendedWeight = computeRecommendedWeight(successRate)
    const reason = strategyReason(strategy, successRate, recommendedWeight)
    return {
      strategy,
      currentWeight: BASE_WEIGHT,
      recommendedWeight,
      successRate,
      reason: isForbidden(reason) ? `${strategy} optimizasyonu değerlendirildi.` : reason,
    }
  }).sort((a, b) => b.recommendedWeight - a.recommendedWeight)
}

export function buildAgentOptimizations(learning: LearningEngineResponseDto): AgentOptimizationDto[] {
  return ALL_AGENTS.map((agent) => {
    const row = learning.agentLearning.find((a) => a.agent === agent)
    const successRate = row?.successRate ?? 50
    const impactScore = row?.impactScore ?? 50
    const recommendedWeight = computeRecommendedWeight(successRate)
    const reason =
      recommendedWeight > BASE_WEIGHT
        ? `${agent} yüksek başarı (%${successRate}) — ağırlık artırılmalı.`
        : recommendedWeight < BASE_WEIGHT
          ? `${agent} düşük etki (%${successRate}) — ağırlık azaltılmalı.`
          : `${agent} dengeli performans (%${successRate}).`
    return {
      agent,
      currentWeight: BASE_WEIGHT,
      recommendedWeight,
      successRate,
      impactScore,
      reason: isForbidden(reason) ? `${agent} optimizasyonu değerlendirildi.` : reason,
    }
  }).sort((a, b) => b.recommendedWeight - a.recommendedWeight)
}

export function resolveOptimizationDecision(
  strategies: StrategyOptimizationDto[],
  agents: AgentOptimizationDto[],
): OptimizationDecision {
  const top = strategies.filter((s) => s.strategy !== 'BALANCED_MODE')[0]
  const topAgent = agents[0]

  if (!top || top.recommendedWeight <= BASE_WEIGHT + 2) return 'NO_CHANGE'

  if (top.strategy === 'COLLECTION_FIRST' && top.successRate >= 60) return 'BOOST_COLLECTION_STRATEGY'
  if (top.strategy === 'DATA_QUALITY_FIRST' || topAgent?.agent === 'DATA_QUALITY_AGENT') {
    if ((topAgent?.successRate ?? 0) >= 60) return 'BOOST_DATA_QUALITY'
  }
  if (top.strategy === 'SUPPLIER_RESTRUCTURE') return 'BOOST_SUPPLIER_STRATEGY'
  if (topAgent?.agent === 'SHIPMENT_AGENT' && topAgent.successRate >= 62) return 'BOOST_SHIPMENT_STRATEGY'
  if (topAgent?.agent === 'SALES_AGENT' && topAgent.successRate >= 62) return 'BOOST_SALES_STRATEGY'

  const spread = strategies[0]!.recommendedWeight - strategies[strategies.length - 1]!.recommendedWeight
  if (spread < 15) return 'BALANCED_MODE'

  return 'BOOST_COLLECTION_STRATEGY'
}

export function computeOptimizationScore(
  strategies: StrategyOptimizationDto[],
  agents: AgentOptimizationDto[],
  learningScore: number,
  feedbackScore: number,
): number {
  const stratAvg =
    strategies.length > 0
      ? strategies.reduce((s, r) => s + r.successRate, 0) / strategies.length
      : 50
  const agentAvg = agents.length > 0 ? agents.reduce((s, a) => s + a.successRate, 0) / agents.length : 50
  const weightSpread =
    strategies.length > 0
      ? strategies.reduce((s, r) => s + Math.abs(r.recommendedWeight - r.currentWeight), 0) / strategies.length
      : 0
  const spreadBoost = clamp(weightSpread * 0.4, 0, 20)

  return round1(clamp(stratAvg * 0.3 + agentAvg * 0.25 + learningScore * 0.2 + feedbackScore * 0.15 + spreadBoost, 0, 100))
}

export function buildRecommendedChanges(
  strategies: StrategyOptimizationDto[],
  agents: AgentOptimizationDto[],
): RecommendedChangeDto[] {
  const out: RecommendedChangeDto[] = []
  let idx = 0

  for (const s of strategies) {
    if (s.recommendedWeight === s.currentWeight) continue
    const impact = round1(Math.abs(s.recommendedWeight - s.currentWeight) * 0.5)
    out.push({
      id: `chg-${++idx}`,
      targetType: 'STRATEGY',
      target: s.strategy,
      currentValue: String(s.currentWeight),
      recommendedValue: String(s.recommendedWeight),
      impact,
      reason: s.reason,
      priority: impact >= 20 ? 'P1' : impact >= 10 ? 'P2' : 'P3',
    })
    if (out.length >= CHANGES_LIMIT) return out
  }

  for (const a of agents) {
    if (a.recommendedWeight === a.currentWeight) continue
    const impact = round1(Math.abs(a.recommendedWeight - a.currentWeight) * 0.45)
    out.push({
      id: `chg-${++idx}`,
      targetType: 'AGENT',
      target: a.agent,
      currentValue: String(a.currentWeight),
      recommendedValue: String(a.recommendedWeight),
      impact,
      reason: a.reason,
      priority: impact >= 18 ? 'P1' : impact >= 9 ? 'P2' : 'P3',
    })
    if (out.length >= CHANGES_LIMIT) return out
  }

  const actionCats = [
    { target: 'COLLECTION', boost: strategies.find((s) => s.strategy === 'COLLECTION_FIRST') },
    { target: 'SHIPMENT', boost: agents.find((a) => a.agent === 'SHIPMENT_AGENT') },
    { target: 'AUTOMATION_QUEUE', boost: agents.find((a) => a.agent === 'EXECUTIVE_AGENT') },
  ]

  for (const cat of actionCats) {
    if (!cat.boost || out.length >= CHANGES_LIMIT) break
    const delta = 'recommendedWeight' in cat.boost ? cat.boost.recommendedWeight - BASE_WEIGHT : 0
    if (Math.abs(delta) < 5) continue
    out.push({
      id: `chg-${++idx}`,
      targetType: cat.target === 'AUTOMATION_QUEUE' ? 'AUTOMATION_QUEUE' : 'ACTION_CATEGORY',
      target: cat.target,
      currentValue: String(BASE_WEIGHT),
      recommendedValue: String(BASE_WEIGHT + delta),
      impact: round1(Math.abs(delta) * 0.4),
      reason: `${cat.target} kategorisi öğrenme motoru çıktısına göre ayarlanmalı.`,
      priority: Math.abs(delta) >= 15 ? 'P1' : 'P2',
    })
  }

  return out.slice(0, CHANGES_LIMIT)
}

export function buildManagementBriefing(
  strategies: StrategyOptimizationDto[],
  agents: AgentOptimizationDto[],
  decision: OptimizationDecision,
): string[] {
  const ranked = [...strategies].sort((a, b) => b.successRate - a.successRate)
  const best = ranked[0]!
  const worst = ranked[ranked.length - 1]!
  const topAgent = agents[0]!

  const items = [
    `${best.strategy} mevcut dönemde en başarılı strateji (%${best.successRate}).`,
    worst.successRate < 50
      ? `${worst.strategy} risk nedeniyle geçici olarak düşürülmeli (%${worst.successRate}).`
      : `${worst.strategy} izlenmeli (%${worst.successRate}).`,
    strategies.find((s) => s.strategy === 'DATA_QUALITY_FIRST')!.successRate >= 55
      ? 'Veri kalitesi aksiyonları kârlılık hesaplarını güçlendiriyor.'
      : 'Veri kalitesi aksiyonları iyileştirme gerektiriyor.',
    `${topAgent.agent} ağırlığı ${topAgent.recommendedWeight > BASE_WEIGHT ? 'artırılmalı' : 'korunmalı'} (%${topAgent.successRate}).`,
    decision === 'BOOST_COLLECTION_STRATEGY'
      ? 'Sistem dengeli ama tahsilat öncelikli modda çalışmalı.'
      : decision === 'BALANCED_MODE'
        ? 'Sistem dengeli modda çalışmalı — aşırı sapma yok.'
        : `Optimizasyon kararı: ${decision.replace(/_/g, ' ')}.`,
  ]

  return items
    .filter((t) => !isForbidden(t))
    .slice(0, BRIEFING_LIMIT)
}

export async function gatherOptimizationEngineContext(prisma: PrismaClient): Promise<OptimizationEngineContext> {
  const baseCtx = await gatherLearningEngineContext(prisma)
  const learning = assembleLearningEngine(baseCtx)
  const feedback = assemblePerformanceFeedback(baseCtx)
  return { ...baseCtx, learning, feedback }
}

export function assembleOptimizationEngine(ctx: OptimizationEngineContext): OptimizationEngineResponseDto {
  const feedbackMetrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)
  const strategyOptimizations = buildStrategyOptimizations(
    ctx.learning,
    ctx.feedback,
    ctx.brain,
    ctx.orchestrator,
    feedbackMetrics,
  )
  const agentOptimizations = buildAgentOptimizations(ctx.learning)
  const optimizationDecision = resolveOptimizationDecision(strategyOptimizations, agentOptimizations)
  const optimizationScore = computeOptimizationScore(
    strategyOptimizations,
    agentOptimizations,
    ctx.learning.learningScore,
    ctx.feedback.feedbackScore,
  )
  const recommendedChanges = buildRecommendedChanges(strategyOptimizations, agentOptimizations)
  const managementBriefing = buildManagementBriefing(strategyOptimizations, agentOptimizations, optimizationDecision)

  return {
    optimizationScore,
    optimizationDecision,
    strategyOptimizations,
    agentOptimizations,
    recommendedChanges,
    managementBriefing,
    today: ctx.today,
    generatedAt: new Date().toISOString(),
    applyStatus: store.applyStatus,
    lastAppliedAt: store.lastAppliedAt,
    meta: { depoKatiExcluded: true, virtualOnly: true },
  }
}

export async function applyOptimizationRun(prisma: PrismaClient): Promise<{
  status: 'APPLIED'
  appliedChanges: number
  runAt: string
}> {
  const ctx = await gatherOptimizationEngineContext(prisma)
  const report = assembleOptimizationEngine(ctx)
  const appliedChanges = report.recommendedChanges.length

  store.applyStatus = 'APPLIED'
  store.lastAppliedAt = new Date().toISOString()
  store.appliedChanges = appliedChanges

  return {
    status: 'APPLIED',
    appliedChanges,
    runAt: store.lastAppliedAt,
  }
}
