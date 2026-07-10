import { AI_COMPANY_MANAGER_WORKER_ID } from '../../contracts/v1/aiCompanyManager.js'
import {
  getCompanyManagerCardState,
  getCompanyManagerDailyStats,
  getCompanyManagerDecisionHistory,
  getCompanyManagerOperationFeed,
  getCompanyManagerStatus,
  getLastCompanyManagerScanMeta,
} from '../../services/company-manager/companyManagerStore.js'
import { buildDigitalWorkerExperienceCardVm } from './digitalWorkforceModel.js'

/** @typedef {import('../../contracts/v1/digitalWorker.js').DigitalWorker} DigitalWorker */
/** @typedef {import('../../contracts/v1/workerTask.js').WorkerTask} WorkerTask */
/** @typedef {import('../../contracts/v1/workerTask.js').WorkerTaskHistoryEntry} WorkerTaskHistoryEntry */

export { AI_COMPANY_MANAGER_WORKER_ID }

export function buildDigitalCompanyStatusKpis(status) {
  const s = status ?? {
    activeWorkers: 0,
    waitingWorkers: 0,
    busyWorkers: 0,
    idleWorkers: 0,
    totalQueue: 0,
    totalProcessing: 0,
  }
  return [
    { id: 'active', label: 'Aktif çalışan', value: String(s.activeWorkers), valueTone: 'success' },
    { id: 'waiting', label: 'Bekleyen çalışan', value: String(s.waitingWorkers), valueTone: 'info' },
    { id: 'busy', label: 'Yoğun çalışan', value: String(s.busyWorkers), valueTone: 'warning' },
    { id: 'idle', label: 'Boşta çalışan', value: String(s.idleWorkers), valueTone: 'neutral' },
    { id: 'queue', label: 'Toplam Queue', value: String(s.totalQueue), valueTone: s.totalQueue > 0 ? 'info' : 'neutral' },
    {
      id: 'processing',
      label: 'Toplam İşlem',
      value: String(s.totalProcessing),
      valueTone: s.totalProcessing > 0 ? 'warning' : 'neutral',
    },
  ]
}

/**
 * @param {DigitalWorker | null | undefined} managerWorker
 * @param {WorkerTask[]} tasks
 * @param {WorkerTaskHistoryEntry[]} taskHistory
 * @param {import('../../contracts/v1/workerTask.js').WorkerPerformanceMetrics} [performance]
 */
export function buildCompanyManagerCardVm(managerWorker, tasks, taskHistory, performance) {
  if (!managerWorker) return null
  const base = buildDigitalWorkerExperienceCardVm(managerWorker, tasks, taskHistory, performance)
  const state = getCompanyManagerCardState()
  const scan = getLastCompanyManagerScanMeta()
  return {
    ...base,
    displayName: 'Company Manager',
    managerStatusLabel: scan ? `Tarama · ${scan.dominantDomain}` : 'Idle',
    managerDecisionLabel: state.lastDecisionLabel,
    managerLastDecisionType: state.lastDecisionType,
    managerActiveWorkers: state.activeWorkerCount,
    managerWorkloadLabel: state.workloadLabel,
    isManagerCard: true,
  }
}

export function buildOperationFeedVm(limit = 12) {
  return getCompanyManagerOperationFeed(limit).map((item) => ({
    ...item,
    timeLabel: item.occurredAt.slice(11, 16),
  }))
}

export function buildCeoAiCompanySummaryVm() {
  const stats = getCompanyManagerDailyStats()
  return {
    headline: 'AI COMPANY SUMMARY',
    items: [
      { id: 'decisions', label: 'Bugün alınan karar', value: String(stats.decisionsToday) },
      { id: 'distributed', label: 'Dağıtılan görev', value: String(stats.tasksDistributed) },
      { id: 'completed', label: 'Tamamlanan görev', value: String(stats.tasksCompleted) },
      { id: 'cancelled', label: 'İptal edilen görev', value: String(stats.tasksCancelled) },
      { id: 'approval', label: 'Bekleyen approval', value: String(stats.pendingApproval) },
    ],
  }
}

export function buildCompanyManagerHubExtras(workers, tasks, taskHistory, performanceList) {
  const perfById = new Map(performanceList.map((p) => [p.workerId, p]))
  const managerWorker = workers.find((w) => w.id === AI_COMPANY_MANAGER_WORKER_ID) ?? null
  const companyStatus = getCompanyManagerStatus()
  return {
    companyStatusKpis: buildDigitalCompanyStatusKpis(companyStatus),
    companyManagerCard: buildCompanyManagerCardVm(
      managerWorker,
      tasks,
      taskHistory,
      perfById.get(AI_COMPANY_MANAGER_WORKER_ID),
    ),
    operationFeed: buildOperationFeedVm(),
    decisionHistory: getCompanyManagerDecisionHistory(15),
  }
}

export {}
