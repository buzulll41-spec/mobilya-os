/**
 * Yönetici Kokpiti V2 — "Bugün mağazada durum ne? Para kazanıyor muyuz, nerede risk var?"
 *
 * Bu DTO mevcut rapor motorlarının (kârlılık, veri kalitesi, sipariş projeksiyonu)
 * çıktısını tek ekranda birleştirir. Para alanları string (2 ondalık), yüzdeler 0–100.
 */

export type CockpitRiskLevel = 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type CockpitAlertSeverity = 'info' | 'warning' | 'critical'

export type CockpitSummaryDto = {
  todaySales: string
  monthRevenue: string
  monthGrossProfit: string
  avgProfitMarginPct: number
  realizedProfit: string
  pendingProfit: string
  riskyReceivable: string
  dataQualityScore: number
}

export type CockpitTodayOperationsDto = {
  ordersToday: number
  collectionToday: string
  readyToShipToday: number
  delayedShipments: number
  serviceTicketsToday: number
  criticalRiskOrders: number
}

export type CockpitHighlightDto = {
  key: string
  label: string
  value: string
  metric: string
}

export type CockpitProfitabilityHighlightsDto = {
  topProfitSource: CockpitHighlightDto | null
  topProfitSalesPerson: CockpitHighlightDto | null
  topProfitCategory: CockpitHighlightDto | null
  riskiestSource: CockpitHighlightDto | null
  lowestMarginSource: CockpitHighlightDto | null
  highestOpenBalanceSource: CockpitHighlightDto | null
}

export type CockpitDataQualityHighlightsDto = {
  unknownCount: number
  missingCostCount: number
  missingDisplayFloorCount: number
  missingExternalSupplyCount: number
  criticalIssueCount: number
  averageQualityScore: number
}

export type CockpitCriticalOrderDto = {
  riskLevel: CockpitRiskLevel
  orderId: string
  orderNumber: string
  customer: string
  totalAmount: string
  openBalance: string
  grossProfit: string
  shipmentStatus: string
  paymentStatus: string
  salesPerson: string | null
  problems: string[]
}

export type CockpitPendingShipmentDto = {
  orderId: string
  orderNumber: string
  customer: string
  plannedShipDate: string | null
  dayDiff: number | null
  readiness: string
  missingItems: number
  crew: string | null
  riskLevel: CockpitRiskLevel
}

export type CockpitAlertDto = {
  severity: CockpitAlertSeverity
  message: string
}

export type CockpitFiltersEcho = {
  from: string | null
  to: string | null
  month: string | null
  year: string | null
  salesPerson: string | null
  riskLevel: string | null
  paymentStatus: string | null
  shipmentStatus: string | null
  salesSourceType: string | null
}

export type ManagerCockpitResponseDto = {
  summary: CockpitSummaryDto
  todayOperations: CockpitTodayOperationsDto
  profitabilityHighlights: CockpitProfitabilityHighlightsDto
  dataQualityHighlights: CockpitDataQualityHighlightsDto
  criticalOrders: CockpitCriticalOrderDto[]
  pendingShipments: CockpitPendingShipmentDto[]
  managerAlerts: CockpitAlertDto[]
  filters: CockpitFiltersEcho
  currency: string
  today: string
  generatedAt: string
}
