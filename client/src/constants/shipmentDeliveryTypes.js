export const SHIPMENT_DELIVERY_TYPE = /** @type {const} */ ({
  STANDARD: 'STANDARD',
  MISSING_PART_DELIVERY: 'MISSING_PART_DELIVERY',
  SSH_PART_DELIVERY: 'SSH_PART_DELIVERY',
})

/**
 * @param {string | null | undefined} deliveryType
 * @returns {string | null}
 */
export function shipmentDeliveryTypeLabel(deliveryType) {
  const t = String(deliveryType ?? '').trim().toUpperCase()
  if (
    t === SHIPMENT_DELIVERY_TYPE.MISSING_PART_DELIVERY ||
    t === SHIPMENT_DELIVERY_TYPE.SSH_PART_DELIVERY
  ) {
    return 'SSH / Eksik Parça Sevki'
  }
  return null
}

/**
 * @param {string | null | undefined} deliveryType
 */
export function isMissingPartDeliveryType(deliveryType) {
  const t = String(deliveryType ?? '').trim().toUpperCase()
  return (
    t === SHIPMENT_DELIVERY_TYPE.MISSING_PART_DELIVERY ||
    t === SHIPMENT_DELIVERY_TYPE.SSH_PART_DELIVERY
  )
}
