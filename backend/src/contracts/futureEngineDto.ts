/**
 * Kurumsal Gelecek Motoru (Faz 20) — 30/90/180/365 gün senaryo simülasyonu.
 * Deterministik; LLM yok. Depo Katı satış kaynağı olarak görünmez.
 */

export type FutureScenarioId =
  | 'BASELINE'
  | 'AGGRESSIVE_GROWTH'
  | 'DEFENSIVE'
  | 'COLLECTION_FIRST'
  | 'EXPANSION'
  | 'CRISIS'

export type ScenarioVerdict = 'RECOMMENDED' | 'NEUTRAL' | 'AVOID'

export type FutureHorizonDays = 30 | 90 | 180 | 365

export type FutureMetricsDto = {
  revenue: string
  profit: string
  cashFlow: string
  openBalance: string
  risk: number
  shipmentLoad: number
  staffLoad: number
  supplierRisk: number
  collectionRate: number
  companyHealth: number
}

export type FutureHorizonProjectionDto = {
  days: FutureHorizonDays
  metrics: FutureMetricsDto
}

export type FutureScenarioDto = {
  scenarioId: FutureScenarioId
  scenarioName: string
  verdict: ScenarioVerdict
  verdictLabel: string
  basis: string
  horizons: FutureHorizonProjectionDto[]
}

export type FutureEngineSummaryDto = {
  futureScore: number
  futureScoreBand: string
  scenarioCount: number
  bestScenarioId: FutureScenarioId
  worstScenarioId: FutureScenarioId
  chairmanDecision: string
  ceoDecision: string
  horizons: FutureHorizonDays[]
  generatedAt: string
}

export type FutureEngineResponseDto = {
  summary: FutureEngineSummaryDto
  futureScore: number
  scenarios: FutureScenarioDto[]
  bestScenario: FutureScenarioDto
  worstScenario: FutureScenarioDto
  managementBriefing: string[]
  today: string
  generatedAt: string
  meta: { depoKatiExcluded: true; virtualOnly: true; sources: string[] }
}
