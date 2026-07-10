import type { LineConfiguration } from '../constants/productConfigurationSchema.js'

export type CreateOrderLineInput = {
  title: string
  quantity: number
  unitPrice: number
  lineTotal: number
  productGroup?: string
  sortOrder: number
  productId?: string
  configuration?: LineConfiguration
  supplierId?: string
  supplierNameSnapshot?: string
  // Satış kaynağı snapshot (satış anındaki ürün kartından kopyalanır)
  soldSalesSourceType?: string
  soldDisplayFloor?: string
  soldExternalSupplyType?: string
  soldUnitCost?: number
  soldWholesalePrice?: number
  soldWholesaleDiscountRate?: number
}

export function roundMoney(n: number): number {
  if (!Number.isFinite(n)) return 0
  return Math.round(n * 100) / 100
}

export function lineExtendedTotal(line: Pick<CreateOrderLineInput, 'quantity' | 'unitPrice'>): number {
  const qty = line.quantity
  const unit = roundMoney(line.unitPrice)
  return roundMoney(qty * unit)
}

/**
 * Sipariş özeti — wizard ile aynı kurallar.
 */
export function formatProductSummaryFromLines(
  lines: Pick<CreateOrderLineInput, 'title' | 'quantity'>[],
): string {
  const valid = lines.filter((l) => l.title.trim())
  if (valid.length === 0) return ''
  if (valid.length === 1) {
    const p = valid[0]
    const qty = p.quantity
    return qty > 1 ? `${p.title.trim()} (${qty} adet)` : p.title.trim()
  }
  return valid
    .map((p) => {
      const qty = p.quantity
      return `${p.title.trim()} × ${qty}`
    })
    .join(' · ')
}

export function computeTotalFromLines(lines: CreateOrderLineInput[]): number {
  return roundMoney(lines.reduce((sum, ln) => sum + lineExtendedTotal(ln), 0))
}

export function sortLinesByOrder(lines: CreateOrderLineInput[]): CreateOrderLineInput[] {
  return [...lines].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function buildOrderLineIds(orderId: string, count: number): string[] {
  return Array.from({ length: count }, (_, i) => `OL-${orderId}-${i + 1}`)
}
