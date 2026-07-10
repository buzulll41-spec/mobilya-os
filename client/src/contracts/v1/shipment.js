/**
 * @typedef {import('./enums.js').ShipmentStatus} ShipmentStatus
 *
 * @typedef {Object} ShipmentLineDto
 * @property {string} id
 * @property {string} shipmentId
 * @property {string} orderLineId
 * @property {string} qty Sevk edilen miktar (ondalık string)
 *
 * @typedef {Object} ShipmentDto
 * @property {string} id
 * @property {string} salesOrderId
 * @property {string} shipmentNumber
 * @property {import('./enums.js').ShipmentStatus} status
 * @property {string} originLocationId
 * @property {string | null} plannedShipDate YYYY-MM-DD
 * @property {string | null} actualShipDate YYYY-MM-DD
 * @property {number} version
 * @property {string | null} [crewName]
 * @property {string | null} [vehicleNote]
 * @property {string | null} [note]
 * @property {ShipmentLineDto[]} lines
 */

export {}
