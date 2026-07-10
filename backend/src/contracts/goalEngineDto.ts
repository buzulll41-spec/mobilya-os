/**
 * Otonom Hedef Motoru (Faz 29) — optimizasyon → hedef.
 * Deterministik; LLM yok. Depo Katı hiçbir çıktıda görünmez.
 */

export type GoalCategory =
  | 'COLLECTION'
  | 'PROFITABILITY'
  | 'SALES'
  | 'SHIPMENT'
  | 'DATA_QUALITY'
  | 'RISK'
  | 'SUPPLIER'
  | 'OPERATIONS'

export type GoalStatus = 'ON_TRACK' | 'AT_RISK' | 'FAILED' | 'ACHIEVED'

export type GoalPriority = 'P1' | 'P2' | 'P3'

export type GoalTrend = 'UP' | 'DOWN' | 'FLAT'

export type GoalDecision =
  | 'FOCUS_COLLECTION'
  | 'FOCUS_PROFIT'
  | 'FOCUS_GROWTH'
  | 'FOCUS_SHIPMENT'
  | 'FOCUS_DATA_QUALITY'
  | 'FOCUS_RISK_REDUCTION'
  | 'BALANCED_GOALS'

export type ActiveGoalDto = {
  id: string
  title: string
  category: GoalCategory
  priority: GoalPriority
  currentValue: string
  targetValue: string
  progressPercent: number
  status: GoalStatus
  reason: string
}

export type GoalProgressDto = {
  goalId: string
  startValue: string
  currentValue: string
  targetValue: string
  progressPercent: number
  estimatedCompletion: string
  trend: GoalTrend
}

export type GoalRiskDto = {
  id: string
  severity: 'HIGH' | 'MEDIUM' | 'LOW'
  goal: string
  reason: string
  impact: number
  recommendation: string
}

export type GoalOpportunityDto = {
  id: string
  goal: string
  opportunity: string
  expectedImpact: number
  recommendation: string
}

export type GoalEngineResponseDto = {
  goalScore: number
  goalDecision: GoalDecision
  activeGoals: ActiveGoalDto[]
  goalProgress: GoalProgressDto[]
  goalRisks: GoalRiskDto[]
  goalOpportunities: GoalOpportunityDto[]
  managementBriefing: string[]
  today: string
  generatedAt: string
  meta: { depoKatiExcluded: true }
}

export type GoalUpdateResponseDto = {
  status: 'UPDATED'
  goalId: string
  progressPercent: number
  updatedAt: string
  meta: { depoKatiExcluded: true }
}
