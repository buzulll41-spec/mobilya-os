/**
 * AI Operasyon Direktörü (Faz 14) — deterministik executive director engine.
 * Depo Katı satış kaynağı olarak hiçbir çıktıda görünmez.
 */

export type DirectorPriorityLevel = 'P1' | 'P2' | 'P3'

export type DirectorRiskSeverity = 'CRITICAL' | 'WARNING' | 'INFO'

export type ExecutiveDirectorSummaryDto = {
  managerScore: number
  managerScoreBand: string
  p1Count: number
  p2Count: number
  p3Count: number
  riskCount: number
  recommendedActionCount: number
  planSectionCount: number
  lastRunAt: string | null
}

export type DailyPlanItemDto = {
  id: string
  title: string
  detail: string
  priority: DirectorPriorityLevel
  metric?: string
}

export type DailyPlanSectionDto = {
  id: string
  category: string
  categoryLabel: string
  items: DailyPlanItemDto[]
}

export type PriorityQueueItemDto = {
  id: string
  priority: DirectorPriorityLevel
  title: string
  reason: string
  sourceModule: string
  category: string
}

export type ImpactMetricDto = {
  label: string
  before: string | number
  after: string | number
  delta: string
  direction: 'UP' | 'DOWN' | 'NEUTRAL'
}

export type ImpactAnalysisItemDto = {
  id: string
  actionTitle: string
  actionDescription: string
  metrics: ImpactMetricDto[]
}

export type RiskMapItemDto = {
  id: string
  riskTitle: string
  severity: DirectorRiskSeverity
  impact: string
  suggestedAction: string
}

export type ExecutiveAgendaSlotDto = {
  timeRange: string
  focus: string
  description: string
}

export type ExecutiveBriefingDto = {
  headline: string
  criticalTopics: string[]
  todayPlan: string[]
  risks: string[]
  recommendedActions: string[]
}

export type RecommendedActionDto = {
  id: string
  title: string
  reason: string
  priority: DirectorPriorityLevel
  deepLinkPage?: string
}

export type ExecutiveDirectorResponseDto = {
  summary: ExecutiveDirectorSummaryDto
  dailyPlan: DailyPlanSectionDto[]
  priorityQueue: PriorityQueueItemDto[]
  impactAnalysis: ImpactAnalysisItemDto[]
  riskMap: RiskMapItemDto[]
  executiveBriefing: ExecutiveBriefingDto
  executiveAgenda: ExecutiveAgendaSlotDto[]
  recommendedActions: RecommendedActionDto[]
  today: string
  generatedAt: string
  meta: { depoKatiExcluded: true }
}
