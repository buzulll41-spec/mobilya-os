/** @typedef {import('../../contracts/v1/aiCompany.js').CompanyGoalsDto} CompanyGoalsDto */

/** @type {CompanyGoalsDto} */
const DEFAULT_GOALS = {
  collectionRateTarget: 85,
  shipmentDelayMaxPct: 5,
  procurementWaitMaxPct: 3,
  riskyReceivableMax: 200_000,
  updatedAt: '2026-05-14T09:00:00.000Z',
  updatedBy: 'system',
}

/** @type {CompanyGoalsDto} */
let goals = { ...DEFAULT_GOALS }

/** @type {Set<() => void>} */
const listeners = new Set()

function bump() {
  for (const listener of listeners) listener()
}

/** @param {() => void} listener */
export function subscribeCompanyGoals(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** @returns {CompanyGoalsDto} */
export function getCompanyGoals() {
  return { ...goals }
}

/**
 * CEO hedef güncellemesi.
 * @param {Partial<CompanyGoalsDto>} patch
 * @param {string} [updatedBy]
 */
export function updateCompanyGoals(patch, updatedBy = 'CEO') {
  goals = {
    ...goals,
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy,
  }
  bump()
  return getCompanyGoals()
}

export function resetCompanyGoalsStore() {
  goals = { ...DEFAULT_GOALS }
  listeners.clear()
}
