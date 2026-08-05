/**
 * Otonom İşletme Beyni (Faz 24) — tüm yönetim katmanlarının nihai karar sentezi.
 * Deterministik; LLM yok. Depo Katı satış kaynağı olarak görünmez.
 */

export type PrimaryDecision =
  | 'COLLECTION_FIRST'
  | 'AGGRESSIVE_GROWTH'
  | 'CONTROLLED_GROWTH'
  | 'DEFENSIVE_MODE'
  | 'STORE_EXPANSION'
  | 'SUPPLIER_RESTRUCTURE'
  | 'COST_REDUCTION'
  | 'PROFITABILITY_RECOVERY'
  | 'INVESTMENT_WINDOW'
  | 'WAIT_AND_MONITOR'

export type BusinessBrainScoresDto = {
  brainScore: number
  operationsScore: number
  financeScore: number
  growthScore: number
  riskScore: number
  futureScore: number
  investmentScore: number
}

export type BusinessBrainResponseDto = BusinessBrainScoresDto & {
  primaryDecision: PrimaryDecision
  todayActions: string[]
  plan30Days: string[]
  plan90Days: string[]
  plan365Days: string[]
  topRisks: string[]
  topOpportunities: string[]
  managementBriefing: string[]
  today: string
  generatedAt: string
  meta: { depoKatiExcluded: true; sources: string[] }
}
