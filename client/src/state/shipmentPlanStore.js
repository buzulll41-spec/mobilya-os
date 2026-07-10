const STORAGE_KEY = 'mobilya-shipment-plans-v1'

/**
 * @typedef {Object} ShipmentPlan
 * @property {string} [id]
 * @property {string} orderId
 * @property {string} plannedDate YYYY-MM-DD
 * @property {string} plannedTime HH:mm
 * @property {string} region
 * @property {string} vehicle
 * @property {string} crew1
 * @property {string} crew2
 * @property {string} note
 * @property {string} [groupId]
 * @property {string} [status]
 * @property {import('../constants/shipmentDeliveryTypes.js').typeof SHIPMENT_DELIVERY_TYPE[keyof typeof SHIPMENT_DELIVERY_TYPE]} [deliveryType]
 * @property {string} [missingItemId]
 * @property {string} [missingItemTitle]
 * @property {string} updatedAt ISO
 */

/**
 * @returns {Record<string, ShipmentPlan>}
 */
export function loadShipmentPlansRecord() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return /** @type {Record<string, ShipmentPlan>} */ (parsed)
  } catch {
    return {}
  }
}

/**
 * @returns {ShipmentPlan[]}
 */
export function loadAllShipmentPlans() {
  return Object.values(loadShipmentPlansRecord())
}

/**
 * @param {string} orderId
 * @returns {ShipmentPlan | null}
 */
export function getShipmentPlan(orderId) {
  if (!orderId) return null
  return loadShipmentPlansRecord()[orderId] ?? null
}

/**
 * @param {Record<string, ShipmentPlan>} record
 */
function persistShipmentPlansRecord(record) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record))
}

/**
 * @param {ShipmentPlan} plan
 * @returns {ShipmentPlan}
 */
export function saveShipmentPlan(plan) {
  const record = loadShipmentPlansRecord()
  const next = {
    ...plan,
    updatedAt: new Date().toISOString(),
  }
  record[plan.orderId] = next
  persistShipmentPlansRecord(record)
  return next
}

/**
 * @param {ShipmentPlan[]} plans
 * @returns {ShipmentPlan[]}
 */
export function saveShipmentPlansBatch(plans) {
  const record = loadShipmentPlansRecord()
  const saved = plans.map((plan) => {
    const next = { ...plan, updatedAt: new Date().toISOString() }
    record[plan.orderId] = next
    return next
  })
  persistShipmentPlansRecord(record)
  return saved
}

/**
 * @param {string} crew1
 * @param {string} crew2
 */
export function formatCrewLabel(crew1, crew2) {
  const parts = [crew1, crew2]
    .map((c) => (typeof c === 'string' ? c.trim() : ''))
    .filter((c) => c && c !== 'Belirlenmedi')
  if (!parts.length) return ''
  if (parts.length === 1) return parts[0]
  return `${parts[0]} + ${parts[1]}`
}

/**
 * @param {string | null | undefined} crewName
 * @returns {{ crew1: string, crew2: string }}
 */
export function parseCrewName(crewName) {
  const raw = typeof crewName === 'string' ? crewName.trim() : ''
  if (!raw) return { crew1: '', crew2: '' }
  const parts = raw.split(/\s*\+\s*/).map((p) => p.trim()).filter(Boolean)
  return { crew1: parts[0] ?? '', crew2: parts[1] ?? '' }
}

/**
 * @param {string | null | undefined} time
 */
export function normalizePlanTime(time) {
  if (typeof time !== 'string' || !time.trim()) return ''
  const m = time.trim().match(/^(\d{1,2}):(\d{2})$/)
  if (!m) return ''
  const h = Number.parseInt(m[1], 10)
  const min = Number.parseInt(m[2], 10)
  if (h < 0 || h > 23 || min < 0 || min > 59) return ''
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`
}
