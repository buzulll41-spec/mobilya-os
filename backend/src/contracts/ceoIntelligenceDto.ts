/**
 * Otonom CEO (Faz 18) — tüm fazları sentezleyerek nihai CEO kararı.
 * Deterministik; LLM yok. Depo Katı satış kaynağı olarak görünmez.
 */

export type CeoDecision =
  | 'FOCUS_COLLECTION'
  | 'FOCUS_GROWTH'
  | 'FOCUS_PROFITABILITY'
  | 'FOCUS_OPERATIONS'
  | 'FOCUS_RISK_REDUCTION'
  | 'OPEN_NEW_STORE'
  | 'DELAY_NEW_STORE'
  | 'HIRE_SALES_TEAM'
  | 'INCREASE_CAPACITY'
  | 'OPTIMIZE_SUPPLIERS'

export type CeoProblemItemDto = {
  id: string
  title: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  description: string
}

export type CeoOpportunityItemDto = {
  id: string
  title: string
  impact: string
  description: string
}

export type CeoIntelligenceSummaryDto = {
  ceoScore: number
  ceoScoreBand: string
  ceoDecision: CeoDecision
  companyHealthScore: number
  boardScore: number
  boardDecision: string
  sourcesRead: number
  generatedAt: string
}

export type CeoIntelligenceResponseDto = {
  summary: CeoIntelligenceSummaryDto
  ceoScore: number
  ceoDecision: CeoDecision
  ceoReason: string[]
  topProblems: CeoProblemItemDto[]
  topOpportunities: CeoOpportunityItemDto[]
  todayActions: string[]
  next30Days: string[]
  next90Days: string[]
  today: string
  generatedAt: string
  meta: { depoKatiExcluded: true; sources: string[] }
}
