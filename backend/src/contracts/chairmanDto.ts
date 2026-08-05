/**
 * Otonom Şirket Başkanı (Faz 19) — CEO ve Kurulu denetimi, uzun vadeli vizyon.
 * Deterministik; LLM yok. Depo Katı satış kaynağı olarak görünmez.
 */

export type ChairmanDecision =
  | 'MAINTAIN_DIRECTION'
  | 'FOCUS_GROWTH'
  | 'FOCUS_PROFITABILITY'
  | 'FOCUS_COLLECTION'
  | 'FOCUS_DIGITALIZATION'
  | 'FOCUS_EXPANSION'
  | 'PREPARE_NEW_BRANCH'
  | 'STABILIZE_FIRST'

export type ChairmanThreatItemDto = {
  id: string
  title: string
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  horizon: '1Y' | '3Y' | '5Y'
  description: string
}

export type ChairmanOpportunityItemDto = {
  id: string
  title: string
  impact: string
  horizon: '1Y' | '3Y' | '5Y'
  description: string
}

export type AlignmentStatus = 'ALIGNED' | 'PARTIAL' | 'MISALIGNED'

export type AlignmentDto = {
  score: number
  status: AlignmentStatus
  summary: string
  details: string[]
}

export type ChairmanSummaryDto = {
  chairmanScore: number
  chairmanScoreBand: string
  chairmanDecision: ChairmanDecision
  ceoScore: number
  boardScore: number
  companyHealthScore: number
  sourcesRead: number
  generatedAt: string
}

export type ChairmanIntelligenceResponseDto = {
  summary: ChairmanSummaryDto
  chairmanScore: number
  chairmanDecision: ChairmanDecision
  chairmanReason: string[]
  oneYearPlan: string[]
  threeYearPlan: string[]
  fiveYearVision: string[]
  topThreats: ChairmanThreatItemDto[]
  topOpportunities: ChairmanOpportunityItemDto[]
  boardAlignment: AlignmentDto
  ceoAlignment: AlignmentDto
  today: string
  generatedAt: string
  meta: { depoKatiExcluded: true; sources: string[] }
}
