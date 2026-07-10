/**
 * Kârlılık Analitiği — "Nereden para kazanıyorum?" sorusuna cevap verir.
 *
 * Tüm para alanları string (2 ondalık). Yüzdeler 0–100, 1 ondalık.
 * Ürün kârlılığı YALNIZCA satış kalemi snapshot alanlarından hesaplanır
 * (soldUnitCost / soldSalesSourceType / soldDisplayFloor / soldExternalSupplyType);
 * ürün kartının güncel hali rapora etki etmez (snapshot immutability).
 */

export type ProfitabilityGroupBy =
  | 'source'
  | 'salesPerson'
  | 'supplier'
  | 'category'
  | 'brand'
  | 'product'
  | 'month'
  | 'year'

export type ProfitabilityRiskLevel = 'NONE' | 'MEDIUM' | 'HIGH'

export type ProfitabilityMonthPointDto = {
  month: string // yyyy-mm
  revenue: string
  grossProfit: string
}

export type ProfitabilityRowDetailDto = {
  months: ProfitabilityMonthPointDto[] // son 12 ay
  totalOrders: number
  totalGrossProfit: string
  avgMarginPct: number
  biggestOrder: { orderId: string; revenue: string } | null
  riskiestOrder: { orderId: string; openBalance: string; riskLevel: ProfitabilityRiskLevel } | null
  topProductByUnits: { title: string; units: number } | null
  topProductByProfit: { title: string; grossProfit: string } | null
}

export type ProfitabilityRowDto = {
  key: string
  label: string
  groupBy: ProfitabilityGroupBy
  salesCount: number
  orderCount: number
  unitsSold: number
  revenue: string
  purchaseCost: string
  grossProfit: string
  profitMarginPct: number
  collected: string
  openBalance: string
  riskyReceivable: string
  realizedProfit: string
  pendingProfit: string
  revenueSharePct: number
  profitSharePct: number
  detail: ProfitabilityRowDetailDto
}

export type ProfitabilityTotalsDto = {
  salesCount: number
  orderCount: number
  unitsSold: number
  revenue: string
  purchaseCost: string
  grossProfit: string
  profitMarginPct: number
  collected: string
  openBalance: string
  riskyReceivable: string
  realizedProfit: string
  pendingProfit: string
}

export type ProfitabilityTopEntryDto = {
  key: string
  label: string
  revenue: string
  grossProfit: string
}

export type ProfitabilitySummaryDto = {
  revenue: string
  grossProfit: string
  profitMarginPct: number
  realizedProfit: string
  pendingProfit: string
  riskyReceivable: string
  mostProfitableSource: ProfitabilityTopEntryDto | null
  mostProfitableSalesPerson: ProfitabilityTopEntryDto | null
}

export type ProfitabilityBreakdownsDto = {
  source: ProfitabilityTopEntryDto[]
  salesPerson: ProfitabilityTopEntryDto[]
}

export type ProfitabilityFiltersEcho = {
  from: string | null
  to: string | null
  salesPerson: string | null
  salesSourceType: string | null
  category: string | null
  brand: string | null
  supplierId: string | null
  productId: string | null
  customer: string | null
  paymentStatus: string | null
  riskLevel: string | null
}

export type ProfitabilityAnalyticsResponseDto = {
  groupBy: ProfitabilityGroupBy
  rows: ProfitabilityRowDto[]
  summary: ProfitabilitySummaryDto
  totals: ProfitabilityTotalsDto
  breakdowns: ProfitabilityBreakdownsDto
  filters: ProfitabilityFiltersEcho
  currency: string
  generatedAt: string
}
