import { BusinessEngine } from './businessEngine.js'
import {
  DIGITAL_WORKER_STATUS,
  WORKER_PRIORITY,
} from '../contracts/v1/digitalWorker.js'

/** @typedef {import('../contracts/v1/digitalWorker.js').DigitalWorker} DigitalWorker */
/** @typedef {import('../contracts/v1/workerTask.js').WorkerTask} WorkerTask */
/** @typedef {import('../contracts/v1/workerTask.js').WorkerTaskHistoryEntry} WorkerTaskHistoryEntry */
/** @typedef {import('../contracts/v1/workerTask.js').WorkerPerformanceMetrics} WorkerPerformanceMetrics */
/** @typedef {import('../contracts/v1/businessEngine.js').OrderBusinessSnapshot} OrderBusinessSnapshot */
/** @typedef {'fifo' | 'priority'} QueueMode */

/** @type {Record<string, number>} */
export const PRIORITY_RANK = {
  CRITICAL: 0,
  HIGH: 1,
  NORMAL: 2,
  LOW: 3,
}

/**
 * @param {WorkerTask} a
 * @param {WorkerTask} b
 */
export function compareFifo(a, b) {
  return a.createdAt.localeCompare(b.createdAt)
}

/**
 * @param {WorkerTask} a
 * @param {WorkerTask} b
 */
export function comparePriorityQueue(a, b) {
  const pa = PRIORITY_RANK[a.priority] ?? 9
  const pb = PRIORITY_RANK[b.priority] ?? 9
  if (pa !== pb) return pa - pb
  return compareFifo(a, b)
}

/**
 * @param {WorkerTask[]} tasks
 * @param {QueueMode} [mode='priority']
 */
export function sortTaskQueue(tasks, mode = 'priority') {
  const pending = tasks.filter(
    (t) =>
      t.status === DIGITAL_WORKER_STATUS.WAITING ||
      t.status === DIGITAL_WORKER_STATUS.HUMAN_APPROVAL,
  )
  const cmp = mode === 'fifo' ? compareFifo : comparePriorityQueue
  return pending.slice().sort(cmp)
}

/**
 * @param {number} ms
 */
export function formatDurationMs(ms) {
  if (ms <= 0) return '0 dk'
  const minutes = Math.round(ms / 60_000)
  if (minutes < 60) return `${minutes} dk`
  const hours = Math.round(minutes / 60)
  return hours === 1 ? '1 saat' : `${hours} saat`
}

/**
 * @param {WorkerTask} task
 * @returns {WorkerTaskHistoryEntry}
 */
export function toTaskHistoryEntry(task) {
  const start = task.startedAt ? Date.parse(task.startedAt) : Date.parse(task.createdAt)
  const end = task.finishedAt ? Date.parse(task.finishedAt) : start
  const durationMs = Math.max(0, end - start)
  return {
    ...task,
    durationMs,
    durationLabel: formatDurationMs(durationMs),
  }
}

/**
 * @param {string} workerId
 * @param {WorkerTask[]} tasks
 * @param {WorkerTaskHistoryEntry[]} history
 */
export function computeWorkerPerformance(workerId, tasks, history) {
  const completed = [
    ...history.filter((h) => h.workerId === workerId),
    ...tasks.filter(
      (t) =>
        t.workerId === workerId &&
        (t.status === DIGITAL_WORKER_STATUS.COMPLETED ||
          t.status === DIGITAL_WORKER_STATUS.FAILED) &&
        t.finishedAt,
    ),
  ].map((t) => ('durationMs' in t ? t : toTaskHistoryEntry(t)))

  const successfulTasks = completed.filter((t) => t.status === DIGITAL_WORKER_STATUS.COMPLETED).length
  const failedTasks = completed.filter((t) => t.status === DIGITAL_WORKER_STATUS.FAILED).length
  const totalTasks = completed.length
  const averageDurationMs =
    totalTasks > 0
      ? Math.round(completed.reduce((s, t) => s + t.durationMs, 0) / totalTasks)
      : 0
  const successRate = totalTasks > 0 ? Math.round((successfulTasks / totalTasks) * 100) : 0

  return {
    workerId,
    totalTasks,
    successfulTasks,
    failedTasks,
    averageDurationMs,
    averageDurationLabel: formatDurationMs(averageDurationMs),
    successRate,
  }
}

/** @param {OrderBusinessSnapshot} snap */
export function resolveWorkerIdForSnapshot(snap) {
  const action = snap.nextAction.toLowerCase()
  if (action.includes('tahsilat') || action.includes('müşteri')) return 'dw-collection'
  if (action.includes('tedarik') || action.includes('depo')) return 'dw-procurement'
  if (action.includes('sevk') || action.includes('teslim')) return 'dw-shipment'
  if (action.includes('ssh')) return 'dw-customer-care'
  if (snap.currentStage.includes('DEPOSIT') || snap.currentStage.includes('NEW')) {
    return 'dw-sales-follow-up'
  }
  if (snap.priority === 'CRITICAL' && snap.riskScores.collection >= 50) return 'dw-collection'
  return 'dw-ceo-assistant'
}

/**
 * @param {OrderBusinessSnapshot} snap
 * @param {string} workerId
 * @param {string} nowIso
 */
export function buildTaskFromBusinessSnapshot(snap, workerId, nowIso) {
  /** @type {import('../contracts/v1/digitalWorker.js').WorkerPriorityLevel} */
  const priority =
    snap.priority === 'CRITICAL'
      ? WORKER_PRIORITY.CRITICAL
      : snap.priority === 'HIGH'
        ? WORKER_PRIORITY.HIGH
        : snap.priority === 'NORMAL'
          ? WORKER_PRIORITY.NORMAL
          : WORKER_PRIORITY.LOW

  return {
    id: `wt-be-${snap.orderId}-${Date.parse(nowIso)}`,
    workerId,
    title: snap.nextAction.replace(/\.$/, ''),
    description: `${snap.currentStageLabel} · ${snap.orderId}`,
    priority,
    status: DIGITAL_WORKER_STATUS.WAITING,
    sourceModule: 'business-engine',
    targetModule: snap.kanbanColumnId,
    relatedEntityId: snap.orderId,
    relatedModule: 'business-engine',
    createdAt: nowIso,
    startedAt: null,
    finishedAt: null,
    completedAt: null,
    result: null,
    createdBy: 'BusinessEngine',
  }
}

/**
 * @param {import('../data/seedOrders.js').Order[]} orders
 * @param {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]} listItemDtos
 * @param {DigitalWorker[]} workers
 * @param {string} todayIso
 * @param {string} nowIso
 */
export function buildTasksFromBusinessEngine(orders, listItemDtos, workers, todayIso, nowIso) {
  const enabledIds = new Set(workers.filter((w) => w.enabled).map((w) => w.id))
  const snapshots = BusinessEngine.computeOrderSnapshots(orders, listItemDtos, todayIso)

  /** @type {WorkerTask[]} */
  const out = []
  for (const snap of snapshots.values()) {
    if (snap.priority !== 'CRITICAL' && snap.priority !== 'HIGH') continue
    if (snap.nextAction === '—') continue
    const workerId = resolveWorkerIdForSnapshot(snap)
    if (!enabledIds.has(workerId)) continue
    out.push(buildTaskFromBusinessSnapshot(snap, workerId, nowIso))
  }
  return out
}

/**
 * @param {WorkerTask[]} tasks
 * @param {DigitalWorker[]} workers
 * @param {WorkerTaskHistoryEntry[]} [taskHistory]
 */
export function buildWorkforceDashboardMetrics(tasks, workers, taskHistory = []) {
  const activeWorkers = workers.filter(
    (w) => w.enabled && w.status !== DIGITAL_WORKER_STATUS.PAUSED,
  ).length
  const waitingTasks = tasks.filter(
    (t) =>
      t.status === DIGITAL_WORKER_STATUS.WAITING ||
      t.status === DIGITAL_WORKER_STATUS.HUMAN_APPROVAL,
  ).length
  const runningTasks = tasks.filter((t) => t.status === DIGITAL_WORKER_STATUS.RUNNING).length
  const completedInQueue = tasks.filter((t) => t.status === DIGITAL_WORKER_STATUS.COMPLETED).length
  const completedTasks = taskHistory.length + completedInQueue

  return {
    totalWorkers: workers.length,
    activeWorkers,
    waitingTasks,
    runningTasks,
    completedTasks,
  }
}

export const DigitalWorkforceCore = {
  sortTaskQueue,
  compareFifo,
  comparePriorityQueue,
  computeWorkerPerformance,
  buildTasksFromBusinessEngine,
  buildWorkforceDashboardMetrics,
  resolveWorkerIdForSnapshot,
}

export default DigitalWorkforceCore
