const STORAGE_KEY = 'mobilya-shipment-groups-v1'

/**
 * @typedef {Object} ShipmentGroup
 * @property {string} id
 * @property {string} groupNo
 * @property {string} region
 * @property {string} vehicle
 * @property {string} crewLabel
 * @property {string} plannedDate
 * @property {string[]} orderIds
 * @property {number} orderCount
 * @property {number} totalAmount
 * @property {number} estimatedSavings
 * @property {string} createdAt
 */

/**
 * @returns {ShipmentGroup[]}
 */
export function loadAllShipmentGroups() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * @param {ShipmentGroup[]} groups
 */
function persistShipmentGroups(groups) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(groups))
}

/**
 * @param {{
 *   region: string
 *   vehicle: string
 *   crewLabel: string
 *   plannedDate: string
 *   orderIds: string[]
 *   totalAmount: number
 *   estimatedSavings: number
 * }} input
 * @returns {ShipmentGroup}
 */
export function createShipmentGroup(input) {
  const existing = loadAllShipmentGroups()
  const groupNo = `SG-${String(existing.length + 1).padStart(4, '0')}`
  const group = {
    id: `grp-${Date.now()}-${groupNo}`,
    groupNo,
    region: input.region,
    vehicle: input.vehicle,
    crewLabel: input.crewLabel,
    plannedDate: input.plannedDate,
    orderIds: [...input.orderIds],
    orderCount: input.orderIds.length,
    totalAmount: input.totalAmount,
    estimatedSavings: input.estimatedSavings,
    createdAt: new Date().toISOString(),
  }
  persistShipmentGroups([group, ...existing])
  return group
}
