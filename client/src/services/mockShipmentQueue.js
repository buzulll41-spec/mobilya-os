import { DEMO_TODAY } from '../data/constants.js'
import { OPEN_SHIPMENT_PIPELINE, IN_TRANSIT_SHIPMENT, SHIPMENT_OPERATION_STATUS } from '../contracts/v1/shipmentStatuses.js'
import { normalizeShipmentStatusValue } from '../contracts/v1/shipmentStatuses.js'
import { getAllShipmentsSnapshot } from './mockShipmentStore.js'
import { projectLegacyOrderToListItemDto } from './orderListItemProjection.js'

/** @typedef {import('../contracts/v1/shipmentQueueItem.js').ShipmentQueueItemDto} ShipmentQueueItemDto */

/**
 * @param {import('../data/seedOrders.js').Order[]} memoryOrders
 * @returns {ShipmentQueueItemDto[]}
 */
export function buildMockShipmentQueue(memoryOrders) {
  const shipments = getAllShipmentsSnapshot()
  const orderById = new Map(memoryOrders.map((o) => [o.id, o]))

  return shipments
    .map((sh) => {
      const order = orderById.get(sh.salesOrderId)
      if (!order) return null
      const dto = projectLegacyOrderToListItemDto(order, DEMO_TODAY)
      const st = normalizeShipmentStatusValue(sh.status)
      let queueBucket = /** @type {ShipmentQueueItemDto['queueBucket']} */ ('planned')
      if (
        st === SHIPMENT_OPERATION_STATUS.DELIVERED ||
        st === SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE ||
        order.status === 'Teslim Edildi' ||
        dto.installationPending
      ) {
        queueBucket = 'delivered'
      } else if (IN_TRANSIT_SHIPMENT.has(st)) {
        queueBucket = 'in_transit'
      } else if (OPEN_SHIPMENT_PIPELINE.has(st)) {
        queueBucket = 'planned'
      }

      return /** @type {ShipmentQueueItemDto} */ ({
        shipmentId: sh.id,
        salesOrderId: sh.salesOrderId,
        plannedShipDate: sh.plannedShipDate,
        shipmentStatus: st,
        crewName: sh.crewName ?? null,
        customerDisplayName: order.customer,
        lineSummaryTitle: order.product,
        displayStatus: order.status,
        customerPhone: order.phone ?? null,
        installationPending: Boolean(dto.installationPending),
        hasShipmentIssue: Boolean(dto.hasShipmentIssue),
        inTransit: IN_TRANSIT_SHIPMENT.has(st),
        queueBucket,
      })
    })
    .filter((r) => r != null)
}
