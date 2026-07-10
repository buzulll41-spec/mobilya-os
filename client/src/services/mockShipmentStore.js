import { INITIAL_SHIPMENTS, ORDER_LINE_SEEDS } from '../data/mock/shipmentFixtures.js'
import { getOrderLinesForSalesOrder } from './mockOrderLineStore.js'

/** @typedef {import('../contracts/v1/shipment.js').ShipmentDto} ShipmentDto */

function cloneShipments(/** @type {ShipmentDto[]} */ rows) {
  return rows.map((s) => ({
    ...s,
    lines: s.lines.map((l) => ({ ...l })),
  }))
}

/** @type {ShipmentDto[]} */
let memoryShipments = cloneShipments(INITIAL_SHIPMENTS)

export function resetMockShipmentStore() {
  memoryShipments = cloneShipments(INITIAL_SHIPMENTS)
}

/**
 * @param {ShipmentDto[]} rows
 */
export function hydrateShipmentStore(rows) {
  memoryShipments = cloneShipments(rows)
}

/**
 * @param {ShipmentDto} row
 */
export function upsertShipment(row) {
  const i = memoryShipments.findIndex((s) => s.id === row.id)
  if (i === -1) memoryShipments.push({ ...row, lines: row.lines.map((l) => ({ ...l })) })
  else memoryShipments[i] = { ...row, lines: row.lines.map((l) => ({ ...l })) }
}

/**
 * @param {string} salesOrderId
 * @returns {ShipmentDto[]}
 */
export function getShipmentsForSalesOrder(salesOrderId) {
  return cloneShipments(memoryShipments.filter((s) => s.salesOrderId === salesOrderId))
}

/**
 * @param {string} salesOrderId
 * @returns {typeof ORDER_LINE_SEEDS}
 */
export function getLineSeedsForSalesOrder(salesOrderId) {
  const persisted = getOrderLinesForSalesOrder(salesOrderId)
  if (persisted.length) return persisted
  return ORDER_LINE_SEEDS.filter((l) => l.salesOrderId === salesOrderId)
}

/** @returns {ShipmentDto[]} */
export function getAllShipmentsSnapshot() {
  return cloneShipments(memoryShipments)
}

/**
 * @param {string} shipmentId
 * @returns {ShipmentDto | undefined}
 */
export function findShipmentById(shipmentId) {
  return memoryShipments.find((s) => s.id === shipmentId)
}
