import type { SalesSourceBucketGroup } from '../constants/salesSourceBuckets.js'

/** Tek kırılım (kaynak/kat) satırı */
export type SalesSourceAnalyticsRowDto = {
  key: string
  label: string
  group: SalesSourceBucketGroup
  salesCount: number // satış kalemi adedi
  orderCount: number // ayrık sipariş adedi
  unitsSold: number // toplam adet (qtyOrdered)
  revenue: string // toplam ciro
  purchaseCost: string // toplam alış maliyeti
  profit: string // toplam kâr
  profitMarginPct: number // kâr % (0–100, 1 ondalık)
  collected: string // tahsil edilen (kalem oranına göre dağıtılmış)
  openBalance: string // açık bakiye (kalem oranına göre dağıtılmış)
  revenueSharePct: number // toplam cironun yüzde kaçı (0–100, 1 ondalık)
}

export type SalesSourceAnalyticsTotalsDto = {
  salesCount: number
  orderCount: number
  unitsSold: number
  revenue: string
  purchaseCost: string
  profit: string
  profitMarginPct: number
  collected: string
  openBalance: string
}

export type SalesSourceAnalyticsFiltersEcho = {
  from: string | null
  to: string | null
  salesPerson: string | null
  salesSourceType: string | null
  displayFloor: string | null
  externalSupplyType: string | null
  category: string | null
  supplierId: string | null
}

export type SalesSourceAnalyticsResponseDto = {
  rows: SalesSourceAnalyticsRowDto[]
  totals: SalesSourceAnalyticsTotalsDto
  filters: SalesSourceAnalyticsFiltersEcho
  currency: string
  generatedAt: string
}
