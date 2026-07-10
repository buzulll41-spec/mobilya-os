import { MISSING_ITEM_STATUS, normalizeMissingItemStatusValue } from '../../contracts/v1/missingItemStatuses.js'

/** @typedef {import('../../contracts/v1/missingItem.js').MissingItemDto} MissingItemDto */

/**
 * API / mock wire → güvenli eksik ürün DTO (status yoksa OPEN).
 * @param {unknown} raw
 * @returns {MissingItemDto}
 */
export function normalizeMissingItemDto(raw) {
  const r = raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : {}
  const statusRaw = typeof r.status === 'string' ? r.status : ''
  const statusNorm = statusRaw.trim()
    ? normalizeMissingItemStatusValue(statusRaw)
    : MISSING_ITEM_STATUS.OPEN

  return {
    id: typeof r.id === 'string' ? r.id : '',
    orderId: typeof r.orderId === 'string' ? r.orderId : '',
    lineId: typeof r.lineId === 'string' ? r.lineId : null,
    title: typeof r.title === 'string' ? r.title : '—',
    quantity: typeof r.quantity === 'string' ? r.quantity : '1.00',
    reason: typeof r.reason === 'string' ? r.reason : '',
    status: /** @type {MissingItemDto['status']} */ (statusNorm),
    supplierNote: typeof r.supplierNote === 'string' ? r.supplierNote : null,
    createdAt: typeof r.createdAt === 'string' ? r.createdAt : new Date().toISOString(),
    resolvedAt: typeof r.resolvedAt === 'string' ? r.resolvedAt : null,
  }
}

/**
 * POST/PATCH handler dönüşü: `{ missingItem }` veya düz DTO.
 * @param {unknown} result
 * @returns {MissingItemDto | null}
 */
export function pickMissingItemFromMutationResult(result) {
  if (!result || typeof result !== 'object') return null
  const r = /** @type {Record<string, unknown>} */ (result)
  if (r.missingItem != null) return normalizeMissingItemDto(r.missingItem)
  if (typeof r.id === 'string' && r.id.trim()) return normalizeMissingItemDto(r)
  return null
}

/**
 * @param {unknown[]} items
 * @returns {MissingItemDto[]}
 */
export function sanitizeMissingItemsList(items) {
  if (!Array.isArray(items)) return []
  return items
    .filter((row) => row != null && typeof row === 'object')
    .map((row) => normalizeMissingItemDto(row))
    .filter((m) => m.id)
}
