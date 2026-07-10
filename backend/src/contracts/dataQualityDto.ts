/**
 * Veri Kalitesi Merkezi — satış kalemi snapshot kalitesini kayıt bazında raporlar.
 * Amaç: veri bozulmasını rapor aşamasında değil, oluştuğu anda görünür kılmak.
 */

export type DataQualityIssueCode =
  | 'UNKNOWN_SOURCE'
  | 'MISSING_DISPLAY_FLOOR'
  | 'MISSING_EXTERNAL_SUPPLY_TYPE'
  | 'ZERO_COST'
  | 'SOURCE_CONFLICT'

export type DataQualitySeverity = 'warning' | 'critical'

export type DataQualityIssueDto = {
  code: DataQualityIssueCode
  label: string
  severity: DataQualitySeverity
  penalty: number
}

export type DataQualityStatus = 'OK' | 'PROBLEM'

export type DataQualityRowDto = {
  orderLineId: string
  orderId: string
  orderDate: string // ISO yyyy-mm-dd
  customerName: string
  productTitle: string
  salesPerson: string | null
  soldSalesSourceType: string | null
  soldSalesSourceTypeLabel: string
  soldDisplayFloor: string | null
  soldDisplayFloorLabel: string | null
  soldExternalSupplyType: string | null
  soldExternalSupplyTypeLabel: string | null
  soldUnitCost: string
  qualityScore: number // 0–100
  status: DataQualityStatus
  issues: DataQualityIssueDto[]
}

export type DataQualityTotalsDto = {
  totalOrders: number // ayrık sipariş adedi
  totalRecords: number // değerlendirilen satış kalemi adedi
  cleanRecords: number
  problemRecords: number
  unknownCount: number
  missingCostCount: number
  averageQualityScore: number // 0–100, 1 ondalık
}

export type DataQualityIssueCategoryDto = {
  code: DataQualityIssueCode
  label: string
  severity: DataQualitySeverity
  count: number
}

export type DataQualityFiltersEcho = {
  from: string | null
  to: string | null
  salesPerson: string | null
  status: string | null
  issueCode: string | null
  q: string | null
}

export type DataQualityResponseDto = {
  rows: DataQualityRowDto[]
  totals: DataQualityTotalsDto
  issueCategories: DataQualityIssueCategoryDto[]
  filters: DataQualityFiltersEcho
  currency: string
  generatedAt: string
}
