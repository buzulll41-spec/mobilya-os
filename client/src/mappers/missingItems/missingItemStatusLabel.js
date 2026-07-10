import { MISSING_ITEM_STATUS, normalizeMissingItemStatusValue } from '../../contracts/v1/missingItemStatuses.js'

/** @typedef {import('../../contracts/v1/missingItemStatuses.js').MissingItemStatus} MissingItemStatus */

const STATUS_LABEL = /** @type {Record<string, string>} */ ({
  [MISSING_ITEM_STATUS.OPEN]: 'Açık',
  [MISSING_ITEM_STATUS.ORDERED]: 'Sipariş verildi',
  [MISSING_ITEM_STATUS.ARRIVED]: 'Parça geldi',
  [MISSING_ITEM_STATUS.READY_FOR_SHIPMENT]: 'Sevke hazır',
  [MISSING_ITEM_STATUS.RESOLVED]: 'Tamamlandı',
})

/**
 * @param {string | undefined | null} status
 * @returns {string}
 */
export function missingItemStatusLabel(status) {
  const norm = normalizeMissingItemStatusValue(status ?? '')
  if (!norm || !STATUS_LABEL[norm]) {
    return STATUS_LABEL[MISSING_ITEM_STATUS.OPEN]
  }
  return STATUS_LABEL[norm]
}

/**
 * @param {string | undefined | null} status
 * @returns {MissingItemStatus}
 */
export function missingItemStatusOrOpen(status) {
  const norm = normalizeMissingItemStatusValue(status ?? '')
  return Object.values(MISSING_ITEM_STATUS).includes(/** @type {MissingItemStatus} */ (norm))
    ? /** @type {MissingItemStatus} */ (norm)
    : MISSING_ITEM_STATUS.OPEN
}
