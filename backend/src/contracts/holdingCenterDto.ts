/**
 * Holding Yönetim Merkezi (Faz 22) — portföy sentezi, sermaye tahsisi, karar.
 * Deterministik; LLM yok. Depo Katı satış kaynağı olarak görünmez.
 */

export type HoldingCompanyId = 'EVTREND' | 'MONESKO' | 'USTANET' | 'ATLAS_CONNECT' | 'MOBILYA_OS'

export type HoldingDecision = 'INVEST' | 'GROW' | 'MAINTAIN' | 'REDUCE' | 'EXIT'

export type HoldingCompanyDto = {
  id: HoldingCompanyId
  name: string
  sector: string
  companyScore: number
  companyHealth: number
  riskScore: number
  growthScore: number
  profitabilityScore: number
  revenueTl: number
  investmentRank: number
}

export type CapitalAllocationDto = {
  companyId: HoldingCompanyId
  companyName: string
  percentage: number
}

export type CompanyRankingDto = {
  companyId: HoldingCompanyId
  companyName: string
  rank: number
  score: number
}

export type HoldingSummaryDto = {
  holdingScore: number
  holdingScoreBand: string
  holdingDecision: HoldingDecision
  bestCompany: string
  worstCompany: string
  companyCount: number
  capitalAllocationTotal: number
  generatedAt: string
}

export type HoldingCenterResponseDto = {
  summary: HoldingSummaryDto
  holdingScore: number
  holdingDecision: HoldingDecision
  companies: HoldingCompanyDto[]
  capitalAllocation: CapitalAllocationDto[]
  growthRanking: CompanyRankingDto[]
  riskRanking: CompanyRankingDto[]
  profitabilityRanking: CompanyRankingDto[]
  investmentRanking: CompanyRankingDto[]
  bestCompany: string
  worstCompany: string
  holdingOpportunities: string[]
  holdingRisks: string[]
  holdingBriefing: string[]
  fiveYearVision: string[]
  today: string
  generatedAt: string
  meta: { depoKatiExcluded: true; sources: string[] }
}
