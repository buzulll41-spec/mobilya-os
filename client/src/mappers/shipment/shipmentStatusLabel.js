import {
  SHIPMENT_OPERATION_STATUS,
  normalizeShipmentStatusValue,
} from '../../contracts/v1/shipmentStatuses.js'

/** @typedef {import('../../contracts/v1/shipmentStatuses.js').ShipmentOperationStatus} ShipmentOperationStatus */

/** @param {string | undefined | null} status */
export function shipmentStatusOrPlanned(status) {
  const n = normalizeShipmentStatusValue(status ?? '')
  return /** @type {ShipmentOperationStatus | string} */ (n || SHIPMENT_OPERATION_STATUS.PLANNED)
}

/** @param {string | undefined | null} status */
export function shipmentStatusLabel(status) {
  const s = shipmentStatusOrPlanned(status)
  switch (s) {
    case SHIPMENT_OPERATION_STATUS.PLANNED:
      return 'Sevk planlandı'
    case SHIPMENT_OPERATION_STATUS.LOADED:
      return 'Araç yüklendi'
    case SHIPMENT_OPERATION_STATUS.DISPATCHED:
      return 'Yola çıktı'
    case SHIPMENT_OPERATION_STATUS.DELIVERED:
      return 'Teslim edildi'
    case SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE:
      return 'Montaj tamamlandı'
    case SHIPMENT_OPERATION_STATUS.ISSUE:
      return 'Sorun var'
    case 'PICKING':
      return 'Toplama'
    case 'READY_TO_DISPATCH':
      return 'Sevke hazır'
    case 'ON_HOLD':
      return 'Beklemede'
    case 'CLOSED':
      return 'Kapandı'
    default:
      return String(s)
  }
}
