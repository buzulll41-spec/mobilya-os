import {
  KOCAELI_SHIPMENT_REGIONS,
  TRIP_SAVINGS_TRY,
} from './shipmentPlanConstants.js'

/** @type {readonly string[]} */
export const KNOWN_SHIPMENT_REGIONS = [
  ...KOCAELI_SHIPMENT_REGIONS,
  'İstanbul',
  'Sakarya',
]

export const UNKNOWN_REGION_LABEL = 'Bölge Belirsiz'

/** @type {Record<string, string>} */
const REGION_ALIASES = {
  izmit: 'İzmit',
  'izmit merkez': 'İzmit',
  basiskele: 'Başiskele',
  'baş iskele': 'Başiskele',
  kartepe: 'Kartepe',
  derince: 'Derince',
  korfez: 'Körfez',
  körfez: 'Körfez',
  gebze: 'Gebze',
  'gebze osb': 'Gebze',
  golcuk: 'Gölcük',
  gölcük: 'Gölcük',
  kandira: 'Kandıra',
  kandıra: 'Kandıra',
}

/**
 * @typedef {{ region: string, known: boolean, rawHint?: string }} ShipmentRegionMatch
 */

/**
 * @param {string} fragment
 * @returns {string | null}
 */
function matchKnownRegion(fragment) {
  const trimmed = fragment.trim()
  if (!trimmed) return null

  const lower = trimmed.toLocaleLowerCase('tr-TR')
  if (REGION_ALIASES[lower]) return REGION_ALIASES[lower]

  for (const region of KNOWN_SHIPMENT_REGIONS) {
    if (lower.includes(region.toLocaleLowerCase('tr-TR'))) {
      return region
    }
  }

  return null
}

/**
 * @param {string | null | undefined} text
 * @returns {ShipmentRegionMatch}
 */
export function normalizeShipmentRegion(text) {
  const raw = typeof text === 'string' ? text.trim() : ''
  if (!raw) return { region: UNKNOWN_REGION_LABEL, known: false }

  const addrMatch = raw.match(/Adres:\s*([^,\n]+)/i)
  const districtMatch = raw.match(/(?:İlçe|ilce|District|Bölge|Bolge):\s*([^,\n]+)/i)
  const fragments = [addrMatch?.[1], districtMatch?.[1], raw].filter(Boolean)

  for (const fragment of fragments) {
    const matched = matchKnownRegion(String(fragment))
    if (matched) {
      return { region: matched, known: true, rawHint: addrMatch?.[1]?.trim() }
    }
  }

  if (addrMatch?.[1]?.trim()) {
    return { region: UNKNOWN_REGION_LABEL, known: false, rawHint: addrMatch[1].trim() }
  }

  return { region: UNKNOWN_REGION_LABEL, known: false }
}

/**
 * @param {string} region
 */
export function isKnownShipmentRegion(region) {
  return KNOWN_SHIPMENT_REGIONS.includes(region)
}

/**
 * @param {string} region
 */
export function formatRegionDisplayLabel(region) {
  return region === UNKNOWN_REGION_LABEL ? UNKNOWN_REGION_LABEL : region.toLocaleUpperCase('tr-TR')
}
