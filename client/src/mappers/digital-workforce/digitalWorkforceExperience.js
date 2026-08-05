import { DEMO_TODAY } from '../../data/constants.js'
import { DIGITAL_WORKER_STATUS, DIGITAL_WORKER_STATUS_LABEL } from '../../contracts/v1/digitalWorker.js'
import { WORKER_PRIORITY_LABEL } from '../../contracts/v1/digitalWorker.js'
import { formatDurationMs, toTaskHistoryEntry } from '../../engine/digitalWorkforceCore.js'
import { relativeTimeLabelTr } from '../timeline/relativeTimeLabelTr.js'
import { AI_COMPANY_MANAGER_WORKER_ID } from '../../contracts/v1/aiCompanyManager.js'

/** @typedef {import('../../contracts/v1/digitalWorker.js').DigitalWorker} DigitalWorker */
/** @typedef {import('../../contracts/v1/workerTask.js').WorkerTask} WorkerTask */
/** @typedef {import('../../contracts/v1/workerTask.js').WorkerTaskHistoryEntry} WorkerTaskHistoryEntry */
/** @typedef {import('../../contracts/v1/workerTask.js').WorkerPerformanceMetrics} WorkerPerformanceMetrics */

export { AI_COMPANY_MANAGER_WORKER_ID }

/** FAZ 28 — ana ekranda gösterilen dört AI uzmanı. */
export const AI_SPECIALIST_WORKER_IDS = /** @type {const} */ ([
  'dw-sales-follow-up',
  'dw-collection',
  'dw-shipment',
  'dw-procurement',
])

/**
 * @typedef {'sales' | 'collection' | 'shipment' | 'procurement'} DigitalWorkerThemeId
 * @typedef {{
 *   id: DigitalWorkerThemeId
 *   shortName: string
 *   accent: string
 *   accentSoft: string
 *   accentBorder: string
 * }} DigitalWorkerTheme
 */

/** @type {Record<string, DigitalWorkerTheme>} */
export const DIGITAL_WORKER_THEMES = {
  'dw-sales-follow-up': {
    id: 'sales',
    shortName: 'AI Sales',
    accent: '#16a34a',
    accentSoft: '#f0fdf4',
    accentBorder: '#86efac',
  },
  'dw-collection': {
    id: 'collection',
    shortName: 'AI Collection',
    accent: '#ea580c',
    accentSoft: '#fff7ed',
    accentBorder: '#fdba74',
  },
  'dw-shipment': {
    id: 'shipment',
    shortName: 'AI Shipment',
    accent: '#2563eb',
    accentSoft: '#eff6ff',
    accentBorder: '#93c5fd',
  },
  'dw-procurement': {
    id: 'procurement',
    shortName: 'AI Procurement',
    accent: '#9333ea',
    accentSoft: '#faf5ff',
    accentBorder: '#d8b4fe',
  },
  [AI_COMPANY_MANAGER_WORKER_ID]: {
    id: 'sales',
    shortName: 'Company Manager',
    accent: '#0f766e',
    accentSoft: '#f0fdfa',
    accentBorder: '#5eead4',
  },
}

/** @param {string} workerId */
export function resolveDigitalWorkerTheme(workerId) {
  return (
    DIGITAL_WORKER_THEMES[workerId] ?? {
      id: /** @type {DigitalWorkerThemeId} */ ('sales'),
      shortName: 'AI Worker',
      accent: '#64748b',
      accentSoft: '#f8fafc',
      accentBorder: '#cbd5e1',
    }
  )
}

/**
 * @param {DigitalWorker['status']} status
 * @param {boolean} hasPending
 */
export function resolveExperienceStatusLabel(status, hasPending) {
  if (status === DIGITAL_WORKER_STATUS.RUNNING) return 'Çalışıyor'
  if (status === DIGITAL_WORKER_STATUS.WAITING || hasPending) return 'Bekliyor'
  return 'Hazır'
}

/** @param {DigitalWorker['status']} status @param {boolean} hasPending */
export function resolveExperienceStatusTone(status, hasPending) {
  if (status === DIGITAL_WORKER_STATUS.RUNNING) return 'warning'
  if (status === DIGITAL_WORKER_STATUS.WAITING || hasPending) return 'info'
  return 'success'
}

/** @param {string} issueId */
export function resolveWorkerIdFromCriticalIssueId(issueId) {
  if (issueId.startsWith('ai-sales:')) return 'dw-sales-follow-up'
  if (issueId.startsWith('ship:')) return 'dw-shipment'
  if (issueId.startsWith('proc:')) return 'dw-procurement'
  if (issueId.startsWith('coll:')) return 'dw-collection'
  return null
}

/**
 * @param {string} hash
 */
export function parseDigitalWorkforceWorkerFromHash(hash) {
  const query = hash.includes('?') ? hash.split('?')[1] : ''
  const params = new URLSearchParams(query)
  return params.get('worker') || params.get('workerId') || null
}

/** @param {string | null | undefined} workerId */
export function buildDigitalWorkforceHash(workerId) {
  if (!workerId) return '#/digital-workforce'
  return `#/digital-workforce?worker=${encodeURIComponent(workerId)}`
}

/**
 * @param {WorkerTask | WorkerTaskHistoryEntry} task
 * @param {string} [todayIso]
 */
export function buildDigitalWorkforceTaskRowVm(task, todayIso = DEMO_TODAY) {
  const durationMs =
    'durationMs' in task && task.durationMs
      ? task.durationMs
      : task.startedAt && task.finishedAt
        ? Math.max(0, Date.parse(task.finishedAt) - Date.parse(task.startedAt))
        : task.startedAt
          ? Math.max(0, Date.parse(`${todayIso}T12:00:00.000Z`) - Date.parse(task.startedAt))
          : 0
  const riskMatch = task.description?.match(/Risk nedeni:\s*([^·]+)/)
  return {
    id: task.id,
    title: task.title,
    description: task.description ?? '',
    status: task.status,
    statusLabel: DIGITAL_WORKER_STATUS_LABEL[task.status] ?? task.status,
    durationLabel:
      'durationLabel' in task && task.durationLabel
        ? task.durationLabel
        : formatDurationMs(durationMs),
    priority: task.priority,
    priorityLabel: WORKER_PRIORITY_LABEL[task.priority] ?? task.priority,
    sourceModule: task.sourceModule ?? task.relatedModule ?? '—',
    riskLabel: riskMatch?.[1]?.trim() || (WORKER_PRIORITY_LABEL[task.priority] ?? '—'),
    relatedEntityId: task.relatedEntityId ?? null,
    createdAt: task.createdAt,
    finishedAt: task.finishedAt ?? task.completedAt ?? null,
  }
}

/**
 * @param {WorkerTask[]} tasks
 * @param {WorkerTaskHistoryEntry[]} history
 * @param {string} workerId
 * @param {string} [todayIso]
 */
export function partitionWorkerTasks(tasks, history, workerId, todayIso = DEMO_TODAY) {
  const mine = tasks.filter((t) => t.workerId === workerId)
  const historyMine = history.filter((h) => h.workerId === workerId)
  const isToday = (iso) => iso?.slice(0, 10) === todayIso

  const pending = mine.filter(
    (t) =>
      t.status === DIGITAL_WORKER_STATUS.WAITING ||
      t.status === DIGITAL_WORKER_STATUS.RUNNING ||
      t.status === DIGITAL_WORKER_STATUS.HUMAN_APPROVAL ||
      t.status === DIGITAL_WORKER_STATUS.PREPARING,
  )
  const completedToday = [
    ...mine.filter((t) => t.status === DIGITAL_WORKER_STATUS.COMPLETED && isToday(t.finishedAt ?? t.completedAt)),
    ...historyMine.filter((h) => isToday(h.finishedAt)),
  ]
  const todayTasks = [...mine, ...historyMine].filter(
    (t) => isToday(t.createdAt) || isToday(t.finishedAt ?? t.completedAt),
  )

  const lastCompleted = historyMine[0] ?? mine.find((t) => t.status === DIGITAL_WORKER_STATUS.COMPLETED) ?? null

  return {
    pending,
    completedToday,
    todayTasks,
    lastCompleted,
    allActive: mine,
  }
}

/**
 * @param {DigitalWorker} worker
 * @param {ReturnType<typeof partitionWorkerTasks>} parts
 */
export function resolveLastActionLabel(worker, parts, todayIso = DEMO_TODAY) {
  if (worker.lastRun) {
    return relativeTimeLabelTr(worker.lastRun, todayIso)
  }
  if (parts.lastCompleted?.finishedAt) {
    return relativeTimeLabelTr(parts.lastCompleted.finishedAt, todayIso)
  }
  return 'Henüz işlem yok'
}

/** @param {WorkerTaskHistoryEntry | WorkerTask | null | undefined} entry */
export function resolveLastCompletedTitle(entry) {
  if (!entry) return '—'
  return entry.title
}

/** @param {WorkerTaskHistoryEntry[]} history */
export function aggregateSuccessRate(history, activeCompleted = 0) {
  const completed = history.filter((h) => h.status === DIGITAL_WORKER_STATUS.COMPLETED).length + activeCompleted
  const failed = history.filter((h) => h.status === DIGITAL_WORKER_STATUS.FAILED).length
  const total = completed + failed
  if (total <= 0) return 0
  return Math.round((completed / total) * 100)
}

/** @param {WorkerPerformanceMetrics[]} performanceList */
export function aggregateAverageDurationLabel(performanceList) {
  const withData = performanceList.filter((p) => p.totalTasks > 0)
  if (!withData.length) return '0 dk'
  const avgMs = Math.round(
    withData.reduce((s, p) => s + p.averageDurationMs, 0) / withData.length,
  )
  return formatDurationMs(avgMs)
}

/**
 * @param {ReturnType<import('./digitalWorkforceModel.js').buildDigitalWorkforceTaskHintsFromEngine>} hints
 * @param {WorkerTask[]} workerTasks
 */
export function filterEngineHintsForWorker(hints, workerTasks) {
  const orderIds = new Set(workerTasks.map((t) => t.relatedEntityId).filter(Boolean))
  if (!orderIds.size) return hints.slice(0, 6)
  return hints.filter((h) => orderIds.has(h.orderId)).slice(0, 6)
}

/** @param {WorkerTask} task */
export function ensureTaskHistoryShape(task) {
  return 'durationMs' in task ? task : toTaskHistoryEntry(task)
}
