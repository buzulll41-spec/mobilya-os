export const SHIPMENT_PLAN_STATUS = {
  PLANNED: 'PLANNED',
  APPLIED: 'APPLIED',
  IN_TRANSIT: 'IN_TRANSIT',
  PENDING_DELIVERY_CONFIRM: 'PENDING_DELIVERY_CONFIRM',
  DELIVERED: 'DELIVERED',
  DELIVERY_FAILED: 'DELIVERY_FAILED',
  POSTPONED: 'POSTPONED',
  CANCELLED: 'CANCELLED',
}

export const DELIVERY_FAIL_REASONS = [
  { id: 'CUSTOMER_ABSENT', label: 'Müşteri evde yoktu' },
  { id: 'CUSTOMER_REJECTED', label: 'Müşteri teslimatı kabul etmedi' },
  { id: 'ADDRESS_ISSUE', label: 'Adres sorunu' },
  { id: 'PAYMENT_ISSUE', label: 'Ödeme sorunu' },
  { id: 'INSTALLATION_FAILED', label: 'Montaj yapılamadı' },
  { id: 'PRODUCT_LEFT_ON_VEHICLE', label: 'Ürün araçta kaldı' },
  { id: 'VEHICLE_DELAY', label: 'Araç yetişemedi' },
  { id: 'OTHER', label: 'Diğer' },
]

/** @param {string} status */
export function planStatusLabel(status) {
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
      return status || 'Planlandı'
  }
}
