/** Mobilya üretim konfigürasyonu — kategori bazlı alan şeması */

export type ConfigFieldType = 'text' | 'select'

export type ConfigFieldDef = {
  key: string
  label: string
  type: ConfigFieldType
  options?: readonly string[]
  required?: boolean
  warnIfEmpty?: boolean
}

export type ConfigProfileId =
  | 'fabric'
  | 'tv_unit'
  | 'dining_table'
  | 'coffee_table'
  | 'wardrobe'
  | 'chest'
  | 'accessory'
  | 'generic'

export type ConfigurationContext = {
  category?: string
  productGroup?: string
  suiteType?: string
  title?: string
}

export const CORNER_DIRECTION_OPTIONS = ['Sağ köşe', 'Sol köşe', 'Modüler'] as const

const NOTE_FIELD: ConfigFieldDef = { key: 'note', label: 'Not', type: 'text' }

const FABRIC_CORE_FIELDS: ConfigFieldDef[] = [
  { key: 'fabricBrand', label: 'Kumaş firması', type: 'text', required: true },
  { key: 'bodyFabric', label: 'Gövde kumaşı', type: 'text' },
  { key: 'legColor', label: 'Ayak rengi', type: 'text' },
]

const SUMMARY_HIDDEN_LEGACY_KEYS = new Set<string>(['fabricCode', 'fabric'])

export type PillowRow = { fabric: string; qty: number }

export const PILLOWS_KEY = 'pillows'
export const LUMBAR_PILLOWS_KEY = 'lumbarPillows'

const STRUCTURED_CONFIG_KEYS = new Set<string>([PILLOWS_KEY, LUMBAR_PILLOWS_KEY])

const CORNER_FIELD: ConfigFieldDef = {
  key: 'cornerDirection',
  label: 'Yön',
  type: 'select',
  required: true,
  options: CORNER_DIRECTION_OPTIONS,
}

export const CONFIG_PROFILES: Record<
  ConfigProfileId,
  { id: ConfigProfileId; label: string; fields: ConfigFieldDef[] }
> = {
  fabric: {
    id: 'fabric',
    label: 'Kumaşlı ürün',
    fields: [...FABRIC_CORE_FIELDS, NOTE_FIELD],
  },
  tv_unit: {
    id: 'tv_unit',
    label: 'TV ünitesi',
    fields: [
      { key: 'bodyColor', label: 'Gövde rengi', type: 'text' },
      { key: 'doorColor', label: 'Kapak rengi', type: 'text' },
      { key: 'finishDetail', label: 'Ahşap / lake / cam detayı', type: 'text' },
      { key: 'dimensions', label: 'Ölçü', type: 'text' },
      NOTE_FIELD,
    ],
  },
  dining_table: {
    id: 'dining_table',
    label: 'Yemek masası',
    fields: [
      { key: 'topType', label: 'Tabla tipi', type: 'text' },
      { key: 'legColor', label: 'Ayak rengi', type: 'text' },
      { key: 'dimensions', label: 'Ölçü', type: 'text' },
      NOTE_FIELD,
    ],
  },
  coffee_table: {
    id: 'coffee_table',
    label: 'Sehpa',
    fields: [
      { key: 'topColor', label: 'Üst tabla rengi', type: 'text' },
      { key: 'legColor', label: 'Ayak rengi', type: 'text' },
      { key: 'topMaterial', label: 'Mermer / ahşap seçeneği', type: 'text' },
      { key: 'dimensions', label: 'Ölçü', type: 'text' },
      NOTE_FIELD,
    ],
  },
  wardrobe: {
    id: 'wardrobe',
    label: 'Gardırop / Dolap',
    fields: [
      { key: 'doorColor', label: 'Kapak rengi', type: 'text' },
      { key: 'doorType', label: 'Kapak tipi', type: 'text' },
      { key: 'panelMaterial', label: 'Cam / ahşap seçeneği', type: 'text' },
      { key: 'handleType', label: 'Kulp tipi', type: 'text' },
      { key: 'handleColor', label: 'Kulp rengi', type: 'text' },
      { key: 'dimensions', label: 'Ölçü', type: 'text' },
      NOTE_FIELD,
    ],
  },
  chest: {
    id: 'chest',
    label: 'Şifonyer / Komodin',
    fields: [
      { key: 'bodyColor', label: 'Gövde rengi', type: 'text' },
      { key: 'handleSpec', label: 'Kulplar', type: 'text' },
      NOTE_FIELD,
    ],
  },
  accessory: {
    id: 'accessory',
    label: 'Aksesuar / dekor',
    fields: [NOTE_FIELD],
  },
  generic: {
    id: 'generic',
    label: 'Genel',
    fields: [NOTE_FIELD],
  },
}

const LEGACY_CONFIG_KEYS = [
  'fabricCollection',
  'fabricCode',
  'fabric',
  'frameColor',
  'headboardFabric',
  'baseFabric',
  'storageInfo',
  'topMaterial',
  'pillowFabric',
  'lumbarPillow',
] as const

export const ALL_CONFIGURATION_KEYS = new Set(
  [
    ...Object.values(CONFIG_PROFILES).flatMap((p) => p.fields.map((f) => f.key)),
    CORNER_FIELD.key,
    ...STRUCTURED_CONFIG_KEYS,
    ...LEGACY_CONFIG_KEYS,
  ],
)

export function trimConfigText(value: string): string {
  return value.replace(/^\s+/, '').replace(/\s+$/, '').slice(0, 500)
}

export function parsePillowRows(raw: unknown): PillowRow[] {
  if (!Array.isArray(raw)) return []
  const out: PillowRow[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const fabric = typeof o.fabric === 'string' ? trimConfigText(o.fabric) : ''
    const qtyRaw = typeof o.qty === 'number' ? o.qty : Number(o.qty)
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 0
    if (fabric && qty > 0) out.push({ fabric, qty })
  }
  return out
}

export function sanitizePillowRows(rows: unknown): PillowRow[] {
  return parsePillowRows(rows)
}

function norm(s: string | undefined): string {
  return (s ?? '')
    .trim()
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

function contextBlob(ctx: ConfigurationContext): string {
  return [ctx.title, ctx.productGroup, ctx.category, ctx.suiteType].map(norm).join(' ')
}

export function isAccessoryProduct(ctx: ConfigurationContext): boolean {
  const blob = contextBlob(ctx)
  return /aksesuar|dekor|vazo|ayna|tablo\b|lamba|kilim|yastik(?!\s*kuma)|minder\b/.test(blob)
}

export function isFabricProduct(ctx: ConfigurationContext): boolean {
  if (isAccessoryProduct(ctx)) return false
  const blob = contextBlob(ctx)
  if (/tv\s*unite|tv unit|\btv\b/.test(blob)) return false
  if (/gardiro|dolap|sifonyer|komodin|sehpa|yemek masasi/.test(blob)) return false

  const fabricHints = [
    'koltuk',
    'oturma',
    'kose',
    'berjer',
    'sandalye',
    'baza',
    'puf',
    'baslik',
    'karyola',
    'bench',
    'bank',
    'kumasli',
    'kumas',
  ]
  if (fabricHints.some((h) => blob.includes(h))) return true

  const st = norm(ctx.suiteType)
  if (st === 'koltuk' || st === 'modul' || st === 'takim') {
    if (!/masa|sehpa|gardiro|dolap|tv/.test(blob)) return true
  }
  return false
}

export function requiresCornerDirection(ctx: ConfigurationContext): boolean {
  const blob = contextBlob(ctx)
  if (!isFabricProduct(ctx)) return false
  if (/kose|corner|l koltuk|kose takim|kose koltuk/.test(blob)) return true
  const st = norm(ctx.suiteType)
  if ((st === 'koltuk' || st === 'modul' || st === 'takim') && /kose|l koltuk/.test(blob)) return true
  return false
}

export function resolveConfigurationProfile(ctx: ConfigurationContext): ConfigProfileId {
  const cat = norm(ctx.category ?? ctx.productGroup)
  const title = norm(ctx.title)

  if (isAccessoryProduct(ctx)) return 'accessory'
  if (cat.includes('sehpa') || title.includes('sehpa')) return 'coffee_table'
  if (cat.includes('tv') || title.includes('tv unitesi') || title.includes('tv unit')) return 'tv_unit'
  if (title.includes('sifonyer') || title.includes('komodin') || cat.includes('sifonyer') || cat.includes('komodin')) {
    return 'chest'
  }
  if (
    cat.includes('gardiro') ||
    cat.includes('dolap') ||
    title.includes('gardiro') ||
    (title.includes('dolap') && !title.includes('sehpa'))
  ) {
    return 'wardrobe'
  }
  if (
    (title.includes('yemek masasi') || (cat.includes('yemek') && title.includes('masa'))) &&
    !title.includes('sandalye')
  ) {
    return 'dining_table'
  }
  if (isFabricProduct(ctx)) return 'fabric'
  if (title.includes('masa') && !title.includes('sehpa') && !title.includes('yemek')) return 'dining_table'
  return 'generic'
}

export function getFieldsForContext(ctx: ConfigurationContext): ConfigFieldDef[] {
  const profileId = resolveConfigurationProfile(ctx)
  const fields = CONFIG_PROFILES[profileId].fields.map((f) => ({ ...f }))
  if (profileId === 'fabric' && requiresCornerDirection(ctx)) {
    const noteIdx = fields.findIndex((f) => f.key === 'note')
    const insertAt = noteIdx >= 0 ? noteIdx : fields.length
    fields.splice(insertAt, 0, { ...CORNER_FIELD })
  }
  return fields
}

export type LineConfiguration = Record<string, string | PillowRow[]>

export function migrateLegacyPillows(configuration: LineConfiguration): LineConfiguration {
  const c: LineConfiguration = { ...configuration }
  const pillowFabric = c.pillowFabric
  if (typeof pillowFabric === 'string' && pillowFabric.trim() && !c.pillows) {
    c.pillows = [{ fabric: trimConfigText(pillowFabric), qty: 1 }]
  }
  const lumbarPillow = c.lumbarPillow
  if (typeof lumbarPillow === 'string' && lumbarPillow.trim() && !c.lumbarPillows) {
    c.lumbarPillows = [{ fabric: trimConfigText(lumbarPillow), qty: 1 }]
  }
  return c
}

export function stripLegacyPillowKeys(configuration: LineConfiguration): LineConfiguration {
  const c: LineConfiguration = { ...configuration }
  delete c.pillowFabric
  delete c.lumbarPillow
  return c
}

function preserveStoredOptionalKeys(out: LineConfiguration, source: LineConfiguration): void {
  const collection =
    typeof source.fabricCollection === 'string' ? trimConfigText(source.fabricCollection) : ''
  if (collection) out.fabricCollection = collection
  const code = typeof source.fabricCode === 'string' ? trimConfigText(source.fabricCode) : ''
  if (code) out.fabricCode = code
}

export function sanitizeConfigurationForContext(
  ctx: ConfigurationContext,
  configuration: LineConfiguration | undefined,
): LineConfiguration {
  if (!configuration) return {}
  const allowed = new Set(getFieldsForContext(ctx).map((f) => f.key))
  const migrated = migrateLegacyPillows({ ...configuration })
  const out: LineConfiguration = {}
  for (const [k, v] of Object.entries(migrated)) {
    if (STRUCTURED_CONFIG_KEYS.has(k)) {
      if (resolveConfigurationProfile(ctx) === 'fabric') {
        const rows = sanitizePillowRows(v)
        if (rows.length) out[k] = rows
      }
      continue
    }
    if (!allowed.has(k)) continue
    if (typeof v === 'string') {
      const t = trimConfigText(v)
      if (t) out[k] = t
    }
  }
  preserveStoredOptionalKeys(out, migrated)
  return stripLegacyPillowKeys(out)
}

function normalizeConfigurationForDisplay(configuration: LineConfiguration): LineConfiguration {
  const c = migrateLegacyPillows({ ...configuration })
  if (typeof c.fabric === 'string' && c.fabric && !c.fabricCode) c.fabricCode = c.fabric
  if (typeof c.headboardFabric === 'string' && c.headboardFabric && !c.bodyFabric) {
    c.bodyFabric = c.headboardFabric
  }
  if (typeof c.baseFabric === 'string' && c.baseFabric && !c.bodyFabric) c.bodyFabric = c.baseFabric
  return c
}

export function parseLineConfiguration(raw: unknown): LineConfiguration | undefined {
  if (raw == null) return undefined
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined
  const out: LineConfiguration = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!ALL_CONFIGURATION_KEYS.has(k)) continue
    if (STRUCTURED_CONFIG_KEYS.has(k)) {
      const rows = parsePillowRows(v)
      if (rows.length) out[k] = rows
      continue
    }
    if (typeof v !== 'string') continue
    const t = trimConfigText(v)
    if (t) out[k] = t
  }
  const migrated = migrateLegacyPillows(out)
  const cleaned = stripLegacyPillowKeys(migrated)
  return Object.keys(cleaned).length > 0 ? cleaned : undefined
}

export type ConfigurationValidation = {
  errors: string[]
  warnings: string[]
}

export function validateLineConfiguration(
  ctx: ConfigurationContext,
  configuration: LineConfiguration | undefined,
): ConfigurationValidation {
  const errors: string[] = []
  const warnings: string[] = []
  const profileId = resolveConfigurationProfile(ctx)
  const fields = getFieldsForContext(ctx)
  const config = configuration ?? {}

  for (const field of fields) {
    if (field.key === 'pillowFabric' || field.key === 'lumbarPillow') continue
    const raw = config[field.key]
    const val = typeof raw === 'string' ? trimConfigText(raw) : ''
    if (field.required && !val) {
      errors.push(`${field.label} zorunludur.`)
    }
    if (field.warnIfEmpty && !val) {
      warnings.push(`${field.label} girilmedi — üretim öncesi kontrol edin.`)
    }
  }

  if (profileId === 'fabric' && requiresCornerDirection(ctx)) {
    const dir = typeof config.cornerDirection === 'string' ? trimConfigText(config.cornerDirection) : ''
    const allowed = new Set<string>(CORNER_DIRECTION_OPTIONS)
    if (!dir || !allowed.has(dir)) {
      errors.push('Köşe / L koltuk için yön seçimi zorunludur (Sağ köşe, Sol köşe veya Modüler).')
    }
  }

  if (profileId === 'fabric') {
    for (const row of parsePillowRows(config.pillows)) {
      if (!row.fabric) errors.push('Kırlent satırında kumaş kodu zorunludur.')
    }
    for (const row of parsePillowRows(config.lumbarPillows)) {
      if (!row.fabric) errors.push('Bel kırlenti satırında kumaş kodu zorunludur.')
    }
  }

  return { errors, warnings }
}

function fieldSummaryLabel(key: string, fallback: string): string {
  if (key === 'fabricCollection') return 'Seri'
  if (key === 'fabricBrand') return 'Kumaş firması'
  if (key === 'fabricCode') return 'Kumaş kodu / renk'
  if (key === 'bodyFabric') return 'Gövde'
  if (key === 'legColor') return 'Ayak'
  if (key === 'cornerDirection') return 'Yön'
  return fallback
}

function appendPillowBlock(lines: string[], title: string, rows: unknown): void {
  const parsed = parsePillowRows(rows)
  if (!parsed.length) return
  lines.push(`${title}:`)
  for (const row of parsed) {
    lines.push(`• ${row.fabric} x${row.qty}`)
  }
}

export function formatConfigurationLines(
  ctx: ConfigurationContext,
  configuration: LineConfiguration | undefined,
): string[] {
  if (!configuration) return []
  const fields = getFieldsForContext(ctx)
  const config = normalizeConfigurationForDisplay(configuration)
  const lines: string[] = []
  const seen = new Set<string>()
  for (const field of fields) {
    if (field.key === 'pillowFabric' || field.key === 'lumbarPillow') continue
    const raw = config[field.key]
    const val = typeof raw === 'string' ? trimConfigText(raw) : ''
    if (!val || seen.has(field.key)) continue
    seen.add(field.key)
    lines.push(`${fieldSummaryLabel(field.key, field.label)}: ${val}`)
  }
  appendPillowBlock(lines, 'Kırlentler', config.pillows)
  appendPillowBlock(lines, 'Bel kırlenti', config.lumbarPillows)
  for (const legacyKey of LEGACY_CONFIG_KEYS) {
    if (
      seen.has(legacyKey) ||
      legacyKey === 'pillowFabric' ||
      legacyKey === 'lumbarPillow' ||
      SUMMARY_HIDDEN_LEGACY_KEYS.has(legacyKey)
    ) {
      continue
    }
    const raw = config[legacyKey]
    const val = typeof raw === 'string' ? trimConfigText(raw) : ''
    if (!val) continue
    const label =
      legacyKey === 'fabricCollection'
        ? 'Seri'
        : legacyKey === 'headboardFabric'
          ? 'Başlık kumaşı'
          : legacyKey === 'baseFabric'
            ? 'Baza kumaşı'
            : legacyKey
    lines.push(`${label}: ${val}`)
  }
  return lines
}
