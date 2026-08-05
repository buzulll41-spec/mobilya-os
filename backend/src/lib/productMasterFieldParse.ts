import { AppHttpError } from '../errors/apiError.js'
import { isDisplayFloor } from '../constants/displayFloors.js'
import { isExternalSupplyType } from '../constants/externalSupplyTypes.js'
import { isPhysicalLocation } from '../constants/physicalLocations.js'
import { isProductStockType } from '../constants/productStockTypes.js'
import { isProductType } from '../constants/productTypes.js'
import { isCreatableSalesSourceType } from '../constants/salesSourceTypes.js'

export type TechnicalAttributeInput = { label: string; value: string }

function optString(v: unknown): string | undefined {
  return typeof v === 'string' && v.trim() ? v.trim() : undefined
}

export function parseStringArrayField(v: unknown, field: string): string[] | undefined {
  if (v === undefined) return undefined
  if (!Array.isArray(v)) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return v
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter((item) => item.length > 0)
}

export function parseTechnicalAttributes(v: unknown): TechnicalAttributeInput[] | undefined {
  if (v === undefined) return undefined
  if (!Array.isArray(v)) {
    throw new AppHttpError(400, 'technicalAttributes geçersiz', 'Bad Request')
  }
  const specs: TechnicalAttributeInput[] = []
  for (const item of v) {
    if (!item || typeof item !== 'object') continue
    const o = item as Record<string, unknown>
    const label = typeof o.label === 'string' ? o.label.trim() : ''
    const value = typeof o.value === 'string' ? o.value.trim() : ''
    if (label && value) specs.push({ label, value })
  }
  return specs
}

export function parseProductType(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const s = typeof v === 'string' ? v.trim() : ''
  if (!isProductType(s)) {
    throw new AppHttpError(400, 'Geçersiz ürün tipi', 'Bad Request', { productType: 'Invalid' })
  }
  return s
}

export function parseStockType(v: unknown): string | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const s = typeof v === 'string' ? v.trim() : ''
  if (!isProductStockType(s)) {
    throw new AppHttpError(400, 'Geçersiz stok tipi', 'Bad Request', { stockType: 'Invalid' })
  }
  return s
}

export function parseSalesSourceType(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const s = typeof v === 'string' ? v.trim() : ''
  if (!isCreatableSalesSourceType(s)) {
    throw new AppHttpError(400, 'Geçersiz satış kaynağı', 'Bad Request', { salesSourceType: 'Invalid' })
  }
  return s
}

export function parseDisplayFloor(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const s = typeof v === 'string' ? v.trim() : ''
  if (!isDisplayFloor(s)) {
    throw new AppHttpError(400, 'Geçersiz sergi katı', 'Bad Request', { displayFloor: 'Invalid' })
  }
  return s
}

export function parsePhysicalLocation(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const s = typeof v === 'string' ? v.trim() : ''
  if (!isPhysicalLocation(s)) {
    throw new AppHttpError(400, 'Geçersiz fiziksel lokasyon', 'Bad Request', {
      physicalLocation: 'Invalid',
    })
  }
  return s
}

export function parseExternalSupplyType(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null || v === '') return null
  const s = typeof v === 'string' ? v.trim() : ''
  if (!isExternalSupplyType(s)) {
    throw new AppHttpError(400, 'Geçersiz dış tedarik tipi', 'Bad Request', {
      externalSupplyType: 'Invalid',
    })
  }
  return s
}

export function parsePackageCount(v: unknown, field: string): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isInteger(n) || n <= 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return n
}

export function parseWeight(v: unknown, field: string): number | undefined {
  if (v === undefined || v === null || v === '') return undefined
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n) || n <= 0) {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request', { [field]: 'Invalid' })
  }
  return Math.round(n * 100) / 100
}

export function parseOptionalStringField(v: unknown): string | undefined {
  return optString(v)
}

export function parseNullableStringField(v: unknown): string | null | undefined {
  if (v === undefined) return undefined
  if (v === null) return null
  const s = typeof v === 'string' ? v.trim() : ''
  return s || null
}

export function parseBooleanField(v: unknown): boolean | undefined {
  if (v === undefined) return undefined
  if (typeof v !== 'boolean') {
    throw new AppHttpError(400, 'Validation failed', 'Bad Request')
  }
  return v
}
