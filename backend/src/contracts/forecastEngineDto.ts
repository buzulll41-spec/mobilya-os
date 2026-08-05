/**
 * Tahmin Motoru — "Bu gidişle ne olacak?"
 *
 * Tahminler açıklanabilir formüllerle üretilir (ML/kara kutu yok). Her projeksiyon
 * `basis` alanında nasıl hesaplandığını metin olarak taşır. Para alanları string
 * (2 ondalık), yüzdeler 0–100 (1 ondalık). Depo Katı satış kaynağı olarak görünmez.
 */

export type ForecastTrend = 'UP' | 'DOWN' | 'FLAT'
export type ForecastAlertSeverity = 'info' | 'warning' | 'critical'
export type ShipmentIntensity = 'LOW' | 'MEDIUM' | 'HIGH'
export type StaffStatus = 'HEDEF_ALTINDA' | 'HEDEFE_YAKIN' | 'HEDEF_USTU'

/** Doğrusal ay sonu projeksiyonu: current / elapsedDays × totalDays */
export type ForecastProjectionDto = {
  current: string
  projected: string
  dailyRate: string
  basis: string
}

export type ForecastSummaryDto = {
  monthRevenueProjected: string
  monthGrossProfitProjected: string
  monthRealizedProfitProjected: string
  monthCollectionProjected: string
  monthOpenBalanceProjected: string
  riskyReceivableProjected: string
  elapsedDays: number
  totalDays: number
  targetAchievementPct: number
}

export type ForecastRiskDto = {
  expectedRiskyReceivable: string
  shareOfOpenPct: number
  trend: ForecastTrend
}

export type ForecastShipmentDto = {
  expectedNextWeek: number
  expectedNextMonth: number
  dailyAvg30: number
  intensity: ShipmentIntensity
  trend: ForecastTrend
  basis: string
}

export type ForecastStaffRowDto = {
  key: string
  label: string
  currentSales: string
  target: string
  projectedSales: string
  achievementPct: number
  status: StaffStatus
}

export type ForecastSourceTrendDto = {
  key: string
  label: string
  revenue7: string
  revenue30: string
  revenue90: string
  pct7: number
  pct30: number
  trend: ForecastTrend
}

export type ForecastDataQualityTrendDto = {
  currentScore: number
  previousScore: number
  change: number
  trend: ForecastTrend
}

export type ForecastAlertDto = {
  severity: ForecastAlertSeverity
  message: string
}

export type ForecastFiltersEcho = {
  month: string | null
  salesPerson: string | null
  salesSourceType: string | null
  limitedView: boolean
}

export type ForecastEngineResponseDto = {
  summary: ForecastSummaryDto
  salesForecast: ForecastProjectionDto
  profitForecast: { gross: ForecastProjectionDto; realized: ForecastProjectionDto }
  collectionForecast: ForecastProjectionDto
  openBalanceForecast: ForecastProjectionDto
  riskForecast: ForecastRiskDto
  shipmentForecast: ForecastShipmentDto
  staffForecast: ForecastStaffRowDto[]
  sourceTrends: ForecastSourceTrendDto[]
  dataQualityTrend: ForecastDataQualityTrendDto
  alerts: ForecastAlertDto[]
  filters: ForecastFiltersEcho
  currency: string
  today: string
  generatedAt: string
}
