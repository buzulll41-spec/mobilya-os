/**
 * İş Kuralları Motoru — tüm modüllerin eşikleri buradan okur.
 *
 * Varsayılan kurallar kod içinde tanımlıdır; PATCH ile yapılan değişiklikler
 * süreç içi (in-memory) store'da tutulur. Simülasyon geçici override kullanır.
 */

import type {
  BusinessRuleCategory,
  BusinessRuleCode,
  BusinessRuleDto,
  BusinessRuleSeverity,
  BusinessRuleValueType,
} from '../contracts/businessRuleDto.js'

type RuleDef = {
  code: BusinessRuleCode
  name: string
  description: string
  category: BusinessRuleCategory
  severity: BusinessRuleSeverity
  valueType: BusinessRuleValueType
  defaultValue: string
}

const RULE_SEED: RuleDef[] = [
  {
    code: 'COLLECTION_HIGH_RISK_RATIO',
    name: 'Riskli Açık Bakiye Oranı',
    description: 'Açık bakiyenin bu oranı riskliyse kritik alarm üretilir.',
    category: 'COLLECTION',
    severity: 'CRITICAL',
    valueType: 'PERCENT',
    defaultValue: '25',
  },
  {
    code: 'COLLECTION_OVERDUE_DAYS',
    name: 'Tahsilat Gecikme Günü',
    description: 'Bu gün sayısını aşan gecikmiş tahsilatlar eskale edilir.',
    category: 'COLLECTION',
    severity: 'WARNING',
    valueType: 'NUMBER',
    defaultValue: '30',
  },
  {
    code: 'SHIPMENT_DELAY_WARNING',
    name: 'Sevk Gecikme Uyarısı',
    description: 'Bu sayıdan fazla geciken sevk WARNING üretir.',
    category: 'SHIPMENT',
    severity: 'WARNING',
    valueType: 'NUMBER',
    defaultValue: '5',
  },
  {
    code: 'SHIPMENT_DELAY_CRITICAL',
    name: 'Sevk Gecikme Kritik',
    description: 'Bu sayıdan fazla geciken sevk CRITICAL üretir.',
    category: 'SHIPMENT',
    severity: 'CRITICAL',
    valueType: 'NUMBER',
    defaultValue: '10',
  },
  {
    code: 'PROFITABILITY_DROP_WARNING',
    name: 'Kâr Düşüşü Eşiği',
    description: 'Kaynak kârı geçen aya göre bu yüzde kadar düşerse alarm üretilir.',
    category: 'PROFITABILITY',
    severity: 'WARNING',
    valueType: 'PERCENT',
    defaultValue: '15',
  },
  {
    code: 'PROFITABILITY_WAITING_PROFIT',
    name: 'Bekleyen Kâr Eşiği',
    description: 'Bekleyen kâr toplam brüt kârın bu yüzdesini aşarsa uyarı üretilir.',
    category: 'PROFITABILITY',
    severity: 'WARNING',
    valueType: 'PERCENT',
    defaultValue: '40',
  },
  {
    code: 'DATA_QUALITY_WARNING',
    name: 'Veri Kalitesi Uyarı',
    description: 'Ortalama veri kalite skoru bu değerin altına düşerse WARNING.',
    category: 'DATA_QUALITY',
    severity: 'WARNING',
    valueType: 'NUMBER',
    defaultValue: '90',
  },
  {
    code: 'DATA_QUALITY_CRITICAL',
    name: 'Veri Kalitesi Kritik',
    description: 'Ortalama veri kalite skoru bu değerin altına düşerse CRITICAL.',
    category: 'DATA_QUALITY',
    severity: 'CRITICAL',
    valueType: 'NUMBER',
    defaultValue: '80',
  },
  {
    code: 'ZERO_COST_CRITICAL',
    name: 'Sıfır Maliyet Kritik',
    description: 'Sıfır/eksik alış maliyeti kayıtları için kritik alarm üretilsin mi?',
    category: 'DATA_QUALITY',
    severity: 'CRITICAL',
    valueType: 'BOOLEAN',
    defaultValue: 'true',
  },
  {
    code: 'SALES_TARGET_WARNING',
    name: 'Satış Hedefi Alt Eşiği',
    description: 'Ay sonu ciro tahmini geçen ayın bu yüzdesinin altındaysa uyarı.',
    category: 'SALES',
    severity: 'WARNING',
    valueType: 'PERCENT',
    defaultValue: '90',
  },
  {
    code: 'SALES_TARGET_SUCCESS',
    name: 'Satış Hedefi Üst Eşiği',
    description: 'Ay sonu ciro tahmini geçen ayın bu yüzdesinin üstündeyse bilgi.',
    category: 'SALES',
    severity: 'INFO',
    valueType: 'PERCENT',
    defaultValue: '110',
  },
  {
    code: 'AUTO_CREATE_ZERO_COST_CASE',
    name: 'Otomatik Maliyet Vakası',
    description: 'ZERO_COST tespit edildiğinde otomasyon işi oluşturulsun mu?',
    category: 'AUTOMATION',
    severity: 'INFO',
    valueType: 'BOOLEAN',
    defaultValue: 'true',
  },
  {
    code: 'AUTO_CREATE_COLLECTION_CASE',
    name: 'Otomatik Tahsilat Vakası',
    description: 'Tahsilat riski tespit edildiğinde otomasyon işi oluşturulsun mu?',
    category: 'AUTOMATION',
    severity: 'INFO',
    valueType: 'BOOLEAN',
    defaultValue: 'true',
  },
  {
    code: 'AUTO_CREATE_SHIPMENT_CASE',
    name: 'Otomatik Sevk Vakası',
    description: 'Geciken sevk tespit edildiğinde otomasyon işi oluşturulsun mu?',
    category: 'AUTOMATION',
    severity: 'INFO',
    valueType: 'BOOLEAN',
    defaultValue: 'true',
  },
  {
    code: 'SUPPLIER_OPEN_SHARE_THRESHOLD',
    name: 'Tedarikçi Açık Pay Eşiği',
    description: 'Tek tedarikçide açık bakiye payı bu yüzdeyi aşarsa uyarı üretilir.',
    category: 'OPERATIONS',
    severity: 'WARNING',
    valueType: 'PERCENT',
    defaultValue: '30',
  },
  {
    code: 'COLLECTION_OVERDUE_WARN_COUNT',
    name: 'Gecikmiş Tahsilat Uyarı Sayısı',
    description: 'Bu sayıda veya üzerinde gecikmiş tahsilat siparişi varsa uyarı üretilir.',
    category: 'COLLECTION',
    severity: 'WARNING',
    valueType: 'NUMBER',
    defaultValue: '3',
  },
  {
    code: 'DATA_QUALITY_ROW_LIMIT',
    name: 'Veri Kalitesi Satır Limiti',
    description: 'Aksiyon merkezinde değerlendirilecek en kötü veri kalitesi satır sayısı.',
    category: 'DATA_QUALITY',
    severity: 'INFO',
    valueType: 'NUMBER',
    defaultValue: '50',
  },
]

const SEED_AT = '2026-05-01T08:00:00.000Z'

type RuleOverride = { value?: string; isEnabled?: boolean; updatedAt: string }
const ruleStore = new Map<BusinessRuleCode, RuleOverride>()
let simulationOverlay: Map<BusinessRuleCode, string> | null = null

export function resetBusinessRuleStore(): void {
  ruleStore.clear()
  simulationOverlay = null
}

export function setSimulationOverlay(overlay: Map<BusinessRuleCode, string> | null): void {
  simulationOverlay = overlay
}

function effectiveValue(code: BusinessRuleCode, def: RuleDef): string {
  if (simulationOverlay?.has(code)) return simulationOverlay.get(code)!
  const ov = ruleStore.get(code)
  if (ov?.value !== undefined) return ov.value
  return def.defaultValue
}

function effectiveEnabled(code: BusinessRuleCode, _def: RuleDef): boolean {
  const ov = ruleStore.get(code)
  if (ov?.isEnabled !== undefined) return ov.isEnabled
  return true
}

export function buildRuleDto(def: RuleDef): BusinessRuleDto {
  const ov = ruleStore.get(def.code)
  return {
    id: def.code,
    code: def.code,
    name: def.name,
    description: def.description,
    category: def.category,
    severity: def.severity,
    valueType: def.valueType,
    isEnabled: effectiveEnabled(def.code, def),
    value: effectiveValue(def.code, def),
    createdAt: SEED_AT,
    updatedAt: ov?.updatedAt ?? SEED_AT,
  }
}

export function getAllRuleDefinitions(): RuleDef[] {
  return RULE_SEED
}

export function getAllBusinessRules(): BusinessRuleDto[] {
  return RULE_SEED.map(buildRuleDto)
}

export function getBusinessRuleByCode(code: BusinessRuleCode): BusinessRuleDto | null {
  const def = RULE_SEED.find((r) => r.code === code)
  return def ? buildRuleDto(def) : null
}

export function getRuleStoreOverrides(): Map<BusinessRuleCode, RuleOverride> {
  return new Map(ruleStore)
}

export function applyRulePatch(
  code: BusinessRuleCode,
  patch: { value?: string; isEnabled?: boolean },
): BusinessRuleDto {
  const def = RULE_SEED.find((r) => r.code === code)
  if (!def) throw new Error(`Unknown rule: ${code}`)
  const existing = ruleStore.get(code)
  const now = new Date().toISOString()
  ruleStore.set(code, {
    value: patch.value !== undefined ? patch.value : existing?.value,
    isEnabled: patch.isEnabled !== undefined ? patch.isEnabled : existing?.isEnabled,
    updatedAt: now,
  })
  return buildRuleDto(def)
}

function parseNum(code: BusinessRuleCode, fallback: number): number {
  const def = RULE_SEED.find((r) => r.code === code)
  if (!def || !effectiveEnabled(code, def)) return fallback
  const raw = effectiveValue(code, def)
  const n = Number.parseFloat(raw)
  return Number.isFinite(n) ? n : fallback
}

function parseBool(code: BusinessRuleCode, fallback: boolean): boolean {
  const def = RULE_SEED.find((r) => r.code === code)
  if (!def || !effectiveEnabled(code, def)) return false
  const raw = effectiveValue(code, def).toLowerCase()
  if (raw === 'true' || raw === '1' || raw === 'yes') return true
  if (raw === 'false' || raw === '0' || raw === 'no') return false
  return fallback
}

/** Yüzde kuralı (0–100 aralığı varsayılır). */
export function rulePercent(code: BusinessRuleCode, fallback: number): number {
  return parseNum(code, fallback)
}

/** Sayısal kural. */
export function ruleNumber(code: BusinessRuleCode, fallback: number): number {
  return parseNum(code, fallback)
}

/** Boolean kural. */
export function ruleBoolean(code: BusinessRuleCode, fallback: boolean): boolean {
  return parseBool(code, fallback)
}

/** Kural etkin mi? */
export function ruleEnabled(code: BusinessRuleCode): boolean {
  const def = RULE_SEED.find((r) => r.code === code)
  return def ? effectiveEnabled(code, def) : false
}
