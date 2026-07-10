/** Operasyon sevk workflow (Slice 3) — legacy PICKING/CLOSED seed ile uyumlu okuma. */
export const SHIPMENT_OPERATION_STATUS = {
  PLANNED: 'PLANNED',
  LOADED: 'LOADED',
  DISPATCHED: 'DISPATCHED',
  DELIVERED: 'DELIVERED',
  INSTALLATION_DONE: 'INSTALLATION_DONE',
  ISSUE: 'ISSUE',
} as const

export type ShipmentOperationStatus =
  (typeof SHIPMENT_OPERATION_STATUS)[keyof typeof SHIPMENT_OPERATION_STATUS]

const ALL = new Set<string>(Object.values(SHIPMENT_OPERATION_STATUS))

export function isShipmentOperationStatus(value: string): value is ShipmentOperationStatus {
  return ALL.has(normalizeShipmentStatusValue(value))
}

export function normalizeShipmentStatusValue(value: string): string {
  return String(value ?? '').trim().toUpperCase()
}

/** Planlama / yükleme pipeline (açık sevk). */
export const OPEN_SHIPMENT_PIPELINE = new Set<string>([
  SHIPMENT_OPERATION_STATUS.PLANNED,
  SHIPMENT_OPERATION_STATUS.LOADED,
  'PICKING',
  'READY_TO_DISPATCH',
  'ON_HOLD',
])

/** Yolda. */
export const IN_TRANSIT_SHIPMENT = new Set<string>([
  SHIPMENT_OPERATION_STATUS.DISPATCHED,
])

/** Sevk edilmiş miktar sayımı. */
export const SHIPPED_QTY_STATUSES = new Set<string>([
  SHIPMENT_OPERATION_STATUS.DISPATCHED,
  SHIPMENT_OPERATION_STATUS.DELIVERED,
  SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE,
  'CLOSED',
])

export const SHIPMENT_STATUS_FLOW: readonly ShipmentOperationStatus[] = [
  SHIPMENT_OPERATION_STATUS.PLANNED,
  SHIPMENT_OPERATION_STATUS.LOADED,
  SHIPMENT_OPERATION_STATUS.DISPATCHED,
  SHIPMENT_OPERATION_STATUS.DELIVERED,
  SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE,
]

const ALLOWED_NEXT: Record<ShipmentOperationStatus, readonly ShipmentOperationStatus[]> = {
  PLANNED: ['LOADED', 'ISSUE'],
  LOADED: ['DISPATCHED', 'ISSUE'],
  DISPATCHED: ['DELIVERED', 'ISSUE'],
  DELIVERED: ['INSTALLATION_DONE', 'ISSUE'],
  INSTALLATION_DONE: [],
  ISSUE: [],
}

export function canTransitionShipmentStatus(from: string, to: ShipmentOperationStatus): boolean {
  const fromNorm = normalizeShipmentStatusValue(from)
  if (!isShipmentOperationStatus(fromNorm) || fromNorm === to) return false
  if (to === SHIPMENT_OPERATION_STATUS.ISSUE) {
    return fromNorm !== SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE && fromNorm !== SHIPMENT_OPERATION_STATUS.ISSUE
  }
  const fromOp = fromNorm as ShipmentOperationStatus
  return ALLOWED_NEXT[fromOp]?.includes(to) ?? false
}

export function nextShipmentOperationStatus(from: string): ShipmentOperationStatus | null {
  const fromNorm = normalizeShipmentStatusValue(from)
  if (!isShipmentOperationStatus(fromNorm)) return null
  const idx = SHIPMENT_STATUS_FLOW.indexOf(fromNorm)
  if (idx < 0 || idx >= SHIPMENT_STATUS_FLOW.length - 1) return null
  return SHIPMENT_STATUS_FLOW[idx + 1] ?? null
}

export function shipmentEventTypeForStatus(
  status: ShipmentOperationStatus,
): string | null {
  switch (status) {
    case SHIPMENT_OPERATION_STATUS.PLANNED:
      return 'shipment.planned'
    case SHIPMENT_OPERATION_STATUS.LOADED:
      return 'shipment.loaded'
    case SHIPMENT_OPERATION_STATUS.DISPATCHED:
      return 'shipment.dispatched'
    case SHIPMENT_OPERATION_STATUS.DELIVERED:
      return 'shipment.delivered'
    case SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE:
      return 'installation.completed'
    case SHIPMENT_OPERATION_STATUS.ISSUE:
      return 'installation.issue'
    default:
      return null
  }
}
