/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */
/** @typedef {import('../../contracts/v1/aiCompany.js').CompanyMapEdgeDto} CompanyMapEdgeDto */
/** @typedef {import('../../contracts/v1/aiCompany.js').CompanyScenarioId} CompanyScenarioId */
/** @typedef {import('../../contracts/v1/aiCompany.js').CompanyGoalsDto} CompanyGoalsDto */

/**
 * @typedef {Object} AiCompanyStatusVm
 * @property {number} running
 * @property {number} busy
 * @property {number} risky
 * @property {number} waiting
 * @property {number} totalWorkers
 * @property {number} activeTasks
 * @property {number} pendingTasks
 * @property {number} completedTasks
 */

/** @type {CompanyManagerDecisionDto[]} */
let decisionLog = []

/** @type {CompanyMapEdgeDto[]} */
let mapEdges = []

/** @type {{ scenario: CompanyScenarioId, scanAt: string, dominantDomain: string, goals: CompanyGoalsDto } | null} */
let lastScan = null

/** @type {AiCompanyStatusVm | null} */
let lastStatus = null

/** @type {Set<() => void>} */
const listeners = new Set()

function bump() {
  for (const listener of listeners) listener()
}

/** @param {() => void} listener */
export function subscribeCompanyBrainStore(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/**
 * @param {{
 *   decisions: CompanyManagerDecisionDto[]
 *   edges: CompanyMapEdgeDto[]
 *   scenario: CompanyScenarioId
 *   scanAt: string
 *   dominantDomain: string
 *   goals: CompanyGoalsDto
 *   status: AiCompanyStatusVm
 * }} input
 */
export function recordCompanyBrainScan(input) {
  decisionLog = [...input.decisions, ...decisionLog].slice(0, 200)
  mapEdges = [...input.edges, ...mapEdges].slice(0, 40)
  lastScan = {
    scenario: input.scenario,
    scanAt: input.scanAt,
    dominantDomain: input.dominantDomain,
    goals: input.goals,
  }
  lastStatus = input.status
  bump()
}

export function getCompanyBrainDecisionLog(limit = 30) {
  return decisionLog.slice(0, limit)
}

export function getCompanyMapEdges(limit = 12) {
  return mapEdges.slice(0, limit)
}

export function getLastCompanyBrainScan() {
  return lastScan ? { ...lastScan, goals: { ...lastScan.goals } } : null
}

export function getAiCompanyStatus() {
  return lastStatus ? { ...lastStatus } : null
}

export function resetCompanyBrainStore() {
  decisionLog = []
  mapEdges = []
  lastScan = null
  lastStatus = null
  listeners.clear()
}

export {}
