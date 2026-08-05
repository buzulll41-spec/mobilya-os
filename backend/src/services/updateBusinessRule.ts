/**
 * İş kuralı güncelleme — değer ve etkin/pasif durumu.
 */

import { AppHttpError } from '../errors/apiError.js'
import {
  BUSINESS_RULE_CODES,
  type BusinessRuleCode,
  type BusinessRuleDto,
} from '../contracts/businessRuleDto.js'
import { applyRulePatch, getBusinessRuleByCode } from './businessRulesEngine.js'

export type BusinessRulePatch = {
  value?: string
  isEnabled?: boolean
}

function isRuleCode(v: string): v is BusinessRuleCode {
  return (BUSINESS_RULE_CODES as string[]).includes(v)
}

export function assertValidBusinessRulePatch(body: unknown): BusinessRulePatch {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const raw = body as Record<string, unknown>
  const patch: BusinessRulePatch = {}
  if (raw.value !== undefined && raw.value !== null) {
    patch.value = typeof raw.value === 'string' || typeof raw.value === 'number' || typeof raw.value === 'boolean'
      ? String(raw.value)
      : ''
    if (!patch.value.trim()) {
      throw new AppHttpError(400, 'Kural değeri boş olamaz', 'Bad Request', { value: 'Required' })
    }
  }
  if (raw.isEnabled !== undefined) {
    if (typeof raw.isEnabled !== 'boolean') {
      throw new AppHttpError(400, 'isEnabled boolean olmalı', 'Bad Request')
    }
    patch.isEnabled = raw.isEnabled
  }
  if (patch.value === undefined && patch.isEnabled === undefined) {
    throw new AppHttpError(400, 'Güncellenecek alan yok (value veya isEnabled)', 'Bad Request')
  }
  return patch
}

export function updateBusinessRule(id: string, patch: BusinessRulePatch): BusinessRuleDto {
  const code = typeof id === 'string' ? id.trim() : ''
  if (!code || !isRuleCode(code)) {
    throw new AppHttpError(400, 'Geçersiz kural kodu', 'Bad Request', { id: 'Invalid' })
  }
  return applyRulePatch(code, patch)
}

export function getBusinessRuleDetail(id: string): BusinessRuleDto {
  const code = typeof id === 'string' ? id.trim() : ''
  if (!code || !isRuleCode(code)) {
    throw new AppHttpError(400, 'Geçersiz kural kodu', 'Bad Request', { id: 'Invalid' })
  }
  const rule = getBusinessRuleByCode(code)
  if (!rule) {
    throw new AppHttpError(404, 'Kural bulunamadı', 'Not Found', { id: code })
  }
  return rule
}
