/**
 * İş Kuralları Merkezi — Business Rule DTO'ları.
 *
 * Kurallar veri modeli + ekran üzerinden yönetilir (visual builder yok).
 * Eşikler `businessRulesEngine` üzerinden tüm modüllere servis edilir.
 * Depo Katı satış kaynağı kural setinde yer almaz.
 */

export type BusinessRuleCategory =
  | 'COLLECTION'
  | 'SHIPMENT'
  | 'PROFITABILITY'
  | 'DATA_QUALITY'
  | 'RISK'
  | 'AUTOMATION'
  | 'OPERATIONS'
  | 'SALES'

export type BusinessRuleValueType = 'NUMBER' | 'PERCENT' | 'BOOLEAN' | 'TEXT' | 'ENUM'

export type BusinessRuleSeverity = 'INFO' | 'WARNING' | 'CRITICAL'

/** Stabil kural kodu — motor ve modüller bu anahtarları kullanır. */
export type BusinessRuleCode =
  | 'COLLECTION_HIGH_RISK_RATIO'
  | 'COLLECTION_OVERDUE_DAYS'
  | 'SHIPMENT_DELAY_WARNING'
  | 'SHIPMENT_DELAY_CRITICAL'
  | 'PROFITABILITY_DROP_WARNING'
  | 'PROFITABILITY_WAITING_PROFIT'
  | 'DATA_QUALITY_WARNING'
  | 'DATA_QUALITY_CRITICAL'
  | 'ZERO_COST_CRITICAL'
  | 'SALES_TARGET_WARNING'
  | 'SALES_TARGET_SUCCESS'
  | 'AUTO_CREATE_ZERO_COST_CASE'
  | 'AUTO_CREATE_COLLECTION_CASE'
  | 'AUTO_CREATE_SHIPMENT_CASE'
  | 'SUPPLIER_OPEN_SHARE_THRESHOLD'
  | 'COLLECTION_OVERDUE_WARN_COUNT'
  | 'DATA_QUALITY_ROW_LIMIT'

export const BUSINESS_RULE_CODES: BusinessRuleCode[] = [
  'COLLECTION_HIGH_RISK_RATIO',
  'COLLECTION_OVERDUE_DAYS',
  'SHIPMENT_DELAY_WARNING',
  'SHIPMENT_DELAY_CRITICAL',
  'PROFITABILITY_DROP_WARNING',
  'PROFITABILITY_WAITING_PROFIT',
  'DATA_QUALITY_WARNING',
  'DATA_QUALITY_CRITICAL',
  'ZERO_COST_CRITICAL',
  'SALES_TARGET_WARNING',
  'SALES_TARGET_SUCCESS',
  'AUTO_CREATE_ZERO_COST_CASE',
  'AUTO_CREATE_COLLECTION_CASE',
  'AUTO_CREATE_SHIPMENT_CASE',
  'SUPPLIER_OPEN_SHARE_THRESHOLD',
  'COLLECTION_OVERDUE_WARN_COUNT',
  'DATA_QUALITY_ROW_LIMIT',
]

export type BusinessRuleDto = {
  id: string
  code: BusinessRuleCode
  name: string
  description: string
  category: BusinessRuleCategory
  severity: BusinessRuleSeverity
  valueType: BusinessRuleValueType
  isEnabled: boolean
  /** Saklanan değer — tip dönüşümü motor tarafından yapılır. */
  value: string
  createdAt: string
  updatedAt: string
}

export type BusinessRulesSummaryDto = {
  totalRules: number
  activeCount: number
  inactiveCount: number
  criticalCount: number
  lastUpdatedAt: string | null
}

export type BusinessRulesFiltersEcho = {
  category: string | null
  q: string | null
  enabled: boolean | null
}

export type BusinessRulesResponseDto = {
  summary: BusinessRulesSummaryDto
  rules: BusinessRuleDto[]
  filters: BusinessRulesFiltersEcho
  generatedAt: string
}

/** Rule Tester — simülasyon çıktısı. */
export type RuleSimulationMetricDto = {
  label: string
  before: number
  after: number
  delta: number
}

export type RuleSimulationDto = {
  ruleCode: BusinessRuleCode
  proposedValue: string
  currentValue: string
  metrics: RuleSimulationMetricDto[]
  /** Etkilenen modül özetleri. */
  advisoriesBefore: number
  advisoriesAfter: number
  actionsBefore: number
  actionsAfter: number
  automationJobsBefore: number
  automationJobsAfter: number
  casesBefore: number
  casesAfter: number
  /** Depo Katı içermediğinin kanıtı. */
  depoKatiMentioned: boolean
  generatedAt: string
}

export type RuleTestRequestDto = {
  code: BusinessRuleCode
  value: string
}
