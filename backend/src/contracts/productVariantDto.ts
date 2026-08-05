import type { ProductVariant } from '@prisma/client'
import { formatMoneyAmount } from '../lib/supplierLedger.js'
import { decimalToNumber } from '../lib/money.js'
import {
  isVariantStockStatus,
  variantStockStatusLabelTr,
  type VariantStockStatus,
} from '../constants/variantStockStatus.js'

export type ProductMasterVariantDto = {
  id: string
  variantCode: string
  barcode: string | null
  name: string
  /** @deprecated use name */
  label: string
  /** @deprecated use variantCode */
  code: string
  attributes: Record<string, string>
  priceDelta: number | null
  costDelta: number | null
  salePrice: string | null
  purchasePrice: string | null
  stockQuantity: number | null
  stockStatus: VariantStockStatus | null
  stockStatusLabel: string | null
  widthCm: number | null
  depthCm: number | null
  heightCm: number | null
  color: string | null
  fabric: string | null
  sizeLabel: string | null
  isDefault: boolean
  isActive: boolean
  wooVariationId: number | null
}

function parseAttributes(raw: unknown): Record<string, string> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (typeof v === 'string' && v.trim()) out[k] = v.trim()
  }
  return out
}

export function mapProductVariantDto(row: ProductVariant): ProductMasterVariantDto {
  const stockStatus =
    typeof row.stockStatus === 'string' && isVariantStockStatus(row.stockStatus)
      ? row.stockStatus
      : null

  return {
    id: row.id,
    variantCode: row.variantCode,
    barcode: row.barcode,
    name: row.name,
    label: row.name,
    code: row.variantCode,
    attributes: parseAttributes(row.attributes),
    priceDelta: row.priceDelta != null ? Number(row.priceDelta) : null,
    costDelta: row.costDelta != null ? Number(row.costDelta) : null,
    salePrice: row.salePrice != null ? formatMoneyAmount(decimalToNumber(row.salePrice)) : null,
    purchasePrice:
      row.purchasePrice != null ? formatMoneyAmount(decimalToNumber(row.purchasePrice)) : null,
    stockQuantity: row.stockQuantity,
    stockStatus,
    stockStatusLabel: stockStatus ? variantStockStatusLabelTr(stockStatus) : null,
    widthCm: row.widthCm != null ? Number(row.widthCm) : null,
    depthCm: row.depthCm != null ? Number(row.depthCm) : null,
    heightCm: row.heightCm != null ? Number(row.heightCm) : null,
    color: row.color,
    fabric: row.fabric,
    sizeLabel: row.sizeLabel,
    isDefault: row.isDefault,
    isActive: row.isActive,
    wooVariationId: row.wooVariationId,
  }
}

export function mapProductVariantDtos(rows: ProductVariant[]): ProductMasterVariantDto[] {
  return rows.map(mapProductVariantDto)
}
