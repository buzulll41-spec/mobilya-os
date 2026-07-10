/**
 * Otonom Kurumsal Kumanda Merkezi (Faz 30) — Faz 1-29 yönetim katmanı sentezi.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

export type CommandDecision = 'FOCUS_COLLECTION' | 'FOCUS_GROWTH' | 'BALANCED_MODE'

export type TodayActionDto = {
  id: string
  priority: 'P1' | 'P2' | 'P3'
  source: string
  action: string
}

export type CriticalRiskDto = {
  id: string
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'WARNING' | 'INFO'
  source: string
  title: string
  recommendation: string
}

export type OpportunityDto = {
  id: string
  source: string
  title: string
  impact: number
  recommendation: string
}

export type GoalStatusSummaryDto = {
  total: number
  atRisk: number
  achieved: number
}

export type LearningStrategySummaryDto = {
  strategy: string
  successRate: number
  impactScore: number
}

export type LearningSummaryDto = {
  topSuccessful: LearningStrategySummaryDto[]
  bottomFailed: LearningStrategySummaryDto[]
}

export type OptimizationSummaryDto = {
  strategyChanges: number
  agentChanges: number
  topStrategyChange: string | null
  topAgentChange: string | null
}

export type OperationsSummaryDto = {
  openCases: number
  criticalCases: number
  pendingTasks: number
  automationQueue: number
}

export type EnterpriseCommandCenterResponseDto = {
  companyHealthScore: number
  todayActions: TodayActionDto[]
  criticalRisks: CriticalRiskDto[]
  opportunities: OpportunityDto[]
  goalStatus: GoalStatusSummaryDto
  learningSummary: LearningSummaryDto
  optimizationSummary: OptimizationSummaryDto
  operationsSummary: OperationsSummaryDto
  managementBriefing: string[]
  commandDecision: CommandDecision
  today: string
  generatedAt: string
  currency: string
  meta: { depoKatiExcluded: true }
}
