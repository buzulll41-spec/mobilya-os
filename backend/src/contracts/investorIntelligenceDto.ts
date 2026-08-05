/**

 * Yatırımcı Merkezi (Faz 21) — yatırım analizi, SWOT, karar sentezi.

 * Deterministik; LLM yok. Depo Katı satış kaynağı olarak görünmez.

 */



export type CompanyRating = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'WEAK' | 'CRITICAL'



export type InvestmentDecision = 'STRONG_BUY' | 'BUY' | 'WATCH' | 'AVOID' | 'CRITICAL'



export type NewStoreReadiness = 'READY' | 'PARTIAL' | 'NOT_READY'



export type GrowthPotential = 'LOW' | 'MEDIUM' | 'HIGH'



export type FinancingNeed = 'LOW' | 'MEDIUM' | 'HIGH'



export type InvestmentRisk = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'



export type ValuationTrend = 'DECLINING' | 'STABLE' | 'GROWING' | 'FAST_GROWING'



export type InvestorScoreComponentsDto = {

  profitabilityScore: number

  growthScore: number

  collectionScore: number

  riskScore: number

  cashFlowScore: number

  stabilityScore: number

}



export type NewStoreReadinessDto = {

  status: NewStoreReadiness

  reasons: string[]

}



export type InvestorRecommendationDto = {

  id: string

  priority: number

  title: string

  category: string

  description: string

}



export type InvestorSummaryDto = {

  investorScore: number

  investorScoreBand: string

  companyRating: CompanyRating

  investmentDecision: InvestmentDecision

  newStoreReadiness: NewStoreReadiness

  growthPotential: GrowthPotential

  financingNeed: FinancingNeed

  investmentRisk: InvestmentRisk

  valuationTrend: ValuationTrend

  futureScore: number

  chairmanScore: number

  ceoScore: number

  companyHealthScore: number

  sourcesRead: number

  generatedAt: string

}



export type InvestorIntelligenceResponseDto = {

  summary: InvestorSummaryDto

  investorScore: number

  scoreComponents: InvestorScoreComponentsDto

  companyRating: CompanyRating

  investmentDecision: InvestmentDecision

  newStoreReadiness: NewStoreReadinessDto

  growthPotential: GrowthPotential

  financingNeed: FinancingNeed

  investmentRisk: InvestmentRisk

  valuationTrend: ValuationTrend

  strengths: string[]

  weaknesses: string[]

  opportunities: string[]

  threats: string[]

  investorBriefing: string[]

  topRecommendations: InvestorRecommendationDto[]

  today: string

  generatedAt: string

  meta: { depoKatiExcluded: true; sources: string[] }

}


