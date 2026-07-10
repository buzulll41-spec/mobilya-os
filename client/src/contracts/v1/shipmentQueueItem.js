/**
 * GET /v1/shipments — Sevk sayfası satırı (shipment kaynağı).
 *
 * @typedef {Object} ShipmentQueueItemDto
 * @property {string} shipmentId
 * @property {string} salesOrderId
 * @property {string | null} plannedShipDate YYYY-MM-DD — shipment.plannedShipDate
 * @property {string} shipmentStatus
 * @property {string | null} [crewName]
 * @property {string} customerDisplayName
 * @property {string} lineSummaryTitle
 * @property {string} displayStatus
 * @property {string | null} [customerPhone]
 * @property {boolean} [installationPending]
 * @property {boolean} [hasShipmentIssue]
 * @property {boolean} [inTransit]
 * @property {'planned' | 'in_transit' | 'delivered'} [queueBucket]
 */

export {}
