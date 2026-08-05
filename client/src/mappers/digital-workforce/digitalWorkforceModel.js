import { DEMO_TODAY } from '../../data/constants.js'
import { BusinessEngine } from '../../engine/businessEngine.js'
import {
  DIGITAL_WORKER_STATUS,
  DIGITAL_WORKER_STATUS_LABEL,
  DIGITAL_WORKER_STATUS_TONE,
  WORKER_PRIORITY_LABEL,
} from '../../contracts/v1/digitalWorker.js'
import { buildWorkforceDashboardMetrics } from '../../engine/digitalWorkforceCore.js'
import { formatShortDate } from '../../utils/dates.js'
import {
  AI_SPECIALIST_WORKER_IDS,
  aggregateAverageDurationLabel,
  buildDigitalWorkforceTaskRowVm,
  filterEngineHintsForWorker,
  partitionWorkerTasks,
  resolveDigitalWorkerTheme,
  resolveExperienceStatusLabel,
  resolveExperienceStatusTone,
  resolveLastActionLabel,
  resolveLastCompletedTitle,
} from './digitalWorkforceExperience.js'
import {
  buildWorkerMemoryRowVm,
  listMemories,
} from '../../services/memory/mockAiWorkerMemoryStore.js'
import {
  buildToolExecutionRowVm,
  listExecutionsLocal,
} from '../../services/ai-tools/mockAiToolExecutionStore.js'
import { WORKER_ID_TO_CODE } from '../../contracts/v1/aiWorkerMemory.js'
import {
  buildDrawerLiveActivityVm,
  buildDrawerLlmConversationVm,
} from './aiEmployeeActivityModel.js'

/** @typedef {import('../../contracts/v1/digitalWorker.js').DigitalWorker} DigitalWorker */
/** @typedef {import('../../contracts/v1/workerTask.js').WorkerTask} WorkerTask */
/** @typedef {import('../../contracts/v1/workerTask.js').WorkerTaskHistoryEntry} WorkerTaskHistoryEntry */
/** @typedef {import('../../contracts/v1/workerTask.js').WorkerPerformanceMetrics} WorkerPerformanceMetrics */

/** FAZ 44 — Digital employee drawer tabs */
export const DIGITAL_WORKFORCE_FUTURE_TABS = [
  { id: 'overview', label: 'Overview', active: true },
  { id: 'tasks', label: 'Tasks', active: true },
  { id: 'memory', label: 'Memory', active: true },
  { id: 'tool-history', label: 'Tool History', active: true },
  { id: 'live-activity', label: 'Live Activity', active: true },
  { id: 'llm-conversation', label: 'LLM Conversation', active: true },
]

const PRIORITY_SORT = { CRITICAL: 0, HIGH: 1, NORMAL: 2, LOW: 3 }

/**
 * @param {WorkerTask[]} tasks
 * @param {WorkerTaskHistoryEntry[]} taskHistory
 * @param {string} workerId
 * @param {string} [todayIso]
 */
function taskStatsForWorker(tasks, taskHistory, workerId, todayIso = DEMO_TODAY) {
  const mine = tasks.filter((t) => t.workerId === workerId)
  const historyMine = taskHistory.filter((h) => h.workerId === workerId)
  const allEntries = [...mine, ...historyMine]
  const pending = mine.filter(
    (t) =>
      t.status === DIGITAL_WORKER_STATUS.WAITING ||
      t.status === DIGITAL_WORKER_STATUS.RUNNING ||
      t.status === DIGITAL_WORKER_STATUS.HUMAN_APPROVAL,
  ).length
  const running = mine.filter((t) => t.status === DIGITAL_WORKER_STATUS.RUNNING).length
  const completed =
    mine.filter((t) => t.status === DIGITAL_WORKER_STATUS.COMPLETED).length + historyMine.length
  const tasksToday = allEntries.filter(
    (t) =>
      (t.status === DIGITAL_WORKER_STATUS.COMPLETED ||
        t.status === DIGITAL_WORKER_STATUS.RUNNING ||
        t.status === DIGITAL_WORKER_STATUS.WAITING) &&
      (t.createdAt?.slice(0, 10) === todayIso ||
        t.finishedAt?.slice(0, 10) === todayIso ||
        t.completedAt?.slice(0, 10) === todayIso),
  ).length
  return { pending, running, completed, tasksToday, total: mine.length + historyMine.length }
}

/**
 * FAZ 28 — deneyim KPI şeridi (dört AI uzmanı odaklı).
 * @param {DigitalWorker[]} workers
 * @param {WorkerTask[]} tasks
 * @param {WorkerTaskHistoryEntry[]} [taskHistory]
 * @param {WorkerPerformanceMetrics[]} [performanceList]
 * @param {string} [todayIso]
 */
export function buildDigitalWorkforceExperienceKpis(
  workers,
  tasks,
  taskHistory = [],
  performanceList = [],
  todayIso = DEMO_TODAY,
) {
  const specialists = workers.filter((w) => AI_SPECIALIST_WORKER_IDS.includes(/** @type {typeof AI_SPECIALIST_WORKER_IDS[number]} */ (w.id)))
  const specialistPerf = performanceList.filter((p) =>
    AI_SPECIALIST_WORKER_IDS.includes(/** @type {typeof AI_SPECIALIST_WORKER_IDS[number]} */ (p.workerId)),
  )
  const activeAi = specialists.filter(
    (w) => w.enabled && w.status !== DIGITAL_WORKER_STATUS.PAUSED,
  ).length
  const pendingTasks = tasks.filter(
    (t) =>
      AI_SPECIALIST_WORKER_IDS.includes(/** @type {typeof AI_SPECIALIST_WORKER_IDS[number]} */ (t.workerId)) &&
      (t.status === DIGITAL_WORKER_STATUS.WAITING ||
        t.status === DIGITAL_WORKER_STATUS.RUNNING ||
        t.status === DIGITAL_WORKER_STATUS.HUMAN_APPROVAL),
  ).length
  const completedToday = [
    ...tasks.filter(
      (t) =>
        AI_SPECIALIST_WORKER_IDS.includes(/** @type {typeof AI_SPECIALIST_WORKER_IDS[number]} */ (t.workerId)) &&
        t.status === DIGITAL_WORKER_STATUS.COMPLETED &&
        (t.finishedAt?.slice(0, 10) === todayIso || t.completedAt?.slice(0, 10) === todayIso),
    ),
    ...taskHistory.filter(
      (h) =>
        AI_SPECIALIST_WORKER_IDS.includes(/** @type {typeof AI_SPECIALIST_WORKER_IDS[number]} */ (h.workerId)) &&
        h.finishedAt?.slice(0, 10) === todayIso,
    ),
  ].length
  const successRates = specialistPerf.map((p) => p.successRate).filter((n) => n > 0)
  const avgSuccess =
    successRates.length > 0
      ? Math.round(successRates.reduce((a, b) => a + b, 0) / successRates.length)
      : 0

  return [
    {
      id: 'active-ai',
      label: 'Aktif AI',
      value: String(activeAi),
      valueTone: activeAi > 0 ? 'success' : 'neutral',
    },
    {
      id: 'pending-tasks',
      label: 'Bekleyen Görev',
      value: String(pendingTasks),
      valueTone: pendingTasks > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'completed-today',
      label: 'Bugün Tamamlanan',
      value: String(completedToday),
      valueTone: completedToday > 0 ? 'success' : 'neutral',
    },
    {
      id: 'success-rate',
      label: 'Başarı Oranı',
      value: `${avgSuccess}%`,
      valueTone: avgSuccess >= 80 ? 'success' : avgSuccess >= 50 ? 'warning' : 'neutral',
    },
    {
      id: 'avg-duration',
      label: 'Ortalama Görev Süresi',
      value: aggregateAverageDurationLabel(specialistPerf),
    },
  ]
}

/**
 * @param {DigitalWorker} worker
 * @param {WorkerTask[]} tasks
 * @param {WorkerTaskHistoryEntry[]} [taskHistory]
 * @param {WorkerPerformanceMetrics} [performance]
 * @param {string} [todayIso]
 */
export function buildDigitalWorkerExperienceCardVm(
  worker,
  tasks,
  taskHistory = [],
  performance,
  todayIso = DEMO_TODAY,
) {
  const theme = resolveDigitalWorkerTheme(worker.id)
  const parts = partitionWorkerTasks(tasks, taskHistory, worker.id, todayIso)
  const stats = taskStatsForWorker(tasks, taskHistory, worker.id, todayIso)
  const experienceStatusLabel = resolveExperienceStatusLabel(worker.status, parts.pending.length > 0)
  const experienceStatusTone = resolveExperienceStatusTone(worker.status, parts.pending.length > 0)

  return {
    id: worker.id,
    code: worker.code,
    name: worker.name,
    displayName: theme.shortName,
    role: worker.role,
    department: worker.department,
    icon: worker.icon,
    avatar: worker.avatar,
    description: worker.description,
    theme,
    status: worker.status,
    statusLabel: DIGITAL_WORKER_STATUS_LABEL[worker.status] ?? worker.status,
    statusTone: DIGITAL_WORKER_STATUS_TONE[worker.status] ?? 'muted',
    experienceStatusLabel,
    experienceStatusTone,
    priority: worker.priority,
    priorityLabel: WORKER_PRIORITY_LABEL[worker.priority] ?? worker.priority,
    enabled: worker.enabled,
    tasksToday: parts.todayTasks.length,
    tasksPending: stats.pending,
    tasksRunning: stats.running,
    tasksCompleted: stats.completed,
    successRate: performance?.successRate ?? 0,
    averageDurationLabel: performance?.averageDurationLabel ?? '0 dk',
    lastActionLabel: resolveLastActionLabel(worker, parts),
    lastCompletedTaskTitle: resolveLastCompletedTitle(parts.lastCompleted),
    isRunning: worker.status === DIGITAL_WORKER_STATUS.RUNNING,
    isPulsing: worker.status === DIGITAL_WORKER_STATUS.RUNNING,
  }
}

/**
 * @param {DigitalWorker[]} workers
 * @param {WorkerTask[]} tasks
 * @param {WorkerPerformanceMetrics[]} [performanceList]
 * @param {WorkerTaskHistoryEntry[]} [taskHistory]
 * @param {ReturnType<typeof buildDigitalWorkforceTaskHintsFromEngine>} [engineHints]
 */
export function buildDigitalWorkforceExperienceHub(
  workers,
  tasks,
  performanceList = [],
  taskHistory = [],
  engineHints = [],
) {
  const perfById = new Map(performanceList.map((p) => [p.workerId, p]))
  const specialistWorkers = workers.filter((w) =>
    AI_SPECIALIST_WORKER_IDS.includes(/** @type {typeof AI_SPECIALIST_WORKER_IDS[number]} */ (w.id)),
  )

  return {
    kpis: buildDigitalWorkforceExperienceKpis(workers, tasks, taskHistory, performanceList),
    cards: specialistWorkers
      .slice()
      .sort(
        (a, b) =>
          (PRIORITY_SORT[a.priority] ?? 9) - (PRIORITY_SORT[b.priority] ?? 9),
      )
      .map((w) =>
        buildDigitalWorkerExperienceCardVm(
          w,
          tasks,
          taskHistory,
          perfById.get(w.id),
          DEMO_TODAY,
        ),
      ),
    engineHints,
  }
}

/**
 * @param {DigitalWorker} worker
 * @param {WorkerTask[]} tasks
 * @param {WorkerTaskHistoryEntry[]} [taskHistory]
 * @param {WorkerPerformanceMetrics} [performance]
 * @param {ReturnType<typeof buildDigitalWorkforceTaskHintsFromEngine>} [engineHints]
 */
export function buildDigitalWorkerExperienceDetailVm(
  worker,
  tasks,
  taskHistory = [],
  performance,
  engineHints = [],
) {
  const card = buildDigitalWorkerExperienceCardVm(worker, tasks, taskHistory, performance)
  const parts = partitionWorkerTasks(tasks, taskHistory, worker.id)
  const workerTasks = tasks.filter((t) => t.workerId === worker.id)
  const workerHints = filterEngineHintsForWorker(engineHints, workerTasks)
  const workerCode = WORKER_ID_TO_CODE[worker.id] ?? worker.code
  const memoryRows = listMemories({ workerCode, limit: 20 }).map(buildWorkerMemoryRowVm)
  const toolExecutionRows = listExecutionsLocal({ workerId: worker.id, limit: 25 }).map(
    buildToolExecutionRowVm,
  )

  return {
    ...card,
    createdAtLabel: formatShortDate(worker.createdAt.slice(0, 10)),
    updatedAtLabel: formatShortDate(worker.updatedAt.slice(0, 10)),
    futureTabs: DIGITAL_WORKFORCE_FUTURE_TABS,
    memoryRows,
    toolExecutionRows,
    liveActivity: buildDrawerLiveActivityVm(worker.id),
    llmConversation: buildDrawerLlmConversationVm(worker.id),
    performance: performance ?? {
      workerId: worker.id,
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageDurationMs: 0,
      averageDurationLabel: '0 dk',
      successRate: 0,
    },
    todayTasks: parts.todayTasks.map((t) => buildDigitalWorkforceTaskRowVm(t)),
    pendingTasks: parts.pending.map((t) => buildDigitalWorkforceTaskRowVm(t)),
    completedTasks: [
      ...parts.completedToday.map((t) => buildDigitalWorkforceTaskRowVm(t)),
      ...taskHistory
        .filter((h) => h.workerId === worker.id)
        .slice(0, 12)
        .map((h) => buildDigitalWorkforceTaskRowVm(h)),
    ],
    taskHistory: taskHistory
      .filter((h) => h.workerId === worker.id)
      .slice(0, 15)
      .map((h) => buildDigitalWorkforceTaskRowVm(h)),
    engineRisks: workerHints,
    createdTasks: workerTasks.slice(0, 20).map((t) => buildDigitalWorkforceTaskRowVm(t)),
  }
}

/**
 * @param {DigitalWorker[]} workers
 * @param {WorkerTask[]} tasks
 * @param {WorkerTaskHistoryEntry[]} [taskHistory]
 */
export function buildDigitalWorkforceKpis(workers, tasks, taskHistory = []) {
  const m = buildWorkforceDashboardMetrics(tasks, workers, taskHistory)
  return [
    { id: 'total', label: 'Toplam çalışan', value: String(m.totalWorkers) },
    {
      id: 'active',
      label: 'Aktif çalışan',
      value: String(m.activeWorkers),
      valueTone: m.activeWorkers > 0 ? 'success' : 'neutral',
    },
    {
      id: 'waiting-tasks',
      label: 'Bekleyen görev',
      value: String(m.waitingTasks),
      valueTone: m.waitingTasks > 0 ? 'info' : 'neutral',
    },
    {
      id: 'running-tasks',
      label: 'Çalışan görev',
      value: String(m.runningTasks),
      valueTone: m.runningTasks > 0 ? 'warning' : 'neutral',
    },
    {
      id: 'completed-tasks',
      label: 'Tamamlanan görev',
      value: String(m.completedTasks),
      valueTone: m.completedTasks > 0 ? 'success' : 'neutral',
    },
  ]
}

/**
 * @param {DigitalWorker} worker
 * @param {WorkerTask[]} tasks
 * @param {WorkerTaskHistoryEntry[]} [taskHistory]
 * @param {WorkerPerformanceMetrics} [performance]
 * @param {string} [todayIso]
 */
export function buildDigitalWorkerCardVm(
  worker,
  tasks,
  taskHistory = [],
  performance,
  todayIso = DEMO_TODAY,
) {
  const stats = taskStatsForWorker(tasks, taskHistory, worker.id, todayIso)
  const lastAction = worker.lastRun
    ? formatShortDate(worker.lastRun.slice(0, 10))
    : 'Henüz çalışmadı'

  return {
    id: worker.id,
    code: worker.code,
    name: worker.name,
    role: worker.role,
    department: worker.department,
    icon: worker.icon,
    avatar: worker.avatar,
    description: worker.description,
    status: worker.status,
    statusLabel: DIGITAL_WORKER_STATUS_LABEL[worker.status] ?? worker.status,
    statusTone: DIGITAL_WORKER_STATUS_TONE[worker.status] ?? 'muted',
    priority: worker.priority,
    priorityLabel: WORKER_PRIORITY_LABEL[worker.priority] ?? worker.priority,
    enabled: worker.enabled,
    tasksToday: stats.tasksToday,
    tasksPending: stats.pending,
    tasksRunning: stats.running,
    tasksCompleted: stats.completed,
    successRate: performance?.successRate ?? 0,
    lastActionLabel: lastAction,
  }
}

/**
 * @param {DigitalWorker[]} workers
 * @param {WorkerTask[]} tasks
 * @param {WorkerPerformanceMetrics[]} [performanceList]
 * @param {WorkerTaskHistoryEntry[]} [taskHistory]
 */
export function buildDigitalWorkforceHub(workers, tasks, performanceList = [], taskHistory = []) {
  const perfById = new Map(performanceList.map((p) => [p.workerId, p]))
  return {
    kpis: buildDigitalWorkforceKpis(workers, tasks, taskHistory),
    cards: workers
      .slice()
      .sort(
        (a, b) =>
          (PRIORITY_SORT[a.priority] ?? 9) - (PRIORITY_SORT[b.priority] ?? 9),
      )
      .map((w) =>
        buildDigitalWorkerCardVm(w, tasks, taskHistory, perfById.get(w.id), DEMO_TODAY),
      ),
  }
}

/**
 * @param {DigitalWorker} worker
 * @param {WorkerTask[]} tasks
 * @param {WorkerTaskHistoryEntry[]} [taskHistory]
 * @param {WorkerPerformanceMetrics} [performance]
 */
export function buildDigitalWorkerDetailVm(worker, tasks, taskHistory = [], performance) {
  const card = buildDigitalWorkerCardVm(worker, tasks, taskHistory, performance)
  return {
    ...card,
    createdAtLabel: formatShortDate(worker.createdAt.slice(0, 10)),
    updatedAtLabel: formatShortDate(worker.updatedAt.slice(0, 10)),
    futureTabs: DIGITAL_WORKFORCE_FUTURE_TABS,
    performance: performance ?? {
      workerId: worker.id,
      totalTasks: 0,
      successfulTasks: 0,
      failedTasks: 0,
      averageDurationMs: 0,
      averageDurationLabel: '0 dk',
      successRate: 0,
    },
    taskHistory: taskHistory.slice(0, 10),
    queuePreview: tasks
      .filter(
        (t) =>
          t.workerId === worker.id &&
          (t.status === DIGITAL_WORKER_STATUS.WAITING ||
            t.status === DIGITAL_WORKER_STATUS.HUMAN_APPROVAL),
      )
      .slice(0, 5),
  }
}

/**
 * Digital Workforce görev ipuçları — Business Engine nextAction özetinden (FAZ 22A).
 * @param {import('../../data/seedOrders.js').Order[]} orders
 * @param {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]} listItemDtos
 * @param {string} todayIso
 */
export function buildDigitalWorkforceTaskHintsFromEngine(orders, listItemDtos, todayIso) {
  const snapshots = BusinessEngine.computeOrderSnapshots(orders, listItemDtos, todayIso)
  return [...snapshots.values()]
    .filter((s) => s.priority === 'CRITICAL' || s.priority === 'HIGH')
    .sort((a, b) => a.healthScore - b.healthScore)
    .slice(0, 8)
    .map((s) => ({
      orderId: s.orderId,
      stage: s.currentStageLabel,
      nextAction: s.nextAction,
      priority: s.priority,
    }))
}
