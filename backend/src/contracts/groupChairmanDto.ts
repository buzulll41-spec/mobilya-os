/**
 * Otonom Holding Başkanı (Faz 23) — grup stratejik karar sentezi.
 * Deterministik; LLM yok. Depo Katı satış kaynağı olarak görünmez.
 */

import type { HoldingCompanyId } from './holdingCenterDto.js'

export type GroupDecision =
  | 'AGGRESSIVE_GROWTH'
  | 'CONTROLLED_GROWTH'
  | 'MAINTAIN'
  | 'RESTRUCTURE'
  | 'DEFENSIVE'
  | 'CRISIS'

export type CapitalStrategy = 'INVEST' | 'BALANCE' | 'PROTECT' | 'CUT_COSTS'

export type CompanyChairmanDecision = 'INVEST' | 'GROW' | 'MAINTAIN' | 'REDUCE' | 'EXIT'

export type CompanyDecisionDto = {
  companyId: HoldingCompanyId
  companyName: string
  decision: CompanyChairmanDecision
  reason: string
}

export type StrategicActionDto = {
  priority: number
  action: string
  horizon: '1Y' | '3Y' | '5Y'
}

export type CapitalAllocationItemDto = {
  companyId: HoldingCompanyId
  companyName: string
  percentage: number
}

export type AlignmentAnalysisDto = {
  ceoAlignment: number
  chairmanAlignment: number
  investorAlignment: number
  holdingAlignment: number
  overallAlignment: number
  summary: string
}

export type GroupChairmanSummaryDto = {
  groupChairmanScore: number
  groupChairmanScoreBand: string
  groupDecision: GroupDecision
  groupHealth: number
  capitalStrategy: CapitalStrategy
  companyCount: number
  capitalAllocationTotal: number
  generatedAt: string
}

export type GroupChairmanResponseDto = {
  summary: GroupChairmanSummaryDto
  groupChairmanScore: number
  groupDecision: GroupDecision
  groupHealth: number
  capitalStrategy: CapitalStrategy
  companyDecisions: CompanyDecisionDto[]
  oneYearPlan: string[]
  threeYearPlan: string[]
  fiveYearPlan: string[]
  groupThreats: string[]
  groupOpportunities: string[]
  strategicActions: StrategicActionDto[]
  recommendedCapitalAllocation: CapitalAllocationItemDto[]
  chairmanBriefing: string[]
  alignmentAnalysis: AlignmentAnalysisDto
  today: string
  generatedAt: string
  meta: { depoKatiExcluded: true; sources: string[] }
}
