export const MISSING_ITEM_STATUS = {
  OPEN: 'OPEN',
  ORDERED: 'ORDERED',
  ARRIVED: 'ARRIVED',
  READY_FOR_SHIPMENT: 'READY_FOR_SHIPMENT',
  RESOLVED: 'RESOLVED',
} as const

export type MissingItemStatus = (typeof MISSING_ITEM_STATUS)[keyof typeof MISSING_ITEM_STATUS]

const ALL = new Set<string>(Object.values(MISSING_ITEM_STATUS))

export function isMissingItemStatus(value: string): value is MissingItemStatus {
  return ALL.has(normalizeMissingItemStatusValue(value))
}

/** DB / wire değerlerini tek biçime getir (projection sayımı için). */
export function normalizeMissingItemStatusValue(value: string): string {
  return String(value ?? '').trim().toUpperCase()
}

export function isMissingItemResolvedStatus(value: string): boolean {
  return normalizeMissingItemStatusValue(value) === MISSING_ITEM_STATUS.RESOLVED
}

/** Sevk kilidi — READY_FOR_SHIPMENT sevke uygun sayılır. */
export function isMissingItemBlockingShipment(value: string): boolean {
  const norm = normalizeMissingItemStatusValue(value)
  return norm !== MISSING_ITEM_STATUS.RESOLVED && norm !== MISSING_ITEM_STATUS.READY_FOR_SHIPMENT
}

/** İleriye doğru geçişler; RESOLVED terminal. */
const ALLOWED_NEXT: Record<MissingItemStatus, readonly MissingItemStatus[]> = {
  OPEN: ['ORDERED', 'ARRIVED', 'READY_FOR_SHIPMENT', 'RESOLVED'],
  ORDERED: ['ARRIVED', 'READY_FOR_SHIPMENT', 'RESOLVED'],
  ARRIVED: ['READY_FOR_SHIPMENT', 'RESOLVED'],
  READY_FOR_SHIPMENT: ['RESOLVED'],
  RESOLVED: [],
}

export function canTransitionMissingItemStatus(
  from: MissingItemStatus,
  to: MissingItemStatus,
): boolean {
  if (from === to) return false
  return ALLOWED_NEXT[from].includes(to)
}

export function missingItemEventTypeForStatus(
  status: MissingItemStatus,
):
  | 'missing_item.created'
  | 'missing_item.ordered'
  | 'missing_item.arrived'
  | 'missing_item.ready_for_shipment'
  | 'missing_item.resolved'
  | null {
  switch (status) {
    case MISSING_ITEM_STATUS.OPEN:
      return 'missing_item.created'
    case MISSING_ITEM_STATUS.ORDERED:
      return 'missing_item.ordered'
    case MISSING_ITEM_STATUS.ARRIVED:
      return 'missing_item.arrived'
    case MISSING_ITEM_STATUS.READY_FOR_SHIPMENT:
      return 'missing_item.ready_for_shipment'
    case MISSING_ITEM_STATUS.RESOLVED:
      return 'missing_item.resolved'
    default:
      return null
  }
}
