/** Mobilya üretim konfigürasyonu — kategori bazlı alan şeması (client) */

/** @typedef {'text' | 'select'} ConfigFieldType */
/** @typedef {{ key: string, label: string, type: ConfigFieldType, options?: string[], required?: boolean, warnIfEmpty?: boolean }} ConfigFieldDef */
/** @typedef {'fabric' | 'tv_unit' | 'dining_table' | 'coffee_table' | 'wardrobe' | 'chest' | 'accessory' | 'generic'} ConfigProfileId */
/** @typedef {{ category?: string, productGroup?: string, suiteType?: string, title?: string }} ConfigurationContext */
/** @typedef {{ fabric: string, qty: number }} PillowRow */
/** @typedef {Record<string, string | PillowRow[]>} LineConfiguration */

export const PILLOWS_KEY = 'pillows'
export const LUMBAR_PILLOWS_KEY = 'lumbarPillows'

const STRUCTURED_CONFIG_KEYS = new Set([PILLOWS_KEY, LUMBAR_PILLOWS_KEY])

/** Köşe / L koltuk — zorunlu yön seçenekleri */
export const CORNER_DIRECTION_OPTIONS = ['Sağ köşe', 'Sol köşe', 'Modüler']

const NOTE_FIELD = { key: 'note', label: 'Not', type: 'text' }

const FABRIC_CORE_FIELDS = [
  { key: 'fabricBrand', label: 'Kumaş firması', type: 'text', required: true },
  { key: 'bodyFabric', label: 'Gövde kumaşı', type: 'text' },
  { key: 'legColor', label: 'Ayak rengi', type: 'text' },
]

/** Özet/sözleşmede gösterilmeyen eski snapshot anahtarları (parse/saklama devam eder). */
const SUMMARY_HIDDEN_LEGACY_KEYS = new Set(['fabricCode', 'fabric'])

const CORNER_FIELD = {
  key: 'cornerDirection',
  label: 'Yön',
  type: 'select',
  required: true,
  options: [...CORNER_DIRECTION_OPTIONS],
}

/** @type {Record<ConfigProfileId, { id: ConfigProfileId, label: string, fields: ConfigFieldDef[] }>} */
export const CONFIG_PROFILES = {
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

/** Geriye dönük snapshot anahtarları */
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
]

export const ALL_CONFIGURATION_KEYS = new Set([
  ...Object.values(CONFIG_PROFILES).flatMap((p) => p.fields.map((f) => f.key)),
  CORNER_FIELD.key,
  ...STRUCTURED_CONFIG_KEYS,
  ...LEGACY_CONFIG_KEYS,
])

/** @param {unknown} raw @returns {PillowRow[]} */
export function parsePillowRows(raw) {
  if (!Array.isArray(raw)) return []
  /** @type {PillowRow[]} */
  const out = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = /** @type {Record<string, unknown>} */ (item)
    const fabric = typeof o.fabric === 'string' ? trimConfigText(o.fabric) : ''
    const qtyRaw = typeof o.qty === 'number' ? o.qty : Number(o.qty)
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 0
    if (fabric && qty > 0) out.push({ fabric, qty })
  }
  return out
}

/** @param {unknown} rows @returns {PillowRow[]} */
export function sanitizePillowRows(rows) {
  return parsePillowRows(rows)
}

/** Yazım sırasında kısmi satırları korur (boş kumaş dahil). */
export function coercePillowRowsDraft(raw) {
  if (!Array.isArray(raw)) return []
  /** @type {PillowRow[]} */
  const out = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue
    const o = /** @type {Record<string, unknown>} */ (item)
    const fabric = typeof o.fabric === 'string' ? o.fabric.slice(0, 500) : ''
    const qtyRaw = typeof o.qty === 'number' ? o.qty : Number(o.qty)
    const qty = Number.isFinite(qtyRaw) && qtyRaw > 0 ? Math.floor(qtyRaw) : 1
    out.push({ fabric, qty })
  }
  return out
}

/** Eski snapshot'larda kalan, formda gösterilmeyen alanları korur. */
function preserveStoredOptionalKeys(out, source) {
  const collection =
    typeof source.fabricCollection === 'string' ? trimConfigText(source.fabricCollection) : ''
  if (collection) out.fabricCollection = collection
  const code = typeof source.fabricCode === 'string' ? trimConfigText(source.fabricCode) : ''
  if (code) out.fabricCode = code
}

/** Yazım sırasında eski tek satır kırlent anahtarlarını kullanma (hayalet doldurmayı önler). */
export function stripLegacyPillowKeys(configuration) {
  const c = { ...configuration }
  delete c.pillowFabric
  delete c.lumbarPillow
  return c
}

/**
 * Profil dışı anahtarları atar; metinleri yazım sırasında trim etmez.
 * @param {ConfigurationContext} ctx
 * @param {LineConfiguration} configuration
 */
function filterConfigurationDraft(ctx, configuration) {
  const allowed = new Set(getFieldsForContext(ctx).map((f) => f.key))
  const c = stripLegacyPillowKeys({ ...configuration })
  /** @type {LineConfiguration} */
  const out = {}
  for (const [k, v] of Object.entries(c)) {
    if (STRUCTURED_CONFIG_KEYS.has(k)) {
      if (resolveConfigurationProfile(ctx) === 'fabric') {
        const rows = coercePillowRowsDraft(v)
        if (rows.length) out[k] = rows
      }
      continue
    }
    if (k === 'fabricCollection' && typeof v === 'string' && v.length) {
      out[k] = v.slice(0, 500)
      continue
    }
    if (k === 'fabricCode' && typeof v === 'string' && v.length) {
      out[k] = v.slice(0, 500)
      continue
    }
    if (!allowed.has(k)) continue
    if (typeof v === 'string' && v.length) out[k] = v.slice(0, 500)
  }
  return out
}

/** Baş/son boşluk temizle — yazım sırasında iç boşluk korunur */
export function trimConfigText(value) {
  if (typeof value !== 'string') return ''
  return value.replace(/^\s+/, '').replace(/\s+$/, '').slice(0, 500)
}

/** @param {string | undefined} s */
function norm(s) {
  return (s ?? '')
    .trim()
    .toLocaleLowerCase('tr')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
}

/** @param {ConfigurationContext} ctx */
function contextBlob(ctx) {
  return [ctx.title, ctx.productGroup, ctx.category, ctx.suiteType].map(norm).join(' ')
}

/** @param {ConfigurationContext} ctx */
export function isAccessoryProduct(ctx) {
  const blob = contextBlob(ctx)
  return /aksesuar|dekor|vazo|ayna|tablo\b|lamba|kilim|yastik(?!\s*kuma)|minder\b/.test(blob)
}

/** @param {ConfigurationContext} ctx */
export function isFabricProduct(ctx) {
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

/** @param {ConfigurationContext} ctx */
export function requiresCornerDirection(ctx) {
  const blob = contextBlob(ctx)
  if (!isFabricProduct(ctx)) return false
  if (/kose|corner|l koltuk|kose takim|kose koltuk/.test(blob)) return true
  const st = norm(ctx.suiteType)
  if ((st === 'koltuk' || st === 'modul' || st === 'takim') && /kose|l koltuk/.test(blob)) return true
  return false
}

/** @param {ConfigurationContext} ctx @returns {ConfigProfileId} */
export function resolveConfigurationProfile(ctx) {
  const blob = contextBlob(ctx)
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

/** @param {ConfigurationContext} ctx @returns {ConfigFieldDef[]} */
export function getFieldsForContext(ctx) {
  const profileId = resolveConfigurationProfile(ctx)
  /** @type {ConfigFieldDef[]} */
  const fields = CONFIG_PROFILES[profileId].fields.map((f) => ({ ...f }))
  if (profileId === 'fabric' && requiresCornerDirection(ctx)) {
    const noteIdx = fields.findIndex((f) => f.key === 'note')
    const insertAt = noteIdx >= 0 ? noteIdx : fields.length
    fields.splice(insertAt, 0, { ...CORNER_FIELD })
  }
  return fields
}

/** @param {ConfigurationContext} ctx */
export function getProfileLabelForContext(ctx) {
  return CONFIG_PROFILES[resolveConfigurationProfile(ctx)].label
}

/**
 * Ürün profili değişince yalnızca geçerli alanları tut.
 * @param {ConfigurationContext} ctx
 * @param {LineConfiguration | undefined} configuration
 */
export function sanitizeConfigurationForContext(ctx, configuration) {
  if (!configuration) return emptyLineConfiguration()
  const allowed = new Set(getFieldsForContext(ctx).map((f) => f.key))
  const migrated = migrateLegacyPillows({ ...configuration })
  /** @type {LineConfiguration} */
  const out = {}
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

/**
 * Eski anahtarları yeni etiketlerle gösterim için normalize eder.
 * @param {LineConfiguration} configuration
 * @returns {LineConfiguration}
 */
/**
 * Eski tek satır kırlent alanlarını diziye taşır.
 * @param {LineConfiguration} configuration
 */
export function migrateLegacyPillows(configuration) {
  const c = { ...configuration }
  if (typeof c.pillowFabric === 'string' && c.pillowFabric.trim() && !c.pillows) {
    c.pillows = [{ fabric: trimConfigText(c.pillowFabric), qty: 1 }]
  }
  if (typeof c.lumbarPillow === 'string' && c.lumbarPillow.trim() && !c.lumbarPillows) {
    c.lumbarPillows = [{ fabric: trimConfigText(c.lumbarPillow), qty: 1 }]
  }
  return c
}

function normalizeConfigurationForDisplay(configuration) {
  const c = migrateLegacyPillows({ ...configuration })
  if (typeof c.fabric === 'string' && c.fabric && !c.fabricCode) c.fabricCode = c.fabric
  if (typeof c.headboardFabric === 'string' && c.headboardFabric && !c.bodyFabric) {
    c.bodyFabric = c.headboardFabric
  }
  if (typeof c.baseFabric === 'string' && c.baseFabric && !c.bodyFabric) c.bodyFabric = c.baseFabric
  return c
}

/**
 * @param {LineConfiguration} configuration
 * @param {'pillows' | 'lumbarPillows'} key
 * @param {PillowRow[]} rows
 */
export function patchPillowRows(configuration, key, rows) {
  const next = stripLegacyPillowKeys({ ...configuration })
  const draft = coercePillowRowsDraft(rows)
  if (draft.length) next[key] = draft
  else delete next[key]
  return next
}

/** @param {unknown} raw @returns {LineConfiguration | undefined} */
export function parseLineConfiguration(raw) {
  if (raw == null) return undefined
  if (typeof raw !== 'object' || Array.isArray(raw)) return undefined
  /** @type {LineConfiguration} */
  const out = {}
  for (const [k, v] of Object.entries(/** @type {Record<string, unknown>} */ (raw))) {
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

/** @returns {LineConfiguration} */
export function emptyLineConfiguration() {
  return {}
}

/**
 * @param {ConfigurationContext} ctx
 * @param {LineConfiguration | undefined} configuration
 */
export function validateLineConfiguration(ctx, configuration) {
  /** @type {string[]} */
  const errors = []
  /** @type {string[]} */
  const warnings = []
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
    const allowed = new Set(CORNER_DIRECTION_OPTIONS)
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

/**
 * @param {ConfigurationContext} ctx
 * @param {LineConfiguration | undefined} configuration
 * @returns {string[]}
 */
function appendPillowBlock(lines, title, rows) {
  const parsed = parsePillowRows(rows)
  if (!parsed.length) return
  lines.push(`${title}:`)
  for (const row of parsed) {
    lines.push(`• ${row.fabric} x${row.qty}`)
  }
}

export function formatConfigurationLines(ctx, configuration) {
  if (!configuration) return []
  const fields = getFieldsForContext(ctx)
  const config = normalizeConfigurationForDisplay(configuration)
  /** @type {string[]} */
  const lines = []
  const seen = new Set()
  for (const field of fields) {
    if (field.key === 'pillowFabric' || field.key === 'lumbarPillow') continue
    const raw = config[field.key]
    const val = typeof raw === 'string' ? trimConfigText(raw) : ''
    if (!val || seen.has(field.key)) continue
    seen.add(field.key)
    const label =
      field.key === 'fabricBrand'
        ? 'Kumaş firması'
        : field.key === 'bodyFabric'
          ? 'Gövde'
          : field.key === 'legColor'
            ? 'Ayak'
            : field.key === 'cornerDirection'
              ? 'Yön'
              : field.label
    lines.push(`${label}: ${val}`)
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

/**
 * @param {ConfigurationContext} ctx
 * @param {LineConfiguration | undefined} prev
 * @param {string} key
 * @param {string} value
 * @returns {LineConfiguration}
 */
export function patchLineConfiguration(ctx, prev, key, value) {
  const next = { ...(prev ?? {}) }
  if (value === '') delete next[key]
  else next[key] = value.slice(0, 500)
  return filterConfigurationDraft(ctx, next)
}
