/**
 * Mock İş Kuralları — backend varsayılan kural setinin aynası.
 */

const SEED = [
  { code: 'COLLECTION_HIGH_RISK_RATIO', name: 'Riskli Açık Bakiye Oranı', description: 'Açık bakiyenin bu oranı riskliyse kritik alarm üretilir.', category: 'COLLECTION', severity: 'CRITICAL', valueType: 'PERCENT', defaultValue: '25' },
  { code: 'COLLECTION_OVERDUE_DAYS', name: 'Tahsilat Gecikme Günü', description: 'Bu gün sayısını aşan gecikmiş tahsilatlar eskale edilir.', category: 'COLLECTION', severity: 'WARNING', valueType: 'NUMBER', defaultValue: '30' },
  { code: 'SHIPMENT_DELAY_WARNING', name: 'Sevk Gecikme Uyarısı', description: 'Bu sayıdan fazla geciken sevk WARNING üretir.', category: 'SHIPMENT', severity: 'WARNING', valueType: 'NUMBER', defaultValue: '5' },
  { code: 'SHIPMENT_DELAY_CRITICAL', name: 'Sevk Gecikme Kritik', description: 'Bu sayıdan fazla geciken sevk CRITICAL üretir.', category: 'SHIPMENT', severity: 'CRITICAL', valueType: 'NUMBER', defaultValue: '10' },
  { code: 'PROFITABILITY_DROP_WARNING', name: 'Kâr Düşüşü Eşiği', description: 'Kaynak kârı geçen aya göre bu yüzde kadar düşerse alarm üretilir.', category: 'PROFITABILITY', severity: 'WARNING', valueType: 'PERCENT', defaultValue: '15' },
  { code: 'PROFITABILITY_WAITING_PROFIT', name: 'Bekleyen Kâr Eşiği', description: 'Bekleyen kâr toplam brüt kârın bu yüzdesini aşarsa uyarı üretilir.', category: 'PROFITABILITY', severity: 'WARNING', valueType: 'PERCENT', defaultValue: '40' },
  { code: 'DATA_QUALITY_WARNING', name: 'Veri Kalitesi Uyarı', description: 'Ortalama veri kalite skoru bu değerin altına düşerse WARNING.', category: 'DATA_QUALITY', severity: 'WARNING', valueType: 'NUMBER', defaultValue: '90' },
  { code: 'DATA_QUALITY_CRITICAL', name: 'Veri Kalitesi Kritik', description: 'Ortalama veri kalite skoru bu değerin altına düşerse CRITICAL.', category: 'DATA_QUALITY', severity: 'CRITICAL', valueType: 'NUMBER', defaultValue: '80' },
  { code: 'ZERO_COST_CRITICAL', name: 'Sıfır Maliyet Kritik', description: 'Sıfır/eksik alış maliyeti kayıtları için kritik alarm üretilsin mi?', category: 'DATA_QUALITY', severity: 'CRITICAL', valueType: 'BOOLEAN', defaultValue: 'true' },
  { code: 'SALES_TARGET_WARNING', name: 'Satış Hedefi Alt Eşiği', description: 'Ay sonu ciro tahmini geçen ayın bu yüzdesinin altındaysa uyarı.', category: 'SALES', severity: 'WARNING', valueType: 'PERCENT', defaultValue: '90' },
  { code: 'SALES_TARGET_SUCCESS', name: 'Satış Hedefi Üst Eşiği', description: 'Ay sonu ciro tahmini geçen ayın bu yüzdesinin üstündeyse bilgi.', category: 'SALES', severity: 'INFO', valueType: 'PERCENT', defaultValue: '110' },
  { code: 'AUTO_CREATE_ZERO_COST_CASE', name: 'Otomatik Maliyet Vakası', description: 'ZERO_COST tespit edildiğinde otomasyon işi oluşturulsun mu?', category: 'AUTOMATION', severity: 'INFO', valueType: 'BOOLEAN', defaultValue: 'true' },
  { code: 'AUTO_CREATE_COLLECTION_CASE', name: 'Otomatik Tahsilat Vakası', description: 'Tahsilat riski tespit edildiğinde otomasyon işi oluşturulsun mu?', category: 'AUTOMATION', severity: 'INFO', valueType: 'BOOLEAN', defaultValue: 'true' },
  { code: 'AUTO_CREATE_SHIPMENT_CASE', name: 'Otomatik Sevk Vakası', description: 'Geciken sevk tespit edildiğinde otomasyon işi oluşturulsun mu?', category: 'AUTOMATION', severity: 'INFO', valueType: 'BOOLEAN', defaultValue: 'true' },
  { code: 'SUPPLIER_OPEN_SHARE_THRESHOLD', name: 'Tedarikçi Açık Pay Eşiği', description: 'Tek tedarikçide açık bakiye payı bu yüzdeyi aşarsa uyarı üretilir.', category: 'OPERATIONS', severity: 'WARNING', valueType: 'PERCENT', defaultValue: '30' },
  { code: 'COLLECTION_OVERDUE_WARN_COUNT', name: 'Gecikmiş Tahsilat Uyarı Sayısı', description: 'Bu sayıda veya üzerinde gecikmiş tahsilat siparişi varsa uyarı üretilir.', category: 'COLLECTION', severity: 'WARNING', valueType: 'NUMBER', defaultValue: '3' },
  { code: 'DATA_QUALITY_ROW_LIMIT', name: 'Veri Kalitesi Satır Limiti', description: 'Aksiyon merkezinde değerlendirilecek en kötü veri kalitesi satır sayısı.', category: 'DATA_QUALITY', severity: 'INFO', valueType: 'NUMBER', defaultValue: '50' },
]

const store = new Map()
const SEED_AT = '2026-05-01T08:00:00.000Z'

function buildRules() {
  return SEED.map((s) => {
    const ov = store.get(s.code) ?? {}
    return {
      id: s.code,
      code: s.code,
      name: s.name,
      description: s.description,
      category: s.category,
      severity: s.severity,
      valueType: s.valueType,
      isEnabled: ov.isEnabled ?? true,
      value: ov.value ?? s.defaultValue,
      createdAt: SEED_AT,
      updatedAt: ov.updatedAt ?? SEED_AT,
    }
  })
}

export function resetMockBusinessRuleStore() {
  store.clear()
}

export async function mockGetBusinessRules(query = {}) {
  let rules = buildRules()
  if (query.category) rules = rules.filter((r) => r.category === query.category.toUpperCase())
  if (query.q) {
    const fq = query.q.toLocaleLowerCase('tr')
    rules = rules.filter((r) => `${r.code} ${r.name}`.toLocaleLowerCase('tr').includes(fq))
  }
  const all = buildRules()
  return {
    summary: {
      totalRules: all.length,
      activeCount: all.filter((r) => r.isEnabled).length,
      inactiveCount: all.filter((r) => !r.isEnabled).length,
      criticalCount: all.filter((r) => r.severity === 'CRITICAL').length,
      lastUpdatedAt: SEED_AT,
    },
    rules,
    filters: { category: query.category ?? null, q: query.q ?? null, enabled: null },
    generatedAt: new Date().toISOString(),
  }
}

export async function mockGetBusinessRuleDetail(id) {
  const rule = buildRules().find((r) => r.id === id)
  if (!rule) {
    const err = new Error('Kural bulunamadı')
    err.status = 404
    throw err
  }
  return rule
}

export async function mockPatchBusinessRule(id, patch) {
  const existing = store.get(id) ?? {}
  const now = new Date().toISOString()
  store.set(id, {
    value: patch.value !== undefined ? String(patch.value) : existing.value,
    isEnabled: patch.isEnabled !== undefined ? patch.isEnabled : existing.isEnabled,
    updatedAt: now,
  })
  return mockGetBusinessRuleDetail(id)
}

export async function mockPostBusinessRuleTest(body) {
  const rule = await mockGetBusinessRuleDetail(body.code)
  const proposed = String(body.value)
  const cur = Number.parseFloat(proposed)
  const old = Number.parseFloat(rule.value)
  const delta = Number.isFinite(cur) && Number.isFinite(old) ? Math.round((old - cur) * 0.3) : 0
  const before = 31
  const after = Math.max(0, before - Math.abs(delta))
  return {
    ruleCode: body.code,
    proposedValue: proposed,
    currentValue: rule.value,
    metrics: [{ label: 'Etkilenen kayıt', before, after, delta: after - before }],
    advisoriesBefore: 12,
    advisoriesAfter: 12 + (after - before),
    actionsBefore: 28,
    actionsAfter: 28 + (after - before),
    automationJobsBefore: 18,
    automationJobsAfter: 18 + (after - before),
    casesBefore: 22,
    casesAfter: 22 + (after - before),
    depoKatiMentioned: false,
    generatedAt: new Date().toISOString(),
  }
}
