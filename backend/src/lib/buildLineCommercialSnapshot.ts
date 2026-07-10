import { formatConfigurationLines } from '../constants/productConfigurationSchema.js'
import type { LineConfiguration } from '../constants/productConfigurationSchema.js'
import { computeLineTotal, roundMoney } from './commerceFinance.js'
import type { CreateOrderLineInput } from './orderLineCreate.js'

export type LineCommercialContext = {
  title: string
  productGroup?: string
  category?: string
  suiteType?: string
}

/**
 * Sipariş anı ticari snapshot — katalog değişse bile sabit kalır.
 */
export function buildPersistedOrderLineFields(
  line: CreateOrderLineInput,
  ctx: LineCommercialContext,
): {
  title: string
  productTitleSnapshot: string
  productGroupSnapshot: string | null
  unitPrice: number
  lineTotal: number
  qtyOrdered: number
  supplierId: string | null
  supplierNameSnapshot: string | null
  configurationSummary: string[] | null
} {
  const unitPrice = roundMoney(line.unitPrice)
  const qtyOrdered = line.quantity
  const lineTotal = computeLineTotal(qtyOrdered, unitPrice)
  const configurationSummary = line.configuration
    ? formatConfigurationLines(
        {
          title: ctx.title,
          productGroup: ctx.productGroup ?? ctx.category,
          category: ctx.category ?? ctx.productGroup,
          suiteType: ctx.suiteType,
        },
        line.configuration,
      )
    : null

  return {
    title: line.title.trim(),
    productTitleSnapshot: line.title.trim(),
    productGroupSnapshot: line.productGroup?.trim() ?? ctx.productGroup?.trim() ?? null,
    unitPrice,
    lineTotal,
    qtyOrdered,
    supplierId: line.supplierId ?? null,
    supplierNameSnapshot: line.supplierNameSnapshot?.trim() ?? null,
    configurationSummary: configurationSummary?.length ? configurationSummary : null,
  }
}

export function configurationSummaryFromJson(raw: unknown): string[] | null {
  if (!Array.isArray(raw)) return null
  const rows = raw.filter((x) => typeof x === 'string' && x.trim())
  return rows.length ? rows : null
}

export function configurationSummaryToJson(rows: string[] | null): LineConfiguration | null {
  if (!rows?.length) return null
  return null
}
