/**
 * Otonom Şirket Simülasyonu (Faz 16) — Dijital Şirket İkizi.
 * Gerçek veri değiştirilmez; tüm senaryolar sanal çalışır.
 * Depo Katı satış kaynağı olarak görünmez.
 */

export type SimulationScenarioId =
  | 'COLLECTION_DROP'
  | 'NEW_STORE'
  | 'NEW_SALES_STAFF'
  | 'NEW_VEHICLE'
  | 'EXTERNAL_SUPPLY_INCREASE'
  | 'BEST_CASE'
  | 'WORST_CASE'

export type SimulationInputDto = {
  collectionChangePercent?: number
  newStoreRevenue?: number
  additionalSalesStaff?: number
  additionalVehicles?: number
  externalSupplyIncreasePercent?: number
}

export type SimulationSnapshotDto = {
  companyHealthScore: number
  companyHealthBand: string
  riskScore: number
  revenue: string
  profit: string
  openBalance: string
  riskyReceivable: string
  delayedShipments: number
  dataQualityScore: number
}

export type ScenarioResultDto = {
  scenarioId: SimulationScenarioId
  scenarioName: string
  before: SimulationSnapshotDto
  after: SimulationSnapshotDto
  recommendation: string
  basis: string
}

export type CompanySimulationSummaryDto = {
  baselineHealthScore: number
  scenarioCount: number
  bestCaseHealthAfter: number
  worstCaseHealthAfter: number
  lastRunAt: string | null
}

export type CompanySimulationResponseDto = {
  summary: CompanySimulationSummaryDto
  baseline: SimulationSnapshotDto
  scenarios: ScenarioResultDto[]
  bestCase: ScenarioResultDto
  worstCase: ScenarioResultDto
  managementAdvice: string
  input: SimulationInputDto
  today: string
  generatedAt: string
  meta: { depoKatiExcluded: true; virtualOnly: true }
}
