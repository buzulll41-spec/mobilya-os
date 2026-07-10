/**
 * Stratejik Karar Merkezi (Faz 15) — orta/uzun vadeli işletme analizi.
 * Depo Katı satış kaynağı olarak hiçbir çıktıda görünmez.
 */

export type StrategicTrend = 'UP' | 'DOWN' | 'FLAT'

export type RecommendationCategory =
  | 'GROWTH'
  | 'RISK'
  | 'SUPPLIER'
  | 'SALES'
  | 'OPERATIONS'
  | 'FINANCE'

export type StrategicIntelligenceSummaryDto = {
  companyHealthScore: number
  companyHealthBand: string
  topGrowthLabel: string | null
  topRiskLabel: string | null
  recommendationCount: number
  analysisMonth: string
  generatedAt: string
}

export type GrowthEntryDto = {
  key: string
  label: string
  currentRevenue: string
  previousRevenue: string
  changePct: number
  trend: StrategicTrend
}

export type GrowthAnalysisDto = {
  topGrowthSource: GrowthEntryDto | null
  topDecliningSource: GrowthEntryDto | null
  topGrowthCategory: GrowthEntryDto | null
  topDecliningCategory: GrowthEntryDto | null
  sourceTrends: GrowthEntryDto[]
  categoryTrends: GrowthEntryDto[]
}

export type ProductGroupDto = {
  key: string
  label: string
  revenue: string
  grossProfit: string
  profitMarginPct: number
  collected: string
  riskyReceivable: string
  strategicScore: number
  trend: StrategicTrend
}

export type ProductStrategyDto = {
  topProductGroups: ProductGroupDto[]
  weakProductGroups: ProductGroupDto[]
  recommendedFocusAreas: string[]
}

export type SupplierScoreDto = {
  key: string
  label: string
  revenue: string
  grossProfit: string
  openBalance: string
  profitMarginPct: number
  score: number
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH'
}

export type SupplierAnalysisDto = {
  bestSuppliers: SupplierScoreDto[]
  riskySuppliers: SupplierScoreDto[]
  supplierScoreboard: SupplierScoreDto[]
}

export type SalesPersonScoreDto = {
  key: string
  label: string
  revenue: string
  grossProfit: string
  collected: string
  openBalance: string
  achievementPct: number
  score: number
  status: string
}

export type SalesPersonAnalysisDto = {
  topSalesPeople: SalesPersonScoreDto[]
  needsImprovement: SalesPersonScoreDto[]
  salesScoreboard: SalesPersonScoreDto[]
}

export type RiskForecastItemDto = {
  id: string
  riskTitle: string
  horizonDays: number
  severity: 'CRITICAL' | 'WARNING' | 'INFO'
  description: string
  mitigation: string
}

export type RiskForecastDto = {
  horizonDays: number
  items: RiskForecastItemDto[]
}

export type HealthComponentDto = {
  id: string
  label: string
  score: number
  weight: number
  weighted: number
}

export type CompanyHealthDto = {
  score: number
  band: string
  breakdown: HealthComponentDto[]
  trend: StrategicTrend
  trendLabel: string
}

export type BoardBriefingDto = {
  headline: string
  biggestOpportunity: string
  biggestRisk: string
  recommendedActions: string[]
  nextQuarterFocus: string
}

export type StrategicRecommendationDto = {
  id: string
  category: RecommendationCategory
  title: string
  reason: string
  priority: 'HIGH' | 'MEDIUM' | 'LOW'
}

export type StrategicIntelligenceResponseDto = {
  summary: StrategicIntelligenceSummaryDto
  growthAnalysis: GrowthAnalysisDto
  profitabilityAnalysis: {
    monthRevenue: string
    monthGrossProfit: string
    profitMarginPct: number
    realizedProfit: string
    pendingProfit: string
    riskyReceivable: string
    mostProfitableSource: string | null
    mostProfitableSalesPerson: string | null
  }
  supplierAnalysis: SupplierAnalysisDto
  salesPersonAnalysis: SalesPersonAnalysisDto
  riskForecast: RiskForecastDto
  companyHealth: CompanyHealthDto
  boardBriefing: BoardBriefingDto
  recommendations: StrategicRecommendationDto[]
  today: string
  generatedAt: string
  meta: { depoKatiExcluded: true }
}
