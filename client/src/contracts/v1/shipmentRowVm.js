/**
 * @typedef {import('./orderListRowVm.js').OrderListRowVM} OrderListRowVM
 *
 * @typedef {OrderListRowVM & {
 *   remainingQty: number
 *   partiallyShipped: boolean
 *   qtyOrderedTotal?: string
 *   qtyShippedTotal?: string
 *   shipmentSummaryOpenCount?: number
 *   inTransitShipmentCount?: number
 *   hasShipmentIssue?: boolean
 *   installationPending?: boolean
 *   shipmentId?: string
 *   plannedShipDate?: string | null
 *   shipmentStatus?: string
 *   queueBucket?: 'planned' | 'in_transit' | 'delivered'
 *   openMissingItemsCount?: number
 *   crewName?: string | null
 *   vehicleNote?: string | null
 * }} ShipmentRowVM
 */

export {}
