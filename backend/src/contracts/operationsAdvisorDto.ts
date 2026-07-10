/**
 * AI Operasyon Danışmanı — "Bugün neye müdahale etmeliyim?"
 *
 * Bu modül LLM kullanmaz. Tavsiyeler açıklanabilir, kural tabanlı ve deterministik
 * üretilir. Her tavsiye dört soruya cevap verir: Sorun nedir? Neden oluşuyor?
 * Etkisi nedir? Ne yapılmalı? Her tavsiyenin sayısal dayanağı `evidence` içinde taşınır.
 *
 * Para alanları string (2 ondalık), yüzdeler 1 ondalık. Depo Katı satış kaynağı
 * olarak hiçbir tavsiyede görünmez (kaynak verisi Faz 5A motorundan gelir).
 */

export type AdvisorySeverity = 'INFO' | 'WARNING' | 'CRITICAL'

export type AdvisoryCategory =
  | 'PROFITABILITY'
  | 'COLLECTION'
  | 'SHIPMENT'
  | 'DATA_QUALITY'
  | 'RISK'
  | 'SALES'
  | 'SUPPLIER'
  | 'OPERATIONS'

export type AdvisoryEvidence = Record<string, string | number | boolean | null>

export type AdvisoryDto = {
  id: string
  severity: AdvisorySeverity
  category: AdvisoryCategory
  title: string
  reason: string
  impact: string
  recommendation: string
  evidence: AdvisoryEvidence
  createdAt: string
}

export type OperationsAdvisorSummaryDto = {
  totalAdvisories: number
  criticalCount: number
  warningCount: number
  infoCount: number
  /** En kritik konunun kategorisi + başlığı (yoksa null). */
  topIssue: { category: AdvisoryCategory; title: string; severity: AdvisorySeverity } | null
}

export type OperationsAdvisorFiltersEcho = {
  category: string | null
  severity: string | null
  date: string | null
  q: string | null
  salesPerson: string | null
  limitedView: boolean
}

export type OperationsAdvisorResponseDto = {
  summary: OperationsAdvisorSummaryDto
  advisories: AdvisoryDto[]
  filters: OperationsAdvisorFiltersEcho
  currency: string
  today: string
  generatedAt: string
}
