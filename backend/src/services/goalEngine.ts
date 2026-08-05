/**
 * Otonom Hedef Motoru — Faz 5A/6/15/18/24/25/26/27/28 sentezi.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import type {
  ActiveGoalDto,
  GoalCategory,
  GoalDecision,
  GoalEngineResponseDto,
  GoalOpportunityDto,
  GoalPriority,
  GoalProgressDto,
  GoalRiskDto,
  GoalStatus,
  GoalTrend,
} from '../contracts/goalEngineDto.js'
import type { OptimizationEngineResponseDto } from '../contracts/optimizationEngineDto.js'
import type { LearningEngineResponseDto } from '../contracts/learningEngineDto.js'
import {
  assembleOptimizationEngine,
  gatherOptimizationEngineContext,
  type OptimizationEngineContext,
} from './optimizationEngine.js'
import { buildFeedbackMetrics } from './performanceFeedbackEngine.js'

const RISKS_LIMIT = 10
const OPPORTUNITIES_LIMIT = 10
const BRIEFING_LIMIT = 5

type GoalStoreEntry = {
  progressBump: number
  lastUpdatedAt: string | null
}

const progressStore = new Map<string, GoalStoreEntry>()

export function getGoalProgressStore(): Map<string, GoalStoreEntry> {
  return progressStore
}

export function resetGoalProgressStore(): void {
  progressStore.clear()
}

export type GoalEngineContext = OptimizationEngineContext & {
  optimization: OptimizationEngineResponseDto
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

function resolveTrend(progress: number, bump: number): GoalTrend {
  if (bump > 2 || progress >= 75) return 'UP'
  if (bump < -2 || progress < 35) return 'DOWN'
  return 'FLAT'
}

function resolveStatus(progress: number): GoalStatus {
  if (progress >= 100) return 'ACHIEVED'
  if (progress < 25) return 'FAILED'
  if (progress < 50) return 'AT_RISK'
  return 'ON_TRACK'
}

function priorityWeight(p: GoalPriority): number {
  return p === 'P1' ? 3 : p === 'P2' ? 2 : 1
}

export type GoalTemplate = {
  id: string
  title: string
  category: GoalCategory
  priority: GoalPriority
  startNum: number
  currentNum: number
  targetNum: number
  unit: string
  reason: string
}

export function buildGoalTemplates(
  ctx: GoalEngineContext,
  metrics: ReturnType<typeof buildFeedbackMetrics>,
): GoalTemplate[] {
  const dq = ctx.ceo.dq.totals.averageQualityScore
  const margin = metrics.profitMarginPct
  const collection = metrics.collectionRate
  const openBalPct = metrics.openBalancePressure
  const riskyPct = metrics.riskyShare
  const delayed = metrics.delayedPressure

  return [
    {
      id: 'goal-collection-rate',
      title: 'Tahsilat oranını +%12 artır',
      category: 'COLLECTION',
      priority: 'P1',
      startNum: round1(collection - 8),
      currentNum: round1(collection),
      targetNum: round1(clamp(collection + 12, 0, 100)),
      unit: '%',
      reason: 'Optimization Engine tahsilat stratejisini önceliklendiriyor.',
    },
    {
      id: 'goal-open-balance',
      title: 'Açık bakiyeyi -%15 azalt',
      category: 'COLLECTION',
      priority: 'P1',
      startNum: round1(openBalPct + 10),
      currentNum: round1(openBalPct),
      targetNum: round1(clamp(openBalPct - 15, 0, 100)),
      unit: '%',
      reason: 'Performance Feedback açık bakiye baskısını izliyor.',
    },
    {
      id: 'goal-risky-receivable',
      title: 'Riskli alacağı -%10 azalt',
      category: 'RISK',
      priority: 'P1',
      startNum: round1(riskyPct + 8),
      currentNum: round1(riskyPct),
      targetNum: round1(clamp(riskyPct - 10, 0, 100)),
      unit: '%',
      reason: 'Business Brain risk skoru yüksek risk dönemini işaret ediyor.',
    },
    {
      id: 'goal-data-quality',
      title: 'Veri kalitesini +8 puan artır',
      category: 'DATA_QUALITY',
      priority: 'P2',
      startNum: round1(dq - 5),
      currentNum: round1(dq),
      targetNum: round1(clamp(dq + 8, 0, 100)),
      unit: 'puan',
      reason: 'Learning Engine veri kalitesi ajanını güçlendirmeyi öneriyor.',
    },
    {
      id: 'goal-profit-margin',
      title: 'Kârlılığı +%6 artır',
      category: 'PROFITABILITY',
      priority: 'P1',
      startNum: round1(margin - 4),
      currentNum: round1(margin),
      targetNum: round1(margin + 6),
      unit: '%',
      reason: 'Profitability Analytics marj iyileştirme hedefi.',
    },
    {
      id: 'goal-shipment-delay',
      title: 'Sevk gecikmesini -%20 azalt',
      category: 'SHIPMENT',
      priority: 'P2',
      startNum: round1(delayed + 12),
      currentNum: round1(delayed),
      targetNum: round1(clamp(delayed - 20, 0, 100)),
      unit: '%',
      reason: 'Action Orchestrator sevk operasyonlarını etkiliyor.',
    },
    {
      id: 'goal-sales-growth',
      title: 'Satış hacmini +%8 artır',
      category: 'SALES',
      priority: 'P2',
      startNum: 92,
      currentNum: round1(95 + ctx.brain.brainScore * 0.05),
      targetNum: 103,
      unit: '%',
      reason: 'Forecast Engine kontrollü büyüme senaryosu.',
    },
    {
      id: 'goal-supplier-health',
      title: 'Tedarik sağlığını +%10 artır',
      category: 'SUPPLIER',
      priority: 'P3',
      startNum: 55,
      currentNum: round1(
        60 +
          (ctx.optimization.agentOptimizations.find((a) => a.agent === 'SUPPLIER_AGENT')?.successRate ?? 50) * 0.2,
      ),
      targetNum: 70,
      unit: '%',
      reason: 'Optimization Engine tedarik ajanı ağırlığını ayarlıyor.',
    },
    {
      id: 'goal-operations-completion',
      title: 'Operasyon tamamlamayı +%15 artır',
      category: 'OPERATIONS',
      priority: 'P2',
      startNum: round1(metrics.actionCompletion - 10),
      currentNum: round1(metrics.actionCompletion),
      targetNum: round1(clamp(metrics.actionCompletion + 15, 0, 100)),
      unit: '%',
      reason: 'Automation Jobs tamamlama oranı hedefleniyor.',
    },
  ]
}

function computeProgressPercent(start: number, current: number, target: number, bump: number): number {
  const range = target - start
  if (Math.abs(range) < 0.01) return clamp(50 + bump, 0, 100)
  const raw = ((current - start) / range) * 100 + bump
  return round1(clamp(raw, 0, 100))
}

function formatValue(n: number, unit: string): string {
  return unit === '%' || unit === 'puan' ? `${n}${unit === 'puan' ? '' : '%'}` : String(n)
}

export function buildActiveGoals(templates: GoalTemplate[]): ActiveGoalDto[] {
  return templates.map((t) => {
    const bump = progressStore.get(t.id)?.progressBump ?? 0
    const progressPercent = computeProgressPercent(t.startNum, t.currentNum, t.targetNum, bump)
    const reason = isForbidden(t.reason) ? `${t.category} hedefi aktif.` : t.reason
    return {
      id: t.id,
      title: t.title,
      category: t.category,
      priority: t.priority,
      currentValue: formatValue(t.currentNum, t.unit),
      targetValue: formatValue(t.targetNum, t.unit),
      progressPercent,
      status: resolveStatus(progressPercent),
      reason,
    }
  })
}

export function buildGoalProgress(templates: GoalTemplate[]): GoalProgressDto[] {
  return templates.map((t) => {
    const bump = progressStore.get(t.id)?.progressBump ?? 0
    const progressPercent = computeProgressPercent(t.startNum, t.currentNum, t.targetNum, bump)
    const daysLeft = progressPercent >= 100 ? 0 : Math.max(7, Math.round((100 - progressPercent) * 0.9))
    const est = new Date()
    est.setDate(est.getDate() + daysLeft)
    return {
      goalId: t.id,
      startValue: formatValue(t.startNum, t.unit),
      currentValue: formatValue(t.currentNum, t.unit),
      targetValue: formatValue(t.targetNum, t.unit),
      progressPercent,
      estimatedCompletion: est.toISOString().slice(0, 10),
      trend: resolveTrend(progressPercent, bump),
    }
  })
}

export function computeGoalScore(goals: ActiveGoalDto[]): number {
  let weighted = 0
  let total = 0
  for (const g of goals) {
    const w = priorityWeight(g.priority)
    weighted += g.progressPercent * w
    total += w
  }
  return round1(total > 0 ? weighted / total : 50)
}

export function resolveGoalDecision(
  goals: ActiveGoalDto[],
  optimization: OptimizationEngineResponseDto,
): GoalDecision {
  const byCategory = (cat: GoalCategory) => goals.filter((g) => g.category === cat)
  const avg = (list: ActiveGoalDto[]) =>
    list.length > 0 ? list.reduce((s, g) => s + g.progressPercent, 0) / list.length : 50

  const collectionAvg = avg(byCategory('COLLECTION'))
  const profitAvg = avg(byCategory('PROFITABILITY'))
  const riskGoals = byCategory('RISK')
  const riskAvg = avg(riskGoals)

  if (optimization.optimizationDecision === 'BOOST_COLLECTION_STRATEGY' || collectionAvg < 55) {
    return 'FOCUS_COLLECTION'
  }
  if (profitAvg < 50) return 'FOCUS_PROFIT'
  if (riskAvg < 45 || riskGoals.some((g) => g.status === 'AT_RISK')) return 'FOCUS_RISK_REDUCTION'
  if (avg(byCategory('DATA_QUALITY')) >= 65) return 'FOCUS_DATA_QUALITY'
  if (avg(byCategory('SHIPMENT')) < 50) return 'FOCUS_SHIPMENT'
  if (optimization.optimizationDecision === 'BOOST_SALES_STRATEGY') return 'FOCUS_GROWTH'

  const spread =
    Math.max(...goals.map((g) => g.progressPercent)) - Math.min(...goals.map((g) => g.progressPercent))
  if (spread < 20) return 'BALANCED_GOALS'

  return collectionAvg >= profitAvg ? 'FOCUS_COLLECTION' : 'FOCUS_PROFIT'
}

export function buildGoalRisks(goals: ActiveGoalDto[]): GoalRiskDto[] {
  const out: GoalRiskDto[] = []
  for (const g of goals) {
    if (g.status !== 'AT_RISK' && g.status !== 'FAILED') continue
    const severity = g.status === 'FAILED' ? 'HIGH' : g.progressPercent < 40 ? 'HIGH' : 'MEDIUM'
    const item: GoalRiskDto = {
      id: `risk-${g.id}`,
      severity,
      goal: g.title,
      reason: `${g.title} hedefi %${g.progressPercent} ilerlemede — planın gerisinde.`,
      impact: round1(clamp(100 - g.progressPercent, 10, 90)),
      recommendation:
        g.category === 'COLLECTION'
          ? 'COLLECTION_FIRST stratejisini güçlendir.'
          : g.category === 'PROFITABILITY'
            ? 'Maliyet ve marj hedeflerini gözden geçir.'
            : `${g.category} kategorisinde ek aksiyon planla.`,
    }
    if (!isForbidden(item.reason) && !isForbidden(item.recommendation)) out.push(item)
    if (out.length >= RISKS_LIMIT) break
  }

  if (out.length < 3) {
    out.push({
      id: 'risk-general-1',
      severity: 'LOW',
      goal: 'Genel hedef sapması',
      reason: 'Bazı hedefler izleme eşiğine yaklaşıyor.',
      impact: 25,
      recommendation: 'Haftalık hedef gözden geçirme toplantısı planla.',
    })
  }

  return out.slice(0, RISKS_LIMIT)
}

export function buildGoalOpportunities(
  goals: ActiveGoalDto[],
  learning: LearningEngineResponseDto,
): GoalOpportunityDto[] {
  const out: GoalOpportunityDto[] = []
  const onTrack = goals.filter((g) => g.status === 'ON_TRACK' || g.status === 'ACHIEVED')

  for (const g of onTrack.sort((a, b) => b.progressPercent - a.progressPercent)) {
    out.push({
      id: `opp-${g.id}`,
      goal: g.title,
      opportunity: `${g.category} hedefi %${g.progressPercent} — momentum yakalanabilir.`,
      expectedImpact: round1(g.progressPercent * 0.4),
      recommendation: learning.bestStrategy.strategy
        ? `${learning.bestStrategy.strategy} ile sinerji değerlendir.`
        : 'Başarılı hedefi ölçeklendir.',
    })
    if (out.length >= OPPORTUNITIES_LIMIT) break
  }

  if (out.length < 3) {
    out.push({
      id: 'opp-general-1',
      goal: 'Dengeli hedef portföyü',
      opportunity: 'Çoklu kategori hedefleri paralel ilerliyor.',
      expectedImpact: 30,
      recommendation: 'BALANCED_GOALS modunda kaynak dağılımını koru.',
    })
  }

  return out.slice(0, OPPORTUNITIES_LIMIT)
}

export function buildGoalManagementBriefing(goals: ActiveGoalDto[], decision: GoalDecision): string[] {
  const collection = goals.filter((g) => g.category === 'COLLECTION')
  const profit = goals.filter((g) => g.category === 'PROFITABILITY')
  const dq = goals.filter((g) => g.category === 'DATA_QUALITY')
  const ship = goals.filter((g) => g.category === 'SHIPMENT')

  const line = (list: ActiveGoalDto[], ok: string, bad: string) => {
    const avg = list.reduce((s, g) => s + g.progressPercent, 0) / Math.max(list.length, 1)
    return avg >= 55 ? ok : bad
  }

  const items = [
    line(collection, 'Tahsilat hedefleri plana göre ilerliyor.', 'Tahsilat hedefleri geride kalıyor.'),
    line(profit, 'Kârlılık hedefi plana uygun.', 'Kârlılık hedefi geride kalıyor.'),
    line(dq, 'Veri kalitesi hedefleri beklenenden hızlı ilerliyor.', 'Veri kalitesi hedefleri yavaş ilerliyor.'),
    line(ship, 'Sevk hedefleri kontrol altında.', 'Sevk gecikmeleri hedef risk oluşturuyor.'),
    decision === 'FOCUS_COLLECTION'
      ? 'Öncelik tahsilat ve kârlılık olmalı.'
      : decision === 'BALANCED_GOALS'
        ? 'Öncelik dengeli hedef portföyünde korunmalı.'
        : `Öncelik: ${decision.replace(/_/g, ' ').toLowerCase()}.`,
  ]

  return items.filter((t) => !isForbidden(t)).slice(0, BRIEFING_LIMIT)
}

export async function gatherGoalEngineContext(prisma: PrismaClient): Promise<GoalEngineContext> {
  const baseCtx = await gatherOptimizationEngineContext(prisma)
  const optimization = assembleOptimizationEngine(baseCtx)
  return { ...baseCtx, optimization }
}

export function assembleGoalEngine(ctx: GoalEngineContext): GoalEngineResponseDto {
  const metrics = buildFeedbackMetrics(ctx.ceo, ctx.brain, ctx.orchestrator)
  const templates = buildGoalTemplates(ctx, metrics)
  const activeGoals = buildActiveGoals(templates).sort(
    (a, b) => priorityWeight(b.priority) - priorityWeight(a.priority),
  )
  const goalProgress = buildGoalProgress(templates)
  const goalScore = computeGoalScore(activeGoals)
  const goalDecision = resolveGoalDecision(activeGoals, ctx.optimization)
  const goalRisks = buildGoalRisks(activeGoals)
  const goalOpportunities = buildGoalOpportunities(activeGoals, ctx.learning)
  const managementBriefing = buildGoalManagementBriefing(activeGoals, goalDecision)

  return {
    goalScore,
    goalDecision,
    activeGoals,
    goalProgress,
    goalRisks,
    goalOpportunities,
    managementBriefing,
    today: ctx.today,
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true },
  }
}

export function virtualUpdateGoalProgress(goalId: string, bump = 5): {
  goalId: string
  progressPercent: number
  updatedAt: string
} | null {
  const existing = progressStore.get(goalId) ?? { progressBump: 0, lastUpdatedAt: null }
  existing.progressBump = clamp(existing.progressBump + bump, 0, 30)
  existing.lastUpdatedAt = new Date().toISOString()
  progressStore.set(goalId, existing)
  return {
    goalId,
    progressPercent: existing.progressBump,
    updatedAt: existing.lastUpdatedAt,
  }
}
