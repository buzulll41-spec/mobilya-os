/**
 * AI Operasyon Direktörü motoru — Faz 12–13 çıktılarını yorumlayıp günlük operasyon planı üretir.
 * Deterministik; gelecekte GPT/Gemini/Claude swap için ExecutiveDirectorRunner arayüzü.
 */

import type { PrismaClient } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { assembleCeoControlCenter, type CeoGatheredData } from './getCeoControlCenter.js'
import {
  assembleOperationsAgentsResponse,
  gatherAgentContext,
  type AgentContext,
} from './operationsAgentsEngine.js'
import type { CeoControlCenterResponseDto } from '../contracts/ceoControlCenterDto.js'
import type { OperationsAgentsResponseDto } from '../contracts/operationsAgentDto.js'
import type {
  DailyPlanItemDto,
  DailyPlanSectionDto,
  DirectorPriorityLevel,
  DirectorRiskSeverity,
  ExecutiveAgendaSlotDto,
  ExecutiveBriefingDto,
  ExecutiveDirectorResponseDto,
  ExecutiveDirectorSummaryDto,
  ImpactAnalysisItemDto,
  ImpactMetricDto,
  PriorityQueueItemDto,
  RecommendedActionDto,
  RiskMapItemDto,
} from '../contracts/executiveDirectorDto.js'

const PRIORITY_QUEUE_LIMIT = 20
const RISK_MAP_LIMIT = 10
const RECOMMENDED_ACTIONS_LIMIT = 12
const IMPACT_ANALYSIS_LIMIT = 5

const CATEGORY_LABELS: Record<string, string> = {
  COLLECTION: 'Tahsilat',
  DATA_QUALITY: 'Veri Kalitesi',
  SHIPMENT: 'Sevkiyat',
  SALES: 'Satış',
  SUPPLIER: 'Tedarikçi',
  OPERATIONS: 'Operasyon',
  PROFITABILITY: 'Kârlılık',
}

const PRIORITY_RANK: Record<DirectorPriorityLevel, number> = { P1: 1, P2: 2, P3: 3 }

const SEVERITY_RANK: Record<DirectorRiskSeverity, number> = { CRITICAL: 3, WARNING: 2, INFO: 1 }

/** Gelecekte LLM tabanlı direktör için değiştirilebilir arayüz. */
export interface ExecutiveDirectorRunner {
  run(ctx: DirectorContext): ExecutiveDirectorResponseDto
}

export type DirectorContext = {
  ctx: AgentContext
  ceo: CeoControlCenterResponseDto
  agents: OperationsAgentsResponseDto
  lastRunAt: string | null
}

const directorRunStore = { lastRunAt: null as string | null }

export function getDirectorLastRunAt(): string | null {
  return directorRunStore.lastRunAt
}

export function recordDirectorRun(ranAt: string): void {
  directorRunStore.lastRunAt = ranAt
}

export function resetDirectorRunStore(): void {
  directorRunStore.lastRunAt = null
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

function isDepoKatiLabel(label: string): boolean {
  return label === 'Depo Katı' || label === 'WAREHOUSE' || label === 'WAREHOUSE_FLOOR'
}

/** Tek geçiş — CEO + Operations Agents verisini toplar. */
export async function gatherDirectorContext(prisma: PrismaClient): Promise<DirectorContext> {
  const ctx = await gatherAgentContext(prisma)
  const ceo = assembleCeoControlCenter(ctx as CeoGatheredData)
  const agents = assembleOperationsAgentsResponse(ctx)
  return { ctx, ceo, agents, lastRunAt: directorRunStore.lastRunAt }
}

function mapPriorityItem(
  p: OperationsAgentsResponseDto['priorities'][number],
): PriorityQueueItemDto {
  return {
    id: p.id,
    priority: p.priority,
    title: p.title,
    reason: p.reason,
    sourceModule: p.agentCode,
    category: p.category,
  }
}

/** İlk 20 öncelik — P1 → P2 → P3. */
export function buildPriorityQueue(agents: OperationsAgentsResponseDto): PriorityQueueItemDto[] {
  return agents.priorities
    .filter((p) => !isDepoKatiLabel(p.title) && !p.reason.includes('Depo Katı'))
    .slice(0, PRIORITY_QUEUE_LIMIT)
    .map(mapPriorityItem)
}

/** Kategoriye göre günlük operasyon planı. */
export function buildDailyPlan(
  agents: OperationsAgentsResponseDto,
  ceo: CeoControlCenterResponseDto,
): DailyPlanSectionDto[] {
  const sections: DailyPlanSectionDto[] = []
  const priorities = agents.priorities.filter(
    (p) => !isDepoKatiLabel(p.title) && !p.reason.includes('Depo Katı'),
  )

  const byCategory = new Map<string, DailyPlanItemDto[]>()
  for (const p of priorities) {
    const cat = p.category
    const items = byCategory.get(cat) ?? []
    items.push({
      id: p.id,
      title: p.title,
      detail: p.reason,
      priority: p.priority,
      metric: p.priority === 'P1' ? 'Acil' : undefined,
    })
    byCategory.set(cat, items)
  }

  const order = ['COLLECTION', 'DATA_QUALITY', 'SHIPMENT', 'SALES', 'SUPPLIER', 'PROFITABILITY']
  for (const cat of order) {
    const items = byCategory.get(cat)
    if (!items?.length) continue
    sections.push({
      id: `plan-${cat.toLowerCase()}`,
      category: cat,
      categoryLabel: CATEGORY_LABELS[cat] ?? cat,
      items: items.slice(0, 5),
    })
  }

  if (sections.length === 0) {
    sections.push({
      id: 'plan-default',
      category: 'OPERATIONS',
      categoryLabel: 'Operasyon',
      items: [
        {
          id: 'plan-all-clear',
          title: 'Kritik konu tespit edilmedi',
          detail: `Yönetici skoru ${ceo.managerScore.score} — rutin kontroller yeterli.`,
          priority: 'P3',
        },
      ],
    })
  }

  return sections
}

function riskSeverityFromPriority(p: DirectorPriorityLevel): DirectorRiskSeverity {
  if (p === 'P1') return 'CRITICAL'
  if (p === 'P2') return 'WARNING'
  return 'INFO'
}

/** İşletmedeki en büyük 10 risk. */
export function buildRiskMap(
  agents: OperationsAgentsResponseDto,
  ceo: CeoControlCenterResponseDto,
): RiskMapItemDto[] {
  const out: RiskMapItemDto[] = []

  for (const p of agents.priorities.slice(0, RISK_MAP_LIMIT)) {
    if (isDepoKatiLabel(p.title) || p.reason.includes('Depo Katı')) continue
    out.push({
      id: `risk:${p.id}`,
      riskTitle: p.title,
      severity: riskSeverityFromPriority(p.priority),
      impact: p.reason,
      suggestedAction:
        agents.recommendations.find((r) => r.id.includes(p.id.replace('priority:', '')))
          ?.recommendedAction ??
        agents.recommendations.find((r) => r.title === p.title)?.recommendedAction ??
        'İlgili modülde detay inceleyin.',
    })
  }

  for (const alert of ceo.topAlerts) {
    if (out.length >= RISK_MAP_LIMIT) break
    if (out.some((r) => r.riskTitle === alert.title)) continue
    out.push({
      id: `risk:alert:${alert.id}`,
      riskTitle: alert.title,
      severity: alert.severity === 'CRITICAL' ? 'CRITICAL' : alert.severity === 'WARNING' ? 'WARNING' : 'INFO',
      impact: alert.message,
      suggestedAction: `${alert.source} modülünde detay inceleyin.`,
    })
  }

  out.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
  return out.slice(0, RISK_MAP_LIMIT)
}

function impactMetric(
  label: string,
  before: number,
  after: number,
  suffix = '',
  higherIsBetter = true,
): ImpactMetricDto {
  const delta = round1(after - before)
  const dir = delta === 0 ? 'NEUTRAL' : higherIsBetter ? (delta > 0 ? 'UP' : 'DOWN') : delta < 0 ? 'UP' : 'DOWN'
  return {
    label,
    before: suffix ? `${before}${suffix}` : before,
    after: suffix ? `${after}${suffix}` : after,
    delta: suffix ? `${delta >= 0 ? '+' : ''}${delta}${suffix}` : `${delta >= 0 ? '+' : ''}${delta}`,
    direction: dir,
  }
}

/** Deterministik etki analizi — aksiyonların skor etkisini simüle eder. */
export function buildImpactAnalysis(
  director: DirectorContext,
): ImpactAnalysisItemDto[] {
  const { ctx, ceo } = director
  const out: ImpactAnalysisItemDto[] = []
  const totals = ctx.srcRes.totals
  const collected = num(totals.collected)
  const open = num(totals.openBalance)
  const risky = num(totals.riskyReceivable)
  const dqScore = ctx.dq.totals.averageQualityScore
  const missingCost = ctx.dq.totals.missingCostCount

  const p1Collection = director.agents.priorities.find(
    (p) => p.category === 'COLLECTION' && p.priority === 'P1',
  )
  if (p1Collection && risky > 0) {
    const collectAmount = Math.min(risky, open * 0.3)
    const newCollected = collected + collectAmount
    const newOpen = Math.max(0, open - collectAmount)
    const newRisky = Math.max(0, risky - collectAmount)

    const scoreBefore = ceo.managerScore.score
    const riskyShareBefore = open > 0 ? risky / open : 0
    const riskyShareAfter = newOpen > 0 ? newRisky / newOpen : 0
    const riskyRawBefore = 100 - Math.min(100, riskyShareBefore * 4)
    const riskyRawAfter = 100 - Math.min(100, riskyShareAfter * 4)
    const collRatioBefore = collected + open > 0 ? (collected / (collected + open)) * 100 : 100
    const collRatioAfter = newCollected + newOpen > 0 ? (newCollected / (newCollected + newOpen)) * 100 : 100
    const scoreDelta = round1(
      ((collRatioAfter - collRatioBefore) * 0.2 + (riskyRawAfter - riskyRawBefore) * 0.15) / 1,
    )
    const scoreAfter = round1(clamp(scoreBefore + scoreDelta, 0, 100))
    const riskScoreBefore = round1(riskyRawBefore)
    const riskScoreAfter = round1(riskyRawAfter)

    out.push({
      id: 'impact:collection',
      actionTitle: p1Collection.title,
      actionDescription: `${formatMoneyAmount(collectAmount)} ₺ tahsilat senaryosu`,
      metrics: [
        impactMetric('Yönetici Skoru', scoreBefore, scoreAfter),
        impactMetric('Risk Skoru', riskScoreBefore, riskScoreAfter),
        {
          label: 'Açık Bakiye',
          before: formatMoneyAmount(open),
          after: formatMoneyAmount(newOpen),
          delta: `-${formatMoneyAmount(collectAmount)}`,
          direction: 'UP',
        },
      ],
    })
  }

  if (missingCost > 0) {
    const fixCount = Math.min(missingCost, 12)
    const perRecordGain = dqScore < 50 ? 4.5 : 2.5
    const dqAfter = round1(clamp(dqScore + fixCount * perRecordGain, 0, 100))
    const msBefore = ceo.managerScore.score
    const dqComponentDelta = (dqAfter - dqScore) * 0.1
    const msAfter = round1(clamp(msBefore + dqComponentDelta, 0, 100))

    out.push({
      id: 'impact:data-quality',
      actionTitle: `${fixCount} eksik maliyet kaydı düzeltildi`,
      actionDescription: 'ZERO_COST kayıtlarının düzeltilmesi senaryosu',
      metrics: [
        impactMetric('Veri Kalitesi', round1(dqScore), dqAfter),
        impactMetric('Yönetici Skoru', msBefore, msAfter),
      ],
    })
  }

  if (ctx.delayedShipments > 0) {
    const delayed = ctx.delayedShipments
    const opsBefore = 100 - Math.min(100, delayed * 8 + ceo.operationsHealth.p1Cases * 10)
    const opsAfter = 100 - Math.min(100, Math.max(0, delayed - 3) * 8 + ceo.operationsHealth.p1Cases * 10)
    const msBefore = ceo.managerScore.score
    const msAfter = round1(clamp(msBefore + (opsAfter - opsBefore) * 0.15, 0, 100))

    out.push({
      id: 'impact:shipment',
      actionTitle: `${delayed} geciken sevk müdahalesi`,
      actionDescription: '3 geciken sevkin kapatılması senaryosu',
      metrics: [
        impactMetric('Operasyon Disiplini', round1(opsBefore), round1(opsAfter)),
        impactMetric('Yönetici Skoru', msBefore, msAfter),
      ],
    })
  }

  return out.slice(0, IMPACT_ANALYSIS_LIMIT)
}

/** Yönetici ajandası — öneri saat dilimleri (takvim entegrasyonu yok). */
export function buildExecutiveAgenda(
  dailyPlan: DailyPlanSectionDto[],
  director: DirectorContext,
): ExecutiveAgendaSlotDto[] {
  const slots: ExecutiveAgendaSlotDto[] = []
  const categories = new Set(dailyPlan.map((s) => s.category))

  if (categories.has('COLLECTION')) {
    slots.push({
      timeRange: '09:00–10:00',
      focus: 'Tahsilat',
      description: 'Riskli müşteri aramaları ve ödeme planı görüşmeleri',
    })
  }
  if (categories.has('SHIPMENT') || director.ctx.delayedShipments > 0) {
    slots.push({
      timeRange: '10:00–11:00',
      focus: 'Sevkiyat',
      description: `${director.ctx.delayedShipments} geciken sevk takibi ve termin koordinasyonu`,
    })
  }
  if (categories.has('SUPPLIER')) {
    slots.push({
      timeRange: '11:00–11:30',
      focus: 'Tedarikçi görüşmesi',
      description: 'Termin riski taşıyan tedarikçilerle durum değerlendirmesi',
    })
  }
  if (categories.has('DATA_QUALITY') || director.ctx.dq.totals.missingCostCount > 0) {
    slots.push({
      timeRange: '11:30–12:00',
      focus: 'Veri Kalitesi',
      description: 'Eksik maliyet ve kaynak tanımlarının düzeltilmesi',
    })
  }
  if (categories.has('SALES')) {
    slots.push({
      timeRange: '14:00–15:00',
      focus: 'Satış',
      description: 'Hedef altı personel ve düşen kaynak değerlendirmesi',
    })
  }

  if (slots.length === 0) {
    slots.push({
      timeRange: '09:00–10:00',
      focus: 'Rutin kontrol',
      description: 'Kritik konu yok; günlük operasyon turu',
    })
  }

  return slots
}

/** Dijital sabah toplantısı brifingi. */
export function buildExecutiveBriefing(
  director: DirectorContext,
  dailyPlan: DailyPlanSectionDto[],
  riskMap: RiskMapItemDto[],
  recommendedActions: RecommendedActionDto[],
): ExecutiveBriefingDto {
  const { agents, ceo } = director
  const p1 = agents.summary.p1Issues
  const headline =
    p1 > 0
      ? `Bugün ${p1} kritik konu tespit edildi.`
      : `Bugün operasyon normal seyrediyor — yönetici skoru ${ceo.managerScore.score}.`

  const criticalTopics = agents.briefing.criticalIssues
    .slice(0, 5)
    .map((c) => c.title)
  if (criticalTopics.length === 0 && riskMap[0]) {
    criticalTopics.push(riskMap[0].riskTitle)
  }

  const todayPlan = dailyPlan.flatMap((s) =>
    s.items.slice(0, 2).map((i) => `${s.categoryLabel}: ${i.title}`),
  )

  const risks = riskMap.slice(0, 5).map((r) => r.riskTitle)

  const recs = recommendedActions.slice(0, 5).map((r) => r.title)
  if (recs.length === 0 && agents.briefing.whatToDoToday[0]) {
    recs.push(agents.briefing.whatToDoToday[0])
  }

  const firstPriority = director.agents.priorities.find((p) => p.priority === 'P1')
  if (firstPriority && !recs.some((r) => r.includes('tahsilat') || r.includes('Tahsilat'))) {
    recs.unshift(`İlk öncelik: ${firstPriority.title}`)
  }

  return {
    headline,
    criticalTopics,
    todayPlan,
    risks,
    recommendedActions: recs,
  }
}

function buildRecommendedActions(agents: OperationsAgentsResponseDto): RecommendedActionDto[] {
  const deepLinks: Record<string, string> = {
    COLLECTION_AGENT: 'collection',
    SHIPMENT_AGENT: 'shipment-ops',
    DATA_QUALITY_AGENT: 'data-quality',
    SALES_AGENT: 'sales-source-analytics',
    SUPPLIER_AGENT: 'supply-incoming',
    EXECUTIVE_AGENT: 'ceo-control-center',
  }

  return agents.recommendations
    .filter((r) => !isDepoKatiLabel(r.title) && !r.reason.includes('Depo Katı'))
    .slice(0, RECOMMENDED_ACTIONS_LIMIT)
    .map((r) => ({
      id: r.id,
      title: r.title,
      reason: r.reason,
      priority: r.priority,
      deepLinkPage: deepLinks[r.agentCode],
    }))
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
}

function buildSummary(
  director: DirectorContext,
  dailyPlan: DailyPlanSectionDto[],
  riskMap: RiskMapItemDto[],
  recommendedActions: RecommendedActionDto[],
): ExecutiveDirectorSummaryDto {
  const { agents, ceo } = director
  return {
    managerScore: ceo.managerScore.score,
    managerScoreBand: ceo.managerScore.bandLabel,
    p1Count: agents.summary.p1Issues,
    p2Count: agents.summary.p2Issues,
    p3Count: agents.summary.p3Issues,
    riskCount: riskMap.length,
    recommendedActionCount: recommendedActions.length,
    planSectionCount: dailyPlan.length,
    lastRunAt: director.lastRunAt,
  }
}

/** Ana montaj — Executive Director DTO üretir. */
export function assembleExecutiveDirectorResponse(
  director: DirectorContext,
): ExecutiveDirectorResponseDto {
  const dailyPlan = buildDailyPlan(director.agents, director.ceo)
  const priorityQueue = buildPriorityQueue(director.agents)
  const impactAnalysis = buildImpactAnalysis(director)
  const riskMap = buildRiskMap(director.agents, director.ceo)
  const recommendedActions = buildRecommendedActions(director.agents)
  const executiveBriefing = buildExecutiveBriefing(
    director,
    dailyPlan,
    riskMap,
    recommendedActions,
  )
  const executiveAgenda = buildExecutiveAgenda(dailyPlan, director)
  const summary = buildSummary(director, dailyPlan, riskMap, recommendedActions)

  return {
    summary,
    dailyPlan,
    priorityQueue,
    impactAnalysis,
    riskMap,
    executiveBriefing,
    executiveAgenda,
    recommendedActions,
    today: director.ctx.today,
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true },
  }
}
