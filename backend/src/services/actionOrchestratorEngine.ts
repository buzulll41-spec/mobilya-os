/**
 * Otonom Aksiyon Orkestratörü motoru — Faz 8/9/10/13/24 sentezi.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

import type { PrismaClient } from '@prisma/client'
import type { PrimaryDecision } from '../contracts/businessBrainDto.js'
import type { BusinessBrainResponseDto } from '../contracts/businessBrainDto.js'
import type { ActionCategory, ActionDto, ActionPriority } from '../contracts/actionCenterDto.js'
import type { AutomationJobType } from '../contracts/automationJobDto.js'
import type { AgentCode } from '../contracts/operationsAgentDto.js'
import type {
  ActionOrchestratorResponseDto,
  AffectedItemDto,
  OrchestratorRunStatus,
  PriorityOverrideDto,
  StrategyBoostMap,
} from '../contracts/actionOrchestratorDto.js'
import { gatherCeoData, type CeoGatheredData } from './getCeoControlCenter.js'
import { assembleBusinessBrain, gatherBusinessBrainContext } from './businessBrainEngine.js'
import {
  assembleOperationsAgentsResponse,
  gatherAgentContext,
} from './operationsAgentsEngine.js'
import { runOperationsAgents } from './runOperationsAgents.js'

const EXECUTION_PLAN_LIMIT = 20
const AFFECTED_LIMIT = 15

const SOURCE_MODULES = [
  'actionCenter',
  'operationCases',
  'automation',
  'operationsAgents',
  'businessBrain',
] as const

const PRIORITY_RANK: Record<ActionPriority, number> = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }
const RANK_TO_PRIORITY: ActionPriority[] = ['P1', 'P1', 'P2', 'P3', 'P4', 'P5']

const JOB_CATEGORY: Record<AutomationJobType, ActionCategory | 'GROWTH' | 'INVESTMENT' | 'RISK'> = {
  CREATE_COLLECTION_CASE: 'COLLECTION',
  CREATE_SHIPMENT_CASE: 'SHIPMENT',
  CREATE_DATA_QUALITY_CASE: 'DATA_QUALITY',
  CREATE_SOURCE_REVIEW_CASE: 'SALES',
  CREATE_PROFIT_REVIEW_CASE: 'RISK',
  CREATE_SALES_REVIEW_CASE: 'SALES',
}

const AGENT_CODES: AgentCode[] = [
  'COLLECTION_AGENT',
  'SHIPMENT_AGENT',
  'DATA_QUALITY_AGENT',
  'SALES_AGENT',
  'SUPPLIER_AGENT',
  'EXECUTIVE_AGENT',
]

const STRATEGY_MAP: Record<PrimaryDecision, StrategyBoostMap> = {
  COLLECTION_FIRST: {
    COLLECTION: 50,
    SHIPMENT: 10,
    SUPPLIER: 5,
    COLLECTION_AGENT: 50,
    CREATE_COLLECTION_CASE: 40,
  },
  AGGRESSIVE_GROWTH: {
    SALES: 50,
    GROWTH: 50,
    COLLECTION: 10,
    SALES_AGENT: 45,
    CREATE_SALES_REVIEW_CASE: 35,
  },
  CONTROLLED_GROWTH: {
    SALES: 35,
    GROWTH: 30,
    COLLECTION: 15,
    OPERATIONS: 20,
    SALES_AGENT: 30,
  },
  DEFENSIVE_MODE: {
    RISK: 50,
    COLLECTION: 40,
    GROWTH: 5,
    SUPPLIER: 20,
    COLLECTION_AGENT: 40,
    CREATE_PROFIT_REVIEW_CASE: 35,
  },
  STORE_EXPANSION: {
    GROWTH: 50,
    INVESTMENT: 40,
    COLLECTION: 5,
    SALES: 45,
    SALES_AGENT: 50,
    CREATE_SALES_REVIEW_CASE: 40,
  },
  SUPPLIER_RESTRUCTURE: {
    SUPPLIER: 50,
    RISK: 25,
    COLLECTION: 10,
    SUPPLIER_AGENT: 50,
    CREATE_PROFIT_REVIEW_CASE: 30,
  },
  COST_REDUCTION: {
    RISK: 40,
    SUPPLIER: 35,
    OPERATIONS: 30,
    COLLECTION: 20,
    SUPPLIER_AGENT: 35,
  },
  PROFITABILITY_RECOVERY: {
    RISK: 45,
    SUPPLIER: 30,
    SALES: 20,
    COLLECTION: 15,
    CREATE_PROFIT_REVIEW_CASE: 40,
  },
  INVESTMENT_WINDOW: {
    INVESTMENT: 50,
    GROWTH: 45,
    SALES: 35,
    COLLECTION: 10,
    SALES_AGENT: 40,
  },
  WAIT_AND_MONITOR: {
    OPERATIONS: 25,
    RISK: 20,
    COLLECTION: 15,
    EXECUTIVE_AGENT: 30,
  },
}

type OrchestratorStore = {
  activeStrategy: PrimaryDecision | null
  priorityOverrides: PriorityOverrideDto[]
  lastRunAt: string | null
  runStatus: OrchestratorRunStatus
}

const store: OrchestratorStore = {
  activeStrategy: null,
  priorityOverrides: [],
  lastRunAt: null,
  runStatus: 'PLANNED',
}

export function getOrchestratorStore(): OrchestratorStore {
  return { ...store, priorityOverrides: [...store.priorityOverrides] }
}

export function resetOrchestratorStore(): void {
  store.activeStrategy = null
  store.priorityOverrides = []
  store.lastRunAt = null
  store.runStatus = 'PLANNED'
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

function boostedPriority(original: ActionPriority, boost: number): ActionPriority {
  const rank = PRIORITY_RANK[original]
  const steps = Math.floor(boost / 25)
  const newRank = clamp(rank - steps, 1, 5)
  return RANK_TO_PRIORITY[newRank]!
}

export function buildPriorityOverrides(strategy: PrimaryDecision): PriorityOverrideDto[] {
  const boosts = STRATEGY_MAP[strategy]
  const out: PriorityOverrideDto[] = []

  for (const [target, boost] of Object.entries(boosts)) {
    if (!boost) continue
    let targetType: PriorityOverrideDto['targetType'] = 'ACTION_CATEGORY'
    if (AGENT_CODES.includes(target as AgentCode)) targetType = 'AGENT'
    else if (target.startsWith('CREATE_')) targetType = 'JOB_TYPE'
    else if (target === 'GROWTH' || target === 'INVESTMENT') targetType = 'ACTION_CATEGORY'

    const reason =
      targetType === 'AGENT'
        ? `${strategy} — ${target} öncelik kazandı (+${boost}).`
        : `${strategy} — ${target} görevleri +${boost} boost.`

    out.push({ target, targetType, boost, reason })
  }

  return out.sort((a, b) => b.boost - a.boost)
}

function categoryBoost(strategy: PrimaryDecision, category: ActionCategory): number {
  const map = STRATEGY_MAP[strategy]
  return map[category] ?? 0
}

function agentBoost(strategy: PrimaryDecision, code: AgentCode): number {
  const map = STRATEGY_MAP[strategy]
  return map[code] ?? 0
}

function jobBoost(strategy: PrimaryDecision, jobType: AutomationJobType): number {
  const map = STRATEGY_MAP[strategy]
  return map[jobType] ?? map[JOB_CATEGORY[jobType]] ?? 0
}

export function buildAffectedTasks(
  strategy: PrimaryDecision,
  actions: ActionDto[],
): AffectedItemDto[] {
  const out: AffectedItemDto[] = []
  for (const a of actions) {
    const boost = categoryBoost(strategy, a.category)
    if (boost <= 0) continue
    if (isDepoKati(a.title) || isDepoKati(a.reason)) continue
    out.push({
      id: a.id,
      name: a.title,
      category: a.category,
      originalPriority: a.priority,
      boostedPriority: boostedPriority(a.priority, boost),
      boost,
    })
  }
  return out.sort((x, y) => y.boost - x.boost || PRIORITY_RANK[x.boostedPriority as ActionPriority] - PRIORITY_RANK[y.boostedPriority as ActionPriority]).slice(0, AFFECTED_LIMIT)
}

export function buildAffectedCases(
  strategy: PrimaryDecision,
  ceo: CeoGatheredData,
): AffectedItemDto[] {
  const actionMap = new Map(ceo.actionResult.actions.map((a) => [a.id, a]))
  const out: AffectedItemDto[] = []

  for (const c of ceo.caseResult.cases) {
    let maxBoost = 0
    let cat = 'OPERATIONS'
    for (const aid of c.actionIds) {
      const a = actionMap.get(aid)
      if (!a) continue
      const b = categoryBoost(strategy, a.category)
      if (b > maxBoost) {
        maxBoost = b
        cat = a.category
      }
    }
    if (maxBoost <= 0) continue
    out.push({
      id: c.id,
      name: c.title,
      category: cat,
      originalPriority: c.priority,
      boostedPriority: boostedPriority(c.priority as ActionPriority, maxBoost),
      boost: maxBoost,
    })
  }
  return out.sort((x, y) => y.boost - x.boost).slice(0, AFFECTED_LIMIT)
}

export function buildAffectedJobs(strategy: PrimaryDecision, ceo: CeoGatheredData): AffectedItemDto[] {
  const out: AffectedItemDto[] = []
  for (const j of ceo.jobResult.jobs) {
    const boost = jobBoost(strategy, j.jobType)
    if (boost <= 0) continue
    out.push({
      id: j.id,
      name: j.title ?? j.jobType,
      category: JOB_CATEGORY[j.jobType],
      originalPriority: j.priority,
      boostedPriority: boostedPriority(j.priority, boost),
      boost,
    })
  }
  return out.sort((x, y) => y.boost - x.boost).slice(0, AFFECTED_LIMIT)
}

export function buildAffectedAgents(
  strategy: PrimaryDecision,
  agents: ReturnType<typeof assembleOperationsAgentsResponse>['agents'],
): AffectedItemDto[] {
  const out: AffectedItemDto[] = []
  for (const a of agents) {
    const boost = agentBoost(strategy, a.agentCode)
    if (boost <= 0) continue
    const orig = a.priority
    const boosted =
      boost >= 40 ? 'P1' : boost >= 25 ? 'P2' : orig === 'P3' ? 'P2' : orig
    out.push({
      id: a.id,
      name: a.agentName,
      category: a.agentCode,
      originalPriority: orig,
      boostedPriority: boosted,
      boost,
    })
  }
  return out.sort((x, y) => y.boost - x.boost).slice(0, AFFECTED_LIMIT)
}

export function buildExecutionPlan(brain: BusinessBrainResponseDto, ceo: CeoGatheredData): string[] {
  const out: string[] = []

  for (const a of brain.todayActions) {
    if (out.length >= EXECUTION_PLAN_LIMIT) break
    if (isDepoKati(a)) continue
    out.push(a)
  }

  const fillers = [
    'Açık sevkleri kapat — sevk operasyonu kuyruğunu gözden geçir.',
    'Eksik parça vakalarını çöz — missing items panelini aç.',
    'Supplier bakiyelerini dengele — tedarikçi ödeme takvimini kontrol et.',
    'P1 görevleri ata — aksiyon merkezinde en yüksek öncelikli işleri sırala.',
    'Otomasyon işlerini onayla — bekleyen automation jobs kuyruğunu işle.',
    'Operasyon ajanlarını çalıştır — öncelikli ajan run tetikle.',
    'CEO kontrol merkezini güncelle — yönetici skoru ve alarmları kontrol et.',
    'Veri kalitesi eksiklerini tamamla — DQ raporundaki satırları düzelt.',
    'Riskli siparişleri gözden geçir — yüksek riskli müşteri listesini aç.',
    'Tahsilat hatırlatmalarını başlat — collection modülünden ödeme takibi.',
  ]

  for (const f of fillers) {
    if (out.length >= EXECUTION_PLAN_LIMIT) break
    out.push(f)
  }

  const p1Actions = ceo.actionResult.actions.filter((a) => a.priority === 'P1').slice(0, 3)
  for (const a of p1Actions) {
    if (out.length >= EXECUTION_PLAN_LIMIT) break
    if (isDepoKati(a.title)) continue
    out.push(`P1 görev: ${a.title}`)
  }

  return out.slice(0, EXECUTION_PLAN_LIMIT)
}

export function computeOrchestratorScore(
  brainScore: number,
  affectedTasks: AffectedItemDto[],
  totalActions: number,
  executionPlan: string[],
): number {
  const coverage = totalActions > 0 ? (affectedTasks.length / totalActions) * 100 : 50
  const planScore = (executionPlan.length / EXECUTION_PLAN_LIMIT) * 100
  return round1(clamp(brainScore * 0.5 + coverage * 0.25 + planScore * 0.25, 0, 100))
}

export type OrchestratorContext = {
  brain: BusinessBrainResponseDto
  ceo: CeoGatheredData
  agents: ReturnType<typeof assembleOperationsAgentsResponse>
  today: string
}

export async function gatherOrchestratorContext(prisma: PrismaClient): Promise<OrchestratorContext> {
  const brainCtx = await gatherBusinessBrainContext(prisma)
  const brain = assembleBusinessBrain(brainCtx)
  const ceo = await gatherCeoData(prisma)
  const agentCtx = await gatherAgentContext(prisma)
  const agents = assembleOperationsAgentsResponse(agentCtx)
  return { brain, ceo, agents, today: brain.today }
}

export function assembleActionOrchestrator(
  ctx: OrchestratorContext,
  runStatus: OrchestratorRunStatus = store.runStatus,
  lastRunAt: string | null = store.lastRunAt,
): ActionOrchestratorResponseDto {
  const strategy = ctx.brain.primaryDecision
  const priorityOverrides = buildPriorityOverrides(strategy)
  const affectedTasks = buildAffectedTasks(strategy, ctx.ceo.actionResult.actions)
  const affectedCases = buildAffectedCases(strategy, ctx.ceo)
  const affectedJobs = buildAffectedJobs(strategy, ctx.ceo)
  const affectedAgents = buildAffectedAgents(strategy, ctx.agents.agents)
  const executionPlan = buildExecutionPlan(ctx.brain, ctx.ceo)
  const orchestratorScore = computeOrchestratorScore(
    ctx.brain.brainScore,
    affectedTasks,
    ctx.ceo.actionResult.actions.length,
    executionPlan,
  )

  return {
    orchestratorScore,
    activeStrategy: strategy,
    brainScore: ctx.brain.brainScore,
    affectedTasks,
    affectedCases,
    affectedJobs,
    affectedAgents,
    executionPlan,
    priorityOverrides,
    lastRunAt,
    runStatus,
    today: ctx.today,
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true, sources: [...SOURCE_MODULES] },
  }
}

function topAgentForStrategy(strategy: PrimaryDecision): AgentCode | null {
  const overrides = buildPriorityOverrides(strategy)
  const agentOverride = overrides.find((o) => o.targetType === 'AGENT')
  return (agentOverride?.target as AgentCode) ?? null
}

export async function applyOrchestratorRun(prisma: PrismaClient): Promise<ActionOrchestratorResponseDto> {
  const ctx = await gatherOrchestratorContext(prisma)
  const strategy = ctx.brain.primaryDecision
  const priorityOverrides = buildPriorityOverrides(strategy)
  const now = new Date().toISOString()

  store.activeStrategy = strategy
  store.priorityOverrides = priorityOverrides
  store.lastRunAt = now
  store.runStatus = 'APPLIED'

  const topAgent = topAgentForStrategy(strategy)
  if (topAgent) {
    await runOperationsAgents(prisma, topAgent)
  }

  return assembleActionOrchestrator(ctx, 'APPLIED', now)
}
