/**
 * İş Kuralları listesi ve özeti.
 */

import type {
  BusinessRuleDto,
  BusinessRulesResponseDto,
  BusinessRulesSummaryDto,
} from '../contracts/businessRuleDto.js'
import { getAllBusinessRules } from './businessRulesEngine.js'

export type BusinessRulesQuery = {
  category?: string
  q?: string
  enabled?: string
}

function trimOrUndef(v?: string): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

function buildSummary(rules: BusinessRuleDto[]): BusinessRulesSummaryDto {
  const active = rules.filter((r) => r.isEnabled)
  const critical = rules.filter((r) => r.severity === 'CRITICAL')
  const lastUpdatedAt =
    rules.length > 0
      ? rules.reduce((max, r) => (r.updatedAt > max ? r.updatedAt : max), rules[0].updatedAt)
      : null
  return {
    totalRules: rules.length,
    activeCount: active.length,
    inactiveCount: rules.length - active.length,
    criticalCount: critical.length,
    lastUpdatedAt,
  }
}

export function getBusinessRules(query: BusinessRulesQuery = {}): BusinessRulesResponseDto {
  const fCategory = trimOrUndef(query.category)?.toUpperCase()
  const fq = trimOrUndef(query.q)?.toLocaleLowerCase('tr')
  const fEnabled =
    query.enabled === 'true' || query.enabled === '1'
      ? true
      : query.enabled === 'false' || query.enabled === '0'
        ? false
        : null

  let rules = getAllBusinessRules()
  if (fCategory) rules = rules.filter((r) => r.category === fCategory)
  if (fEnabled !== null) rules = rules.filter((r) => r.isEnabled === fEnabled)
  if (fq) {
    rules = rules.filter((r) =>
      `${r.code} ${r.name} ${r.description} ${r.category}`
        .toLocaleLowerCase('tr')
        .includes(fq),
    )
  }

  rules = [...rules].sort((a, b) => a.code.localeCompare(b.code))

  return {
    summary: buildSummary(getAllBusinessRules()),
    rules,
    filters: { category: fCategory ?? null, q: fq ?? null, enabled: fEnabled },
    generatedAt: new Date().toISOString(),
  }
}
