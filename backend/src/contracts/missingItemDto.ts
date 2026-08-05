import {
  isMissingItemStatus,
  normalizeMissingItemStatusValue,
  type MissingItemStatus,
} from '../constants/missingItemStatuses.js'

export type MissingItemDto = {
  id: string
  orderId: string
  lineId: string | null
  title: string
  quantity: string
  reason: string
  status: MissingItemStatus
  supplierNote: string | null
  createdAt: string
  resolvedAt: string | null
}

export function mapMissingItemRow(row: {
  id: string
  orderId: string
  lineId: string | null
  title: string
  quantity: { toString(): string } | { toFixed?: (n: number) => string }
  reason: string
  status: string
  supplierNote: string | null
  createdAt: Date
  resolvedAt: Date | null
}): MissingItemDto {
  const qty =
    typeof row.quantity === 'object' && row.quantity !== null && 'toFixed' in row.quantity
      ? Number(row.quantity.toString()).toFixed(2)
      : String(row.quantity)
  const statusNorm = normalizeMissingItemStatusValue(row.status)
  return {
    id: row.id,
    orderId: row.orderId,
    lineId: row.lineId,
    title: row.title,
    quantity: qty,
    reason: row.reason,
    status: (isMissingItemStatus(statusNorm) ? statusNorm : row.status) as MissingItemStatus,
    supplierNote: row.supplierNote,
    createdAt: row.createdAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  }
}
