/**
 * Otonom Kurumsal Kumanda Merkezi — Faz 1-29 çıktılarının nihai sentezi.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import type { ActionCenterResponseDto } from '../contracts/actionCenterDto.js'
import type { AutomationJobsResponseDto } from '../contracts/automationJobDto.js'
import type { BusinessBrainResponseDto } from '../contracts/businessBrainDto.js'
import type { CeoIntelligenceResponseDto } from '../contracts/ceoIntelligenceDto.js'
import type { ChairmanIntelligenceResponseDto } from '../contracts/chairmanDto.js'
import type {
  CommandDecision,
  CriticalRiskDto,
  EnterpriseCommandCenterResponseDto,
  GoalStatusSummaryDto,
  LearningSummaryDto,
  OpportunityDto,
  OptimizationSummaryDto,
  OperationsSummaryDto,
  TodayActionDto,
} from '../contracts/enterpriseCommandCenterDto.js'
import type { GoalDecision, GoalEngineResponseDto } from '../contracts/goalEngineDto.js'
import type { OperationCasesResponseDto } from '../contracts/operationCaseDto.js'
import type { OperationsAdvisorResponseDto } from '../contracts/operationsAdvisorDto.js'
import type { StrategicIntelligenceResponseDto } from '../contracts/strategicIntelligenceDto.js'
import { getActionCenter } from './getActionCenter.js'
import { getAutomationJobs } from './getAutomationJobs.js'
import { getCeoIntelligence } from './getCeoIntelligence.js'
import { getChairmanIntelligence } from './getChairmanIntelligence.js'
import { getOperationCases } from './getOperationCases.js'
import { getOperationsAdvisor } from './getOperationsAdvisor.js'
import { getStrategicIntelligence } from './getStrategicIntelligence.js'
import {
  assembleGoalEngine,
  gatherGoalEngineContext,
  type GoalEngineContext,
} from './goalEngine.js'

const ACTIONS_LIMIT = 10
const RISKS_LIMIT = 10
const OPPORTUNITIES_LIMIT = 10
const BRIEFING_LIMIT = 5
const LEARNING_TOP = 5

export type EnterpriseCommandCenterContext = {
  goalCtx: GoalEngineContext
  goal: GoalEngineResponseDto
  ceo: CeoIntelligenceResponseDto
  chairman: ChairmanIntelligenceResponseDto
  strategic: StrategicIntelligenceResponseDto
  actionCenter: ActionCenterResponseDto
  operationCases: OperationCasesResponseDto
  automationJobs: AutomationJobsResponseDto
  operationsAdvisor: OperationsAdvisorResponseDto
  brain: BusinessBrainResponseDto
}

function round1(n: number): number {
  return Math.round(n * 10) / 10
}

function isForbidden(text: string): boolean {
  return (
    text.includes('Depo Katı') ||
    text.includes('WAREHOUSE') ||
    text.includes('WAREHOUSE_FLOOR')
  )
}

function priorityWeight(p: 'P1' | 'P2' | 'P3'): number {
  return p === 'P1' ? 3 : p === 'P2' ? 2 : 1
}

export function computeCompanyHealthScore(ctx: EnterpriseCommandCenterContext): number {
  const scores = [
    ctx.ceo.ceoScore,
    ctx.chairman.chairmanScore,
    ctx.brain.brainScore,
    ctx.strategic.companyHealth.score,
    ctx.goal.goalScore,
  ]
  return round1(scores.reduce((s, v) => s + v, 0) / scores.length)
}

export function buildTodayActions(ctx: EnterpriseCommandCenterContext): TodayActionDto[] {
  type Candidate = TodayActionDto & { weight: number }

  const candidates: Candidate[] = []

  for (const [i, action] of ctx.brain.todayActions.entries()) {
    if (isForbidden(action)) continue
    candidates.push({
      id: `brain-action-${i}`,
      priority: 'P1',
      source: 'Business Brain',
      action,
      weight: 10,
    })
  }

  for (const g of ctx.goal.activeGoals.filter((x) => x.priority === 'P1')) {
    if (isForbidden(g.title)) continue
    candidates.push({
      id: `goal-${g.id}`,
      priority: 'P1',
      source: 'Goal Engine',
      action: g.title,
      weight: 9,
    })
  }

  for (const c of ctx.goalCtx.optimization.recommendedChanges) {
    const action = `${c.target}: ${c.recommendedValue}`
    if (isForbidden(action)) continue
    candidates.push({
      id: c.id,
      priority: c.priority,
      source: 'Optimization Engine',
      action,
      weight: priorityWeight(c.priority) * 3,
    })
  }

  candidates.sort((a, b) => b.weight - a.weight)

  const seen = new Set<string>()
  const out: TodayActionDto[] = []
  for (const c of candidates) {
    const key = c.action.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({ id: c.id, priority: c.priority, source: c.source, action: c.action })
    if (out.length >= ACTIONS_LIMIT) break
  }

  if (out.length === 0) {
    out.push({
      id: 'default-action-1',
      priority: 'P2',
      source: 'Command Center',
      action: 'Yönetim katmanı çıktılarını günlük olarak gözden geçir.',
    })
  }

  return out
}

export function buildCriticalRisks(ctx: EnterpriseCommandCenterContext): CriticalRiskDto[] {
  type Candidate = CriticalRiskDto & { weight: number }

  const candidates: Candidate[] = []

  for (const a of ctx.operationsAdvisor.advisories) {
    if (a.severity !== 'CRITICAL' && a.severity !== 'WARNING') continue
    if (isForbidden(a.title) || isForbidden(a.recommendation)) continue
    candidates.push({
      id: `advisor-${a.id}`,
      severity: a.severity,
      source: 'Operations Advisor',
      title: a.title,
      recommendation: a.recommendation,
      weight: a.severity === 'CRITICAL' ? 10 : 7,
    })
  }

  for (const p of ctx.ceo.topProblems) {
    if (isForbidden(p.title) || isForbidden(p.description)) continue
    candidates.push({
      id: `ceo-${p.id}`,
      severity: p.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      source: 'CEO Intelligence',
      title: p.title,
      recommendation: p.description,
      weight: p.severity === 'CRITICAL' ? 9 : 6,
    })
  }

  for (const t of ctx.chairman.topThreats) {
    if (isForbidden(t.title) || isForbidden(t.description)) continue
    candidates.push({
      id: `chairman-${t.id}`,
      severity: t.severity === 'CRITICAL' ? 'CRITICAL' : 'WARNING',
      source: 'Chairman',
      title: t.title,
      recommendation: t.description,
      weight: t.severity === 'CRITICAL' ? 8 : 5,
    })
  }

  for (const r of ctx.goal.goalRisks) {
    if (isForbidden(r.goal) || isForbidden(r.recommendation)) continue
    candidates.push({
      id: `goal-risk-${r.id}`,
      severity: r.severity === 'HIGH' ? 'HIGH' : r.severity === 'MEDIUM' ? 'MEDIUM' : 'LOW',
      source: 'Goal Engine',
      title: r.goal,
      recommendation: r.recommendation,
      weight: r.severity === 'HIGH' ? 7 : r.severity === 'MEDIUM' ? 5 : 3,
    })
  }

  candidates.sort((a, b) => b.weight - a.weight)

  const seen = new Set<string>()
  const out: CriticalRiskDto[] = []
  for (const c of candidates) {
    const key = c.title.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: c.id,
      severity: c.severity,
      source: c.source,
      title: c.title,
      recommendation: c.recommendation,
    })
    if (out.length >= RISKS_LIMIT) break
  }

  return out
}

export function buildOpportunities(ctx: EnterpriseCommandCenterContext): OpportunityDto[] {
  type Candidate = OpportunityDto & { weight: number }

  const candidates: Candidate[] = []

  for (const r of ctx.strategic.recommendations) {
    if (isForbidden(r.title) || isForbidden(r.reason)) continue
    const impact = r.priority === 'HIGH' ? 8 : r.priority === 'MEDIUM' ? 5 : 3
    candidates.push({
      id: `strategic-${r.id}`,
      source: 'Strategic Intelligence',
      title: r.title,
      impact,
      recommendation: r.reason,
      weight: impact,
    })
  }

  for (const o of ctx.goal.goalOpportunities) {
    if (isForbidden(o.opportunity) || isForbidden(o.recommendation)) continue
    candidates.push({
      id: `goal-opp-${o.id}`,
      source: 'Goal Engine',
      title: o.opportunity,
      impact: o.expectedImpact,
      recommendation: o.recommendation,
      weight: o.expectedImpact,
    })
  }

  for (const o of ctx.chairman.topOpportunities) {
    if (isForbidden(o.title) || isForbidden(o.description)) continue
    candidates.push({
      id: `chairman-opp-${o.id}`,
      source: 'Chairman',
      title: o.title,
      impact: 6,
      recommendation: o.description,
      weight: 6,
    })
  }

  candidates.sort((a, b) => b.weight - a.weight)

  const seen = new Set<string>()
  const out: OpportunityDto[] = []
  for (const c of candidates) {
    const key = c.title.toLowerCase().trim()
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      id: c.id,
      source: c.source,
      title: c.title,
      impact: c.impact,
      recommendation: c.recommendation,
    })
    if (out.length >= OPPORTUNITIES_LIMIT) break
  }

  return out
}

export function buildGoalStatus(goal: GoalEngineResponseDto): GoalStatusSummaryDto {
  return {
    total: goal.activeGoals.length,
    atRisk: goal.activeGoals.filter((g) => g.status === 'AT_RISK' || g.status === 'FAILED').length,
    achieved: goal.activeGoals.filter((g) => g.status === 'ACHIEVED').length,
  }
}

export function buildLearningSummary(ctx: EnterpriseCommandCenterContext): LearningSummaryDto {
  const table = ctx.goalCtx.learning.strategyTable
  const bySuccess = [...table].sort((a, b) => b.successRate - a.successRate)
  const byFailure = [...table].sort((a, b) => a.successRate - b.successRate)

  const mapRow = (s: (typeof table)[0]) => ({
    strategy: s.strategy,
    successRate: s.successRate,
    impactScore: s.impactScore,
  })

  return {
    topSuccessful: bySuccess.slice(0, LEARNING_TOP).map(mapRow),
    bottomFailed: byFailure.slice(0, LEARNING_TOP).map(mapRow),
  }
}

export function buildOptimizationSummary(ctx: EnterpriseCommandCenterContext): OptimizationSummaryDto {
  const opt = ctx.goalCtx.optimization
  const strategyChanges = opt.strategyOptimizations.filter(
    (s) => s.currentWeight !== s.recommendedWeight,
  ).length
  const agentChanges = opt.agentOptimizations.filter(
    (a) => a.currentWeight !== a.recommendedWeight,
  ).length

  const topStrategy = opt.strategyOptimizations.find(
    (s) => s.currentWeight !== s.recommendedWeight,
  )
  const topAgent = opt.agentOptimizations.find((a) => a.currentWeight !== a.recommendedWeight)

  return {
    strategyChanges,
    agentChanges,
    topStrategyChange: topStrategy
      ? `${topStrategy.strategy}: ${topStrategy.currentWeight}→${topStrategy.recommendedWeight}`
      : null,
    topAgentChange: topAgent
      ? `${topAgent.agent}: ${topAgent.currentWeight}→${topAgent.recommendedWeight}`
      : null,
  }
}

export function buildOperationsSummary(ctx: EnterpriseCommandCenterContext): OperationsSummaryDto {
  return {
    openCases: ctx.operationCases.summary.openCases,
    criticalCases: ctx.operationCases.summary.p1Cases,
    pendingTasks: ctx.actionCenter.summary.totalOpen,
    automationQueue:
      ctx.automationJobs.summary.pendingCount + ctx.automationJobs.summary.waitingApprovalCount,
  }
}

export function buildCommandManagementBriefing(ctx: EnterpriseCommandCenterContext): string[] {
  const paragraphs: string[] = []

  if (ctx.ceo.ceoReason[0] && !isForbidden(ctx.ceo.ceoReason[0])) {
    paragraphs.push(ctx.ceo.ceoReason[0])
  }
  if (ctx.chairman.chairmanReason[0] && !isForbidden(ctx.chairman.chairmanReason[0])) {
    paragraphs.push(ctx.chairman.chairmanReason[0])
  }

  for (const line of ctx.brain.managementBriefing) {
    if (!isForbidden(line)) paragraphs.push(line)
    if (paragraphs.length >= 4) break
  }

  const goalLine = ctx.goal.managementBriefing.find((l) => !isForbidden(l))
  if (goalLine) paragraphs.push(goalLine)

  const fallbacks = [
    'Kurumsal kumanda merkezi tüm yönetim motorlarını tek ekranda sentezledi.',
    'Operasyon, finans ve strateji katmanları günlük olarak hizalandı.',
    'Öncelikli aksiyonlar ve riskler birleşik kuyrukta sıralandı.',
    'Hedef motoru kararı üst düzey komuta modunu belirledi.',
    'Yönetim brifingi CEO, Başkan ve İşletme Beyni çıktılarından derlendi.',
  ]

  for (const fb of fallbacks) {
    if (paragraphs.length >= BRIEFING_LIMIT) break
    if (!paragraphs.includes(fb)) paragraphs.push(fb)
  }

  return paragraphs.filter((t) => !isForbidden(t)).slice(0, BRIEFING_LIMIT)
}

export function resolveCommandDecision(goalDecision: GoalDecision): CommandDecision {
  if (
    goalDecision === 'FOCUS_COLLECTION' ||
    goalDecision === 'FOCUS_PROFIT' ||
    goalDecision === 'FOCUS_RISK_REDUCTION'
  ) {
    return 'FOCUS_COLLECTION'
  }
  if (goalDecision === 'FOCUS_GROWTH') {
    return 'FOCUS_GROWTH'
  }
  return 'BALANCED_MODE'
}

export async function gatherEnterpriseCommandCenterContext(
  prisma: PrismaClient,
): Promise<EnterpriseCommandCenterContext> {
  const goalCtx = await gatherGoalEngineContext(prisma)
  const goal = assembleGoalEngine(goalCtx)

  const [ceo, chairman, strategic, actionCenter, operationCases, automationJobs, operationsAdvisor] =
    await Promise.all([
      getCeoIntelligence(prisma),
      getChairmanIntelligence(prisma),
      getStrategicIntelligence(prisma),
      getActionCenter(prisma),
      getOperationCases(prisma),
      getAutomationJobs(prisma),
      getOperationsAdvisor(prisma),
    ])

  return {
    goalCtx,
    goal,
    ceo,
    chairman,
    strategic,
    actionCenter,
    operationCases,
    automationJobs,
    operationsAdvisor,
    brain: goalCtx.brain,
  }
}

export function assembleEnterpriseCommandCenter(
  ctx: EnterpriseCommandCenterContext,
): EnterpriseCommandCenterResponseDto {
  return {
    companyHealthScore: computeCompanyHealthScore(ctx),
    todayActions: buildTodayActions(ctx),
    criticalRisks: buildCriticalRisks(ctx),
    opportunities: buildOpportunities(ctx),
    goalStatus: buildGoalStatus(ctx.goal),
    learningSummary: buildLearningSummary(ctx),
    optimizationSummary: buildOptimizationSummary(ctx),
    operationsSummary: buildOperationsSummary(ctx),
    managementBriefing: buildCommandManagementBriefing(ctx),
    commandDecision: resolveCommandDecision(ctx.goal.goalDecision),
    today: ctx.goalCtx.today,
    generatedAt: new Date().toISOString(),
    currency: ctx.actionCenter.currency,
    meta: { depoKatiExcluded: true },
  }
}
