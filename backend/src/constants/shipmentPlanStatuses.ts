export const SHIPMENT_PLAN_STATUS = {
  PLANNED: 'PLANNED',
  APPLIED: 'APPLIED',
  IN_TRANSIT: 'IN_TRANSIT',
  PENDING_DELIVERY_CONFIRM: 'PENDING_DELIVERY_CONFIRM',
  DELIVERED: 'DELIVERED',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  POSTPONED: 'POSTPONED',
  CANCELLED: 'CANCELLED',
} as const

export type ShipmentPlanStatus = (typeof SHIPMENT_PLAN_STATUS)[keyof typeof SHIPMENT_PLAN_STATUS]

export const SHIPMENT_PLAN_EVENT = {
  CREATED: 'shipment.plan.created',
  UPDATED: 'shipment.plan.updated',
  GROUP_CREATED: 'shipment.group.created',
  GROUP_APPLIED: 'shipment.group.applied',
  CONFIRMATION_REQUIRED: 'delivery.confirmation.required',
  CONFIRMED: 'delivery.confirmed',
  FAILED: 'delivery.failed',
  POSTPONED: 'delivery.postponed',
  REVERTED: 'delivery.reverted',
} as const

export const DELIVERY_FAIL_REASONS = [
  'CUSTOMER_ABSENT',
  'CUSTOMER_REJECTED',
  'ADDRESS_ISSUE',
  'PAYMENT_ISSUE',
  'INSTALLATION_FAILED',
  'PRODUCT_LEFT_ON_VEHICLE',
  'VEHICLE_DELAY',
  'OTHER',
] as const

export type DeliveryFailReason = (typeof DELIVERY_FAIL_REASONS)[number]

const QUEUE_ELIGIBLE = new Set<string>([
  SHIPMENT_PLAN_STATUS.PLANNED,
  SHIPMENT_PLAN_STATUS.APPLIED,
  SHIPMENT_PLAN_STATUS.IN_TRANSIT,
])

const TERMINAL = new Set<string>([
  SHIPMENT_PLAN_STATUS.CANCELLED,
  SHIPMENT_PLAN_STATUS.POSTPONED,
  SHIPMENT_PLAN_STATUS.DELIVERED,
  SHIPMENT_PLAN_STATUS.DELIVERY_FAILED,
  SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM,
])

export function isPlanEligibleForConfirmationQueue(status: string): boolean {
  return QUEUE_ELIGIBLE.has(status)
}

export function isPlanTerminalForQueue(status: string): boolean {
  return TERMINAL.has(status)
}

export function planStatusLabel(status: string): string {
  switch (status) {
    case SHIPMENT_PLAN_STATUS.PLANNED:
    case SHIPMENT_PLAN_STATUS.APPLIED:
      return 'Planlandı'
    case SHIPMENT_PLAN_STATUS.IN_TRANSIT:
      return 'Yolda'
    case SHIPMENT_PLAN_STATUS.PENDING_DELIVERY_CONFIRM:
      return 'Teslim Onayı Bekliyor'
    case SHIPMENT_PLAN_STATUS.DELIVERED:
      return 'Teslim Edildi'
    case SHIPMENT_PLAN_STATUS.DELIVERY_FAILED:
      return 'Teslim Edilemedi'
    case SHIPMENT_PLAN_STATUS.POSTPONED:
      return 'Ertelendi'
    case SHIPMENT_PLAN_STATUS.CANCELLED:
      return 'İptal'
    default:
      return status
  }
}
