import { DEMO_TODAY } from '../data/constants.js'
import { DIGITAL_WORKER_STATUS } from '../contracts/v1/digitalWorker.js'
import {
  WORKER_PIPELINE_ORDER,
  WORKER_PIPELINE_STAGE,
  WORKER_DISPLAY_NAMES,
} from '../contracts/v1/workerOrchestration.js'
import { formatDurationMs } from './digitalWorkforceCore.js'
import {
  buildCeoTimelineMessage,
  buildChainCompleteMessage,
  buildRoutedWorkerTask,
  isPipelineRouteAllowed,
  readOrderBusinessSnapshot,
  resolveNextWorkerInPipeline,
  resolveWorkerActivityTone,
} from './workerOrchestrationRules.js'
import {
  completeWorkerTask,
  dequeueNextTask,
  enqueueWorkerTask,
  listWorkerTasks,
  peekTaskQueue,
  subscribeDigitalWorkforceStore,
} from '../services/mockDigitalWorkforceStore.js'
import {
  recordOrchestrationChainCompleted,
  recordWorkerTaskCompletedEvent,
} from '../services/workerOrchestrationAudit.js'
import {
  recordCollectionSpecialistTaskAudit,
} from '../services/aiCollectionSpecialistService.js'
import {
  recordProcurementSpecialistTaskAudit,
} from '../services/aiProcurementSpecialistService.js'
import {
  recordShipmentSpecialistTaskAudit,
} from '../services/aiShipmentSpecialistService.js'
import { recordSalesFollowUpTaskAudit } from '../services/aiSalesFollowUpService.js'
import { executeRealAiWorkerTask } from '../services/aiWorkerRunner.js'
import { canUseRealAiWorkers } from '../config/aiWorkerConfig.js'
import {
  isDigitalEmployeeEnabled,
  shouldRunDigitalEmployeeForWorker,
} from '../config/digitalEmployeeConfig.js'
import { runDigitalEmployeeFlow } from '../services/ai-employee/digitalEmployeeRunner.js'
import { resetAiEmployeeRunState } from '../services/ai-employee/aiEmployeeActivityStore.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../contracts/v1/aiSalesFollowUp.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../contracts/v1/aiShipmentSpecialist.js'
import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../contracts/v1/aiCollectionSpecialist.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from '../contracts/v1/aiProcurementSpecialist.js'

/** @typedef {import('../contracts/v1/workerOrchestration.js').OrchestrationHistoryEntry} OrchestrationHistoryEntry */
/** @typedef {import('../contracts/v1/workerOrchestration.js').CeoOrchestrationTimelineItem} CeoOrchestrationTimelineItem */
/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../contracts/v1/workerTask.js').WorkerTask} WorkerTask */

const DEMO_TASK_DURATION_MS = 3200
const DEMO_TICK_MS = 400

/** @type {Record<string, (task: WorkerTask, assessment: object) => void>} */
const ROUTE_AUDIT_BY_WORKER = {
  [AI_SALES_FOLLOW_UP_WORKER_ID]: recordSalesFollowUpTaskAudit,
  [AI_SHIPMENT_SPECIALIST_WORKER_ID]: recordShipmentSpecialistTaskAudit,
  [AI_COLLECTION_SPECIALIST_WORKER_ID]: recordCollectionSpecialistTaskAudit,
  [AI_PROCUREMENT_SPECIALIST_WORKER_ID]: recordProcurementSpecialistTaskAudit,
}

/**
 * FAZ 30 — Worker Orchestrator
 * WorkerStore üzerinde çalışır; Business Engine core'a dokunmaz.
 */
export class WorkerOrchestrator {
  constructor() {
    /** @type {OrchestrationHistoryEntry[]} */
    this.orchestrationHistory = []
    /** @type {CeoOrchestrationTimelineItem[]} */
    this.ceoTimeline = []
    /** @type {Map<string, { workerId: string, orderId: string, tone: string }>} */
    this.activeByOrderId = new Map()
    /** @type {Map<string, { taskId: string, orderId: string, startedAt: number, chainId: string }>} */
    this.processingByWorker = new Map()
    /** @type {Set<() => void>} */
    this.listeners = new Set()
    this.demoMode = true
    this.realAiMode = false
    this.digitalEmployeeMode = false
    this.running = false
    this.lastTickAt = 0
    /** @type {Order[]} */
    this.orders = []
    /** @type {SalesOrderListItemDto[]} */
    this.dtos = []
    this.todayIso = DEMO_TODAY
    /** @type {(() => void) | null} */
    this.unsubscribeStore = null
    /** @type {number | null} */
    this.rafId = null
    /** @type {Set<string>} */
    this.aiPendingWorkers = new Set()
    this.version = 0
  }

  /** @param {{ demoMode?: boolean, realAiMode?: boolean, digitalEmployeeMode?: boolean, orders?: Order[], dtos?: SalesOrderListItemDto[], todayIso?: string }} [options] */
  configure(options = {}) {
    if (options.demoMode !== undefined) this.demoMode = options.demoMode
    if (options.realAiMode !== undefined) this.realAiMode = options.realAiMode
    if (options.digitalEmployeeMode !== undefined) {
      this.digitalEmployeeMode = options.digitalEmployeeMode
    } else if (isDigitalEmployeeEnabled()) {
      this.digitalEmployeeMode = true
    }
    if (options.realAiMode === undefined && canUseRealAiWorkers()) {
      this.realAiMode = true
      this.demoMode = false
    }
    if (options.orders) this.orders = options.orders
    if (options.dtos) this.dtos = options.dtos
    if (options.todayIso) this.todayIso = options.todayIso
    this.bump()
  }

  /** @param {() => void} listener */
  subscribe(listener) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  notify() {
    this.version += 1
    for (const listener of this.listeners) listener()
  }

  bump() {
    this.notify()
  }

  start() {
    if (this.running) return
    this.running = true
    if (!this.unsubscribeStore) {
      this.unsubscribeStore = subscribeDigitalWorkforceStore(() => this.bump())
    }
    this.scheduleTick()
  }

  stop() {
    this.running = false
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId)
      this.rafId = null
    }
  }

  reset() {
    this.stop()
    this.orchestrationHistory = []
    this.ceoTimeline = []
    this.activeByOrderId.clear()
    this.processingByWorker.clear()
    this.aiPendingWorkers.clear()
    this.version = 0
  }

  scheduleTick() {
    if (!this.running) return
    this.rafId = requestAnimationFrame((now) => {
      if (now - this.lastTickAt >= DEMO_TICK_MS) {
        this.tick(now)
        this.lastTickAt = now
      }
      this.scheduleTick()
    })
  }

  /** @param {number} nowMs */
  tick(nowMs = Date.now()) {
    if (this.realAiMode) {
      this.tickRealAi(nowMs)
      return
    }
    if (this.digitalEmployeeMode) {
      this.tickDigitalEmployee(nowMs)
      return
    }
    if (!this.demoMode) return

    for (const workerId of WORKER_PIPELINE_ORDER) {
      const processing = this.processingByWorker.get(workerId)
      if (processing && nowMs - processing.startedAt >= DEMO_TASK_DURATION_MS) {
        this.finalizeProcessing(workerId, processing)
      }
    }

    for (const workerId of WORKER_PIPELINE_ORDER) {
      if (this.processingByWorker.has(workerId)) continue
      const queue = peekTaskQueue('priority', workerId)
      if (!queue.length) continue
      const next = dequeueNextTask(workerId, 'priority')
      if (!next) continue
      const chainId = next.createdBy?.startsWith('orchestrator:')
        ? `chain-${next.relatedEntityId}`
        : `chain-${next.relatedEntityId}-${next.id}`
      this.processingByWorker.set(workerId, {
        taskId: next.id,
        orderId: next.relatedEntityId ?? '—',
        startedAt: nowMs,
        chainId,
      })
      if (next.relatedEntityId) {
        this.activeByOrderId.set(next.relatedEntityId, {
          workerId,
          orderId: next.relatedEntityId,
          tone: resolveWorkerActivityTone(workerId),
        })
      }
      this.bump()
    }
  }

  /** @param {number} nowMs */
  tickRealAi(nowMs) {
    void nowMs
    for (const workerId of WORKER_PIPELINE_ORDER) {
      const processing = this.processingByWorker.get(workerId)
      if (processing && !this.aiPendingWorkers.has(workerId)) {
        this.aiPendingWorkers.add(workerId)
        if (shouldRunDigitalEmployeeForWorker(workerId)) {
          void this.runDigitalEmployeeAndFinalize(workerId, processing)
        } else {
          void this.runRealAiAndFinalize(workerId, processing)
        }
      }
    }

    for (const workerId of WORKER_PIPELINE_ORDER) {
      if (this.processingByWorker.has(workerId)) continue
      const queue = peekTaskQueue('priority', workerId)
      if (!queue.length) continue
      const next = dequeueNextTask(workerId, 'priority')
      if (!next) continue
      const chainId = next.createdBy?.startsWith('orchestrator:')
        ? `chain-${next.relatedEntityId}`
        : `chain-${next.relatedEntityId}-${next.id}`
      this.processingByWorker.set(workerId, {
        taskId: next.id,
        orderId: next.relatedEntityId ?? '—',
        startedAt: nowMs,
        chainId,
      })
      if (next.relatedEntityId) {
        this.activeByOrderId.set(next.relatedEntityId, {
          workerId,
          orderId: next.relatedEntityId,
          tone: resolveWorkerActivityTone(workerId),
        })
      }
      this.bump()
    }
  }

  /**
   * FAZ 44 — Demo + digital employee: AI Sales gerçek akış, diğerleri demo timer.
   * @param {number} nowMs
   */
  tickDigitalEmployee(nowMs) {
    for (const workerId of WORKER_PIPELINE_ORDER) {
      if (workerId === AI_SALES_FOLLOW_UP_WORKER_ID) {
        const processing = this.processingByWorker.get(workerId)
        if (processing && !this.aiPendingWorkers.has(workerId)) {
          this.aiPendingWorkers.add(workerId)
          void this.runDigitalEmployeeAndFinalize(workerId, processing)
        }
        continue
      }
      const processing = this.processingByWorker.get(workerId)
      if (processing && nowMs - processing.startedAt >= DEMO_TASK_DURATION_MS) {
        this.finalizeProcessing(workerId, processing)
      }
    }

    for (const workerId of WORKER_PIPELINE_ORDER) {
      if (this.processingByWorker.has(workerId)) continue
      const queue = peekTaskQueue('priority', workerId)
      if (!queue.length) continue
      const next = dequeueNextTask(workerId, 'priority')
      if (!next) continue
      const chainId = next.createdBy?.startsWith('orchestrator:')
        ? `chain-${next.relatedEntityId}`
        : `chain-${next.relatedEntityId}-${next.id}`
      this.processingByWorker.set(workerId, {
        taskId: next.id,
        orderId: next.relatedEntityId ?? '—',
        startedAt: nowMs,
        chainId,
      })
      if (next.relatedEntityId) {
        this.activeByOrderId.set(next.relatedEntityId, {
          workerId,
          orderId: next.relatedEntityId,
          tone: resolveWorkerActivityTone(workerId),
        })
      }
      this.bump()
    }
  }

  /**
   * @param {string} workerId
   * @param {{ taskId: string, orderId: string, startedAt: number, chainId: string }} processing
   */
  async runDigitalEmployeeAndFinalize(workerId, processing) {
    const tasks = listWorkerTasks()
    const task = tasks.find((t) => t.id === processing.taskId)
    let outcome = 'COMPLETED'
    let resultText = ''
    try {
      if (task) {
        const run = await runDigitalEmployeeFlow({
          workerId,
          task,
          orders: this.orders,
          dtos: this.dtos,
          todayIso: this.todayIso,
        })
        if (!run.success) {
          outcome = 'FAILED'
        }
        resultText = run.resultText || run.assessment?.taskTitle || task.title
      }
    } catch {
      outcome = 'FAILED'
      resetAiEmployeeRunState(workerId)
    } finally {
      this.aiPendingWorkers.delete(workerId)
      this.finalizeProcessing(workerId, processing, outcome, resultText)
    }
  }

  /**
   * @param {string} workerId
   * @param {{ taskId: string, orderId: string, startedAt: number, chainId: string }} processing
   */
  async runRealAiAndFinalize(workerId, processing) {
    const tasks = listWorkerTasks()
    const task = tasks.find((t) => t.id === processing.taskId)
    try {
      if (task) {
        await executeRealAiWorkerTask(
          workerId,
          task,
          this.orders,
          this.dtos,
          this.todayIso,
          { executeTools: true },
        )
      }
    } finally {
      this.aiPendingWorkers.delete(workerId)
      this.finalizeProcessing(workerId, processing)
    }
  }

  /**
   * @param {string} workerId
   * @param {{ taskId: string, orderId: string, startedAt: number, chainId: string }} processing
   * @param {'COMPLETED' | 'FAILED'} [outcome]
   * @param {string} [resultText]
   */
  finalizeProcessing(workerId, processing, outcome = 'COMPLETED', resultText = '') {
    const entry = completeWorkerTask(processing.taskId, outcome, resultText)
    this.processingByWorker.delete(workerId)
    if (processing.orderId) this.activeByOrderId.delete(processing.orderId)

    if (!entry) {
      this.bump()
      return
    }

    const nextWorkerId = resolveNextWorkerInPipeline(workerId)
    let routedTaskId = null

    recordWorkerTaskCompletedEvent(entry, {
      toWorkerId: nextWorkerId,
      chainId: processing.chainId,
    })

    this.appendOrchestrationHistory(entry, nextWorkerId, null, processing.chainId)
    this.appendCeoTimelineEntry(entry, processing.chainId)

    if (nextWorkerId && entry.relatedEntityId) {
      const order = this.orders.find((o) => o.id === entry.relatedEntityId)
      const dto = this.dtos.find((d) => d.id === entry.relatedEntityId)
      if (order) {
        const snap = readOrderBusinessSnapshot(order, dto, this.todayIso)
        if (isPipelineRouteAllowed(nextWorkerId, snap)) {
          const nowIso = new Date().toISOString()
          const routed = buildRoutedWorkerTask(
            nextWorkerId,
            entry.relatedEntityId,
            this.orders,
            this.dtos,
            this.todayIso,
            nowIso,
            workerId,
            processing.chainId,
          )
          if (routed?.task) {
            enqueueWorkerTask({
              ...routed.task,
              createdBy: `orchestrator:${workerId}`,
            })
            routedTaskId = routed.task.id
            const auditFn = ROUTE_AUDIT_BY_WORKER[nextWorkerId]
            if (auditFn && routed.assessment) {
              auditFn(routed.task, routed.assessment)
            }
            if (this.orchestrationHistory[0]) {
              this.orchestrationHistory[0].routedTaskId = routedTaskId
              this.orchestrationHistory[0].toWorkerId = nextWorkerId
            }
          }
        }
      }
    } else if (
      !nextWorkerId &&
      entry.relatedEntityId &&
      workerId === AI_PROCUREMENT_SPECIALIST_WORKER_ID
    ) {
      const occurredAt = entry.finishedAt ?? new Date().toISOString()
      recordOrchestrationChainCompleted(entry.relatedEntityId, processing.chainId, occurredAt)
      this.ceoTimeline.unshift({
        id: `ceo-chain-${processing.chainId}`,
        timeLabel: formatTimelineClock(occurredAt),
        workerLabel: 'Operasyon',
        workerId: 'chain',
        message: buildChainCompleteMessage(entry.relatedEntityId),
        orderId: entry.relatedEntityId,
        occurredAt,
        kind: 'chain',
        tone: 'success',
      })
    }

    this.bump()
  }

  /**
   * @param {import('../contracts/v1/workerTask.js').WorkerTaskHistoryEntry} entry
   * @param {string | null} toWorkerId
   * @param {string | null} routedTaskId
   * @param {string} chainId
   */
  appendOrchestrationHistory(entry, toWorkerId, routedTaskId, chainId) {
    const stage = WORKER_PIPELINE_STAGE[entry.workerId] ?? 'SALES'
    /** @type {OrchestrationHistoryEntry} */
    const record = {
      id: `orch-${entry.id}`,
      taskId: entry.id,
      orderId: entry.relatedEntityId ?? '—',
      fromWorkerId: entry.workerId,
      toWorkerId,
      routedTaskId,
      pipelineStage: stage,
      chainId,
      durationMs: entry.durationMs,
      durationSeconds: Math.round(entry.durationMs / 1000),
      durationLabel: entry.durationLabel,
      outcome: entry.status,
      taskTitle: entry.title,
      finishedAt: entry.finishedAt ?? entry.completedAt ?? new Date().toISOString(),
    }
    this.orchestrationHistory.unshift(record)
    if (this.orchestrationHistory.length > 100) {
      this.orchestrationHistory.length = 100
    }
  }

  /**
   * @param {import('../contracts/v1/workerTask.js').WorkerTaskHistoryEntry} entry
   * @param {string} chainId
   */
  appendCeoTimelineEntry(entry, chainId) {
    const occurredAt = entry.finishedAt ?? entry.completedAt ?? new Date().toISOString()
    this.ceoTimeline.unshift({
      id: `ceo-${entry.id}`,
      timeLabel: formatTimelineClock(occurredAt),
      workerLabel: WORKER_DISPLAY_NAMES[entry.workerId] ?? entry.workerId,
      workerId: entry.workerId,
      message: buildCeoTimelineMessage(entry),
      orderId: entry.relatedEntityId ?? '—',
      occurredAt,
      kind: 'worker',
      tone: resolveWorkerActivityTone(entry.workerId),
    })
    if (this.ceoTimeline.length > 40) this.ceoTimeline.length = 40
    void chainId
  }

  getOrchestrationHistory() {
    return this.orchestrationHistory.slice()
  }

  getCeoTimeline(limit = 20) {
    return this.ceoTimeline.slice(0, limit)
  }

  /** @returns {Map<string, { workerId: string, orderId: string, tone: string }>} */
  getActiveOrdersMap() {
    return new Map(this.activeByOrderId)
  }

  /** @param {string} workerId */
  getWorkerQueueDepth(workerId) {
    return peekTaskQueue('priority', workerId).length
  }

  /** Demo: ilk sales görevi yoksa seed zinciri başlat */
  seedDemoChainIfIdle() {
    const salesQueue = peekTaskQueue('priority', AI_SALES_FOLLOW_UP_WORKER_ID)
    if (salesQueue.length > 0) return false
    const waiting = listWorkerTasks().filter((t) => t.status === DIGITAL_WORKER_STATUS.WAITING)
    if (waiting.length > 0) return false
    return false
  }
}

/** @param {string} iso */
function formatTimelineClock(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

/** @type {WorkerOrchestrator | null} */
let sharedOrchestrator = null

export function getWorkerOrchestrator() {
  if (!sharedOrchestrator) sharedOrchestrator = new WorkerOrchestrator()
  return sharedOrchestrator
}

export function resetWorkerOrchestrator() {
  if (sharedOrchestrator) {
    sharedOrchestrator.reset()
    if (sharedOrchestrator.unsubscribeStore) {
      sharedOrchestrator.unsubscribeStore()
      sharedOrchestrator.unsubscribeStore = null
    }
  }
  sharedOrchestrator = null
}

/**
 * @param {{ demoMode?: boolean, orders?: Order[], dtos?: SalesOrderListItemDto[], todayIso?: string }} [options]
 */
export function initWorkerOrchestrator(options = {}) {
  const orchestrator = getWorkerOrchestrator()
  orchestrator.configure(options)
  orchestrator.start()
  return orchestrator
}

export function subscribeWorkerOrchestrator(listener) {
  return getWorkerOrchestrator().subscribe(listener)
}

export function getOrchestrationSnapshot() {
  const o = getWorkerOrchestrator()
  return {
    version: o.version,
    history: o.getOrchestrationHistory(),
    ceoTimeline: o.getCeoTimeline(),
    activeByOrderId: o.getActiveOrdersMap(),
  }
}
