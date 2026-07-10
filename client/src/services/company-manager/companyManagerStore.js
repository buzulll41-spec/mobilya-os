import { DEMO_TODAY } from '../../data/constants.js'
import { DIGITAL_WORKER_STATUS } from '../../contracts/v1/digitalWorker.js'
import { AI_COMPANY_MANAGER_WORKER_ID } from '../../contracts/v1/aiCompanyManager.js'
import { PIPELINE_WORKERS } from '../../engine/company-manager/ConflictResolver.js'

/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */

/**
 * @typedef {Object} CompanyStatusSnapshot
 * @property {number} activeWorkers
 * @property {number} waitingWorkers
 * @property {number} busyWorkers
 * @property {number} idleWorkers
 * @property {number} totalQueue
 * @property {number} totalProcessing
 */

/**
 * @typedef {Object} CompanyManagerDailyStats
 * @property {number} decisionsToday
 * @property {number} tasksDistributed
 * @property {number} tasksCompleted
 * @property {number} tasksCancelled
 * @property {number} pendingApproval
 */

/**
 * @typedef {Object} OperationFeedItem
 * @property {string} id
 * @property {string} headline
 * @property {string} message
 * @property {string} occurredAt
 * @property {string} [decisionType]
 * @property {string} tone
 */

/** @type {CompanyManagerDecisionDto[]} */
let decisionHistory = []

/** @type {OperationFeedItem[]} */
let operationFeed = []

/** @type {CompanyManagerDailyStats} */
let dailyStats = {
  decisionsToday: 0,
  tasksDistributed: 0,
  tasksCompleted: 0,
  tasksCancelled: 0,
  pendingApproval: 0,
}

/** @type {CompanyStatusSnapshot | null} */
let lastCompanyStatus = null

/** @type {{ scanAt: string, dominantDomain: string, conflictCount: number, decisionCount: number } | null} */
let lastScanMeta = null

/** @type {Set<() => void>} */
const listeners = new Set()

let version = 0

function bump() {
  version += 1
  for (const listener of listeners) listener()
}

/** @param {() => void} listener */
export function subscribeCompanyManagerStore(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCompanyManagerStoreVersion() {
  return version
}

/**
 * @param {ReturnType<import('../mockDigitalWorkforceStore.js').getDigitalWorkforceCoreSnapshot>} snapshot
 */
export function buildCompanyStatusFromSnapshot(snapshot) {
  const pipeline = snapshot.workers.filter((w) => PIPELINE_WORKERS.includes(w.id))
  const activeWorkers = pipeline.filter(
    (w) => w.enabled && w.status !== DIGITAL_WORKER_STATUS.PAUSED,
  ).length
  const waitingWorkers = pipeline.filter((w) => w.status === DIGITAL_WORKER_STATUS.WAITING).length
  const busyWorkers = pipeline.filter((w) => w.status === DIGITAL_WORKER_STATUS.RUNNING).length
  const idleWorkers = pipeline.filter(
    (w) =>
      w.enabled &&
      w.status !== DIGITAL_WORKER_STATUS.RUNNING &&
      w.status !== DIGITAL_WORKER_STATUS.WAITING,
  ).length
  const totalQueue = snapshot.tasks.filter(
    (t) =>
      PIPELINE_WORKERS.includes(t.workerId) &&
      (t.status === DIGITAL_WORKER_STATUS.WAITING ||
        t.status === DIGITAL_WORKER_STATUS.HUMAN_APPROVAL),
  ).length
  const totalProcessing = snapshot.tasks.filter(
    (t) => PIPELINE_WORKERS.includes(t.workerId) && t.status === DIGITAL_WORKER_STATUS.RUNNING,
  ).length

  return {
    activeWorkers,
    waitingWorkers,
    busyWorkers,
    idleWorkers,
    totalQueue,
    totalProcessing,
  }
}

/**
 * @param {CompanyManagerDecisionDto[]} decisions
 */
export function appendCompanyManagerDecisions(decisions) {
  if (!decisions.length) return
  decisionHistory = [...decisions, ...decisionHistory].slice(0, 200)

  const feedItems = decisions.map((d) => ({
    id: d.id,
    headline: 'AI Company Manager',
    message: d.message,
    occurredAt: d.occurredAt,
    decisionType: d.type,
    tone:
      d.type === 'RISK_REDUCED'
        ? 'success'
        : d.type === 'PROCUREMENT_STOP' || d.type === 'CANCEL_TASK'
          ? 'warning'
          : 'info',
  }))
  operationFeed = [...feedItems, ...operationFeed].slice(0, 60)

  const today = DEMO_TODAY
  const todayDecisions = decisionHistory.filter((d) => d.occurredAt.slice(0, 10) === today)
  dailyStats = {
    ...dailyStats,
    decisionsToday: todayDecisions.length,
    tasksDistributed: todayDecisions.filter((d) => d.type === 'CREATE_TASK').length,
    tasksCancelled: todayDecisions.filter((d) => d.type === 'CANCEL_TASK').length,
  }
  bump()
}

/**
 * @param {{
 *   scanAt: string
 *   dominantDomain: string
 *   conflictCount: number
 *   decisionCount: number
 *   companyStatus: CompanyStatusSnapshot
 *   pendingApproval: number
 *   tasksCompletedToday?: number
 * }} meta
 */
export function recordCompanyManagerScan(meta) {
  lastScanMeta = {
    scanAt: meta.scanAt,
    dominantDomain: meta.dominantDomain,
    conflictCount: meta.conflictCount,
    decisionCount: meta.decisionCount,
  }
  lastCompanyStatus = meta.companyStatus
  dailyStats = {
    ...dailyStats,
    pendingApproval: meta.pendingApproval,
    tasksCompleted: meta.tasksCompletedToday ?? dailyStats.tasksCompleted,
  }
  bump()
}

/** @param {number} completed */
export function recordCompanyManagerTaskCompleted(completed = 1) {
  dailyStats = { ...dailyStats, tasksCompleted: dailyStats.tasksCompleted + completed }
  bump()
}

export function getCompanyManagerDecisionHistory(limit = 30) {
  return decisionHistory.slice(0, limit)
}

export function getCompanyManagerOperationFeed(limit = 20) {
  return operationFeed.slice(0, limit)
}

export function getCompanyManagerDailyStats() {
  return { ...dailyStats }
}

export function getCompanyManagerStatus() {
  return lastCompanyStatus ? { ...lastCompanyStatus } : null
}

export function getLastCompanyManagerScanMeta() {
  return lastScanMeta ? { ...lastScanMeta } : null
}

/** @returns {{ decision: CompanyManagerDecisionDto | null, activeWorkerCount: number, lastDecisionLabel: string, lastDecisionType: string, workloadLabel: string }} */
export function getCompanyManagerCardState() {
  const latest = decisionHistory[0] ?? null
  return {
    decision: latest,
    activeWorkerCount: lastCompanyStatus?.activeWorkers ?? 0,
    lastDecisionLabel: latest?.message ?? 'Operasyon taranıyor…',
    lastDecisionType: latest?.type ?? 'IDLE',
    workloadLabel: lastCompanyStatus
      ? `${lastCompanyStatus.totalQueue} kuyruk · ${lastCompanyStatus.totalProcessing} işlem`
      : '—',
  }
}

export function resetCompanyManagerStore() {
  decisionHistory = []
  operationFeed = []
  dailyStats = {
    decisionsToday: 0,
    tasksDistributed: 0,
    tasksCompleted: 0,
    tasksCancelled: 0,
    pendingApproval: 0,
  }
  lastCompanyStatus = null
  lastScanMeta = null
  version = 0
}

export { AI_COMPANY_MANAGER_WORKER_ID }

export {}
