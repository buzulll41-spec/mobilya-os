import { SHIPMENT_OPERATION_STATUS } from '../../contracts/v1/shipmentStatuses.js'

/**
 * UI tek tıkla backend workflow zincirini ilerletir (PLANNED → … → DELIVERED).
 *
 * @param {(
 *   orderId: string,
 *   shipmentId: string,
 *   body: { status: string, issueNote?: string },
 * ) => Promise<unknown>} patchFn
 * @param {string} orderId
 * @param {string} shipmentId
 * @param {{
 *   status: string
 *   advanceChain?: string[]
 *   issueNote?: string
 * }} action
 */
export async function applyShipmentStatusAdvance(patchFn, orderId, shipmentId, action) {
  const chain =
    action.advanceChain?.length && action.advanceChain.length > 0
      ? action.advanceChain
      : [action.status]

  let lastResult
  for (const status of chain) {
    /** @type {Record<string, unknown>} */
    const body = { status }
    if (status === SHIPMENT_OPERATION_STATUS.ISSUE && action.issueNote?.trim()) {
      body.issueNote = action.issueNote.trim()
    }
    if (status === SHIPMENT_OPERATION_STATUS.DISPATCHED) {
      lastResult = await patchFn(orderId, shipmentId, body)
      continue
    }
    if (status === SHIPMENT_OPERATION_STATUS.DELIVERED) {
      if (action.deliveredBy) body.deliveredBy = action.deliveredBy
      if (action.vehicle) body.vehicle = action.vehicle
      if (action.deliveredAt) body.deliveredAt = action.deliveredAt
      if (action.deliveryNote) body.deliveryNote = action.deliveryNote
      if (action.customerConfirmNote) body.customerConfirmNote = action.customerConfirmNote
    }
    lastResult = await patchFn(orderId, shipmentId, body)
  }
  return lastResult
}
