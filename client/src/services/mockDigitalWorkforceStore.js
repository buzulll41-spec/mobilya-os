import {
  DIGITAL_WORKER_STATUS,
  WORKER_PRIORITY,
} from '../contracts/v1/digitalWorker.js'
import {
  buildTasksFromBusinessEngine,
  sortTaskQueue,
  toTaskHistoryEntry,
  computeWorkerPerformance,
} from '../engine/digitalWorkforceCore.js'
import {
  buildSalesFollowUpTasks,
  recordSalesFollowUpTaskAudit,
} from './aiSalesFollowUpService.js'
import {
  buildCollectionSpecialistTasks,
  recordCollectionSpecialistTaskAudit,
} from './aiCollectionSpecialistService.js'
import {
  buildShipmentSpecialistTasks,
  recordShipmentSpecialistTaskAudit,
} from './aiShipmentSpecialistService.js'
import {
  buildProcurementSpecialistTasks,
  recordProcurementSpecialistTaskAudit,
} from './aiProcurementSpecialistService.js'
import { AI_SALES_FOLLOW_UP_WORKER_ID } from '../contracts/v1/aiSalesFollowUp.js'
import { AI_COLLECTION_SPECIALIST_WORKER_ID } from '../contracts/v1/aiCollectionSpecialist.js'
import { AI_SHIPMENT_SPECIALIST_WORKER_ID } from '../contracts/v1/aiShipmentSpecialist.js'
import { AI_PROCUREMENT_SPECIALIST_WORKER_ID } from '../contracts/v1/aiProcurementSpecialist.js'
import { getAllDomainEventsSnapshot } from './mockDomainEventStore.js'
import { initialOrders } from '../data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../services/orderListItemProjection.js'
import { DEMO_TODAY } from '../data/constants.js'
import { bootstrapMockOrderLinesFromOrders } from './mockOrderLineBootstrap.js'

/** @typedef {import('../contracts/v1/digitalWorker.js').DigitalWorker} DigitalWorker */
/** @typedef {import('../contracts/v1/workerTask.js').WorkerTask} WorkerTask */
/** @typedef {import('../contracts/v1/workerTask.js').WorkerTaskHistoryEntry} WorkerTaskHistoryEntry */
/** @typedef {import('../engine/digitalWorkforceCore.js').QueueMode} QueueMode */

const BASE_ISO = '2026-05-01T08:00:00.000Z'
const NOW_ISO = `${DEMO_TODAY}T09:00:00.000Z`

/** @type {DigitalWorker[]} */
export const SEED_DIGITAL_WORKERS = [
  {
    id: 'dw-sales-follow-up',
    name: 'AI Sales Follow-Up',
    code: 'AI_SALES_FOLLOW_UP',
    role: 'Satış Takip Uzmanı',
    department: 'Satış',
    description: 'Satış sonrası müşterileri otomatik takip eder.',
    status: DIGITAL_WORKER_STATUS.PREPARING,
    priority: WORKER_PRIORITY.HIGH,
    enabled: true,
    avatar: 'SF',
    icon: '📞',
    lastRun: null,
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  },
  {
    id: 'dw-collection',
    name: 'AI Collection Specialist',
    code: 'AI_COLLECTION',
    role: 'Tahsilat Uzmanı',
    department: 'Finans',
    description: 'Yaklaşan ve geciken tahsilatları otomatik takip eder.',
    status: DIGITAL_WORKER_STATUS.PREPARING,
    priority: WORKER_PRIORITY.CRITICAL,
    enabled: true,
    avatar: 'CL',
    icon: '💳',
    lastRun: null,
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  },
  {
    id: 'dw-shipment',
    name: 'AI Shipment Specialist',
    code: 'AI_SHIPMENT',
    role: 'Sevk Uzmanı',
    department: 'Operasyon',
    description: 'Sevkleri otomatik takip eder.',
    status: DIGITAL_WORKER_STATUS.PREPARING,
    priority: WORKER_PRIORITY.HIGH,
    enabled: true,
    avatar: 'SH',
    icon: '🚚',
    lastRun: null,
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  },
  {
    id: 'dw-procurement',
    name: 'AI Procurement Specialist',
    code: 'AI_PROCUREMENT',
    role: 'Tedarik Uzmanı',
    department: 'Tedarik',
    description: 'Tedarik süreçlerini otomatik takip eder.',
    status: DIGITAL_WORKER_STATUS.PREPARING,
    priority: WORKER_PRIORITY.NORMAL,
    enabled: true,
    avatar: 'PR',
    icon: '📦',
    lastRun: null,
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  },
  {
    id: 'dw-customer-care',
    name: 'AI Customer Care',
    code: 'AI_CUSTOMER_CARE',
    role: 'Müşteri İlişkileri',
    department: 'Müşteri Hizmetleri',
    description: 'Müşteri ilişkileri',
    status: DIGITAL_WORKER_STATUS.PREPARING,
    priority: WORKER_PRIORITY.NORMAL,
    enabled: true,
    avatar: 'CC',
    icon: '💬',
    lastRun: null,
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  },
  {
    id: 'dw-ceo-assistant',
    name: 'AI Company Manager',
    code: 'AI_COMPANY_MANAGER',
    role: 'Dijital Operasyon Yöneticisi',
    department: 'Yönetim',
    description: 'Tüm AI çalışanlarını koordine eder; iş dağıtır, öncelik belirler, çakışmaları çözer.',
    status: DIGITAL_WORKER_STATUS.PREPARING,
    priority: WORKER_PRIORITY.CRITICAL,
    enabled: true,
    avatar: 'CM',
    icon: '🏢',
    lastRun: null,
    createdAt: BASE_ISO,
    updatedAt: BASE_ISO,
  },
]

/** @type {WorkerTask[]} */
const SEED_HISTORY_TASKS = [
  {
    id: 'wt-hist-1',
    workerId: 'dw-collection',
    title: 'Tahsilat hatırlatması',
    description: 'S-24105 · gecikmiş bakiye',
    priority: WORKER_PRIORITY.HIGH,
    status: DIGITAL_WORKER_STATUS.COMPLETED,
    sourceModule: 'business-engine',
    targetModule: 'collection',
    relatedEntityId: 'S-24105',
    relatedModule: 'collection',
    createdAt: '2026-05-13T10:00:00.000Z',
    startedAt: '2026-05-13T10:05:00.000Z',
    finishedAt: '2026-05-13T10:22:00.000Z',
    completedAt: '2026-05-13T10:22:00.000Z',
    result: 'Görev kuyruğa alındı (mock)',
    createdBy: 'BusinessEngine',
  },
]

/** @type {DigitalWorker[]} */
let workers = SEED_DIGITAL_WORKERS.map((w) => ({ ...w }))

/** @type {WorkerTask[]} */
let tasks = []

/** @type {WorkerTaskHistoryEntry[]} */
let taskHistory = SEED_HISTORY_TASKS.map((t) => toTaskHistoryEntry(t))

/** @type {Set<() => void>} */
const workforceListeners = new Set()

/** @param {() => void} listener */
export function subscribeDigitalWorkforceStore(listener) {
  workforceListeners.add(listener)
  return () => {
    workforceListeners.delete(listener)
  }
}

function notifyDigitalWorkforceChange() {
  for (const listener of workforceListeners) {
    listener()
  }
}

function seedEngineTasks() {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  bootstrapMockOrderLinesFromOrders(orders)
  const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  const domainEvents = getAllDomainEventsSnapshot()
  const beGenerated = buildTasksFromBusinessEngine(orders, dtos, workers, DEMO_TODAY, NOW_ISO).filter(
    (t) =>
      t.workerId !== AI_SALES_FOLLOW_UP_WORKER_ID &&
      t.workerId !== AI_COLLECTION_SPECIALIST_WORKER_ID &&
      t.workerId !== AI_SHIPMENT_SPECIALIST_WORKER_ID &&
      t.workerId !== AI_PROCUREMENT_SPECIALIST_WORKER_ID,
  )
  const salesPairs = buildSalesFollowUpTasks(
    orders,
    dtos,
    DEMO_TODAY,
    NOW_ISO,
    domainEvents,
    [],
  )
  const collectionPairs = buildCollectionSpecialistTasks(
    orders,
    dtos,
    DEMO_TODAY,
    NOW_ISO,
    domainEvents,
    [],
  )
  const shipmentPairs = buildShipmentSpecialistTasks(
    orders,
    dtos,
    DEMO_TODAY,
    NOW_ISO,
    domainEvents,
    [],
  )
  const procurementPairs = buildProcurementSpecialistTasks(
    orders,
    dtos,
    DEMO_TODAY,
    NOW_ISO,
    domainEvents,
    [],
  )
  tasks = [
    ...beGenerated.map((t) => ({ ...t })),
    ...salesPairs.map(({ task }) => ({ ...task })),
    ...collectionPairs.map(({ task }) => ({ ...task })),
    ...shipmentPairs.map(({ task }) => ({ ...task })),
    ...procurementPairs.map(({ task }) => ({ ...task })),
  ]
  refreshDigitalWorkerStatuses()
}

function refreshWorkerStatus(workerId) {
  const workerTasks = tasks.filter((t) => t.workerId === workerId)
  workers = workers.map((w) => {
    if (w.id !== workerId) return w
    if (coordinatorOverrides.has(workerId) || w.enabled === false) {
      return {
        ...w,
        status: DIGITAL_WORKER_STATUS.PAUSED,
        lastRun: workerTasks.length > 0 ? NOW_ISO : w.lastRun,
      }
    }
    const hasRunning = workerTasks.some((t) => t.status === DIGITAL_WORKER_STATUS.RUNNING)
    const hasWaiting = workerTasks.some(
      (t) =>
        t.status === DIGITAL_WORKER_STATUS.WAITING ||
        t.status === DIGITAL_WORKER_STATUS.HUMAN_APPROVAL,
    )
    return {
      ...w,
      status: hasRunning
        ? DIGITAL_WORKER_STATUS.RUNNING
        : hasWaiting
          ? DIGITAL_WORKER_STATUS.WAITING
          : DIGITAL_WORKER_STATUS.PREPARING,
      lastRun: workerTasks.length > 0 ? NOW_ISO : w.lastRun,
    }
  })
}

/** @type {Map<string, { pauseReason?: string }>} */
const coordinatorOverrides = new Map()

function refreshAllPipelineWorkerStatuses() {
  refreshWorkerStatus(AI_SALES_FOLLOW_UP_WORKER_ID)
  refreshWorkerStatus(AI_COLLECTION_SPECIALIST_WORKER_ID)
  refreshWorkerStatus(AI_SHIPMENT_SPECIALIST_WORKER_ID)
  refreshWorkerStatus(AI_PROCUREMENT_SPECIALIST_WORKER_ID)
}

function refreshDigitalWorkerStatuses() {
  refreshAllPipelineWorkerStatuses()
}

function refreshSalesWorkerStatus() {
  refreshDigitalWorkerStatuses()
}

export function resetDigitalWorkforceStore() {
  workers = SEED_DIGITAL_WORKERS.map((w) => ({ ...w }))
  taskHistory = SEED_HISTORY_TASKS.map((t) => toTaskHistoryEntry({ ...t }))
  coordinatorOverrides.clear()
  seedEngineTasks()
  notifyDigitalWorkforceChange()
}

resetDigitalWorkforceStore()

export function listDigitalWorkers() {
  return workers.map((w) => ({ ...w }))
}

/** @param {string} idOrCode */
export function getDigitalWorker(idOrCode) {
  return workers.find((w) => w.id === idOrCode || w.code === idOrCode) ?? null
}

/** @param {string} [workerId] */
export function listWorkerTasks(workerId) {
  const list = workerId ? tasks.filter((t) => t.workerId === workerId) : tasks
  return list.map((t) => ({
    ...t,
    relatedModule: t.relatedModule ?? t.sourceModule,
    completedAt: t.completedAt ?? t.finishedAt,
  }))
}

/** @param {string} [workerId] */
export function listTaskHistory(workerId) {
  const list = workerId ? taskHistory.filter((h) => h.workerId === workerId) : taskHistory
  return list.map((h) => ({ ...h }))
}

/**
 * @param {QueueMode} [mode='priority']
 * @param {string} [workerId]
 */
export function peekTaskQueue(mode = 'priority', workerId) {
  const scoped = workerId ? tasks.filter((t) => t.workerId === workerId) : tasks
  return sortTaskQueue(scoped, mode)
}

/**
 * @param {WorkerTask} task
 */
export function enqueueWorkerTask(task) {
  tasks = [...tasks, { ...task }]
  refreshDigitalWorkerStatuses()
  notifyDigitalWorkforceChange()
  return task
}

/**
 * @param {string} workerId
 * @param {QueueMode} [mode='priority']
 */
export function dequeueNextTask(workerId, mode = 'priority') {
  const worker = workers.find((w) => w.id === workerId)
  if (worker && (!worker.enabled || worker.status === DIGITAL_WORKER_STATUS.PAUSED)) {
    return null
  }
  const queue = peekTaskQueue(mode, workerId)
  const next = queue[0]
  if (!next) return null
  tasks = tasks.map((t) =>
    t.id === next.id
      ? {
          ...t,
          status: DIGITAL_WORKER_STATUS.RUNNING,
          startedAt: NOW_ISO,
        }
      : t,
  )
  return tasks.find((t) => t.id === next.id) ?? null
}

/**
 * @param {string} taskId
 * @param {'COMPLETED' | 'FAILED'} outcome
 * @param {string} [result]
 */
export function completeWorkerTask(taskId, outcome, result = '') {
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return null
  const finishedAt = NOW_ISO
  const updated = {
    ...task,
    status:
      outcome === 'COMPLETED'
        ? DIGITAL_WORKER_STATUS.COMPLETED
        : DIGITAL_WORKER_STATUS.FAILED,
    finishedAt,
    completedAt: finishedAt,
    result: result || (outcome === 'COMPLETED' ? 'Tamamlandı (mock)' : 'Başarısız (mock)'),
  }
  tasks = tasks.filter((t) => t.id !== taskId)
  const entry = toTaskHistoryEntry(updated)
  taskHistory = [entry, ...taskHistory]
  refreshDigitalWorkerStatuses()
  notifyDigitalWorkforceChange()
  return entry
}

/** @param {string} workerId */
export function getWorkerPerformance(workerId) {
  return computeWorkerPerformance(workerId, tasks, taskHistory)
}

/** @param {import('../data/seedOrders.js').Order[]} [orders] @param {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]} [dtos] */
export function syncSalesFollowUpTasks(orders, dtos) {
  const orderList = orders ?? initialOrders.filter((o) => o.status !== 'İptal')
  const dtoList =
    dtos ?? orderList.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  const domainEvents = getAllDomainEventsSnapshot()
  const existingTasks = listWorkerTasks()
  const pairs = buildSalesFollowUpTasks(
    orderList,
    dtoList,
    DEMO_TODAY,
    NOW_ISO,
    domainEvents,
    existingTasks,
  )
  const existingKeys = new Set(
    tasks.map((t) => `${t.workerId}:${t.relatedEntityId}:${t.title}`),
  )
  for (const { task, assessment } of pairs) {
    const key = `${task.workerId}:${task.relatedEntityId}:${task.title}`
    const existingTask = tasks.find(
      (t) => `${t.workerId}:${t.relatedEntityId}:${t.title}` === key,
    )
    if (existingKeys.has(key)) {
      const hasAudit = domainEvents.some(
        (e) =>
          e.type === 'ai_sales.task.created' &&
          (e.correlationId === existingTask?.id || e.aggregateId === assessment.orderId),
      )
      if (existingTask && !hasAudit) {
        recordSalesFollowUpTaskAudit(existingTask, assessment)
      }
      continue
    }
    enqueueWorkerTask(task)
    recordSalesFollowUpTaskAudit(task, assessment)
    existingKeys.add(key)
  }
  return listWorkerTasks(AI_SALES_FOLLOW_UP_WORKER_ID)
}

/** @param {import('../data/seedOrders.js').Order[]} [orders] @param {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]} [dtos] */
export function syncCollectionSpecialistTasks(orders, dtos) {
  const orderList = orders ?? initialOrders.filter((o) => o.status !== 'İptal')
  const dtoList =
    dtos ?? orderList.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  const domainEvents = getAllDomainEventsSnapshot()
  const existingTasks = listWorkerTasks()
  const pairs = buildCollectionSpecialistTasks(
    orderList,
    dtoList,
    DEMO_TODAY,
    NOW_ISO,
    domainEvents,
    existingTasks,
  )
  const existingKeys = new Set(
    tasks.map((t) => `${t.workerId}:${t.relatedEntityId}:${t.title}`),
  )
  for (const { task, assessment } of pairs) {
    const key = `${task.workerId}:${task.relatedEntityId}:${task.title}`
    const existingTask = tasks.find(
      (t) => `${t.workerId}:${t.relatedEntityId}:${t.title}` === key,
    )
    if (existingKeys.has(key)) {
      const hasAudit = domainEvents.some(
        (e) =>
          e.type === 'ai.collection.task.created' &&
          (e.correlationId === existingTask?.id || e.aggregateId === assessment.orderId),
      )
      if (existingTask && !hasAudit) {
        recordCollectionSpecialistTaskAudit(existingTask, assessment)
      }
      continue
    }
    enqueueWorkerTask(task)
    recordCollectionSpecialistTaskAudit(task, assessment)
    existingKeys.add(key)
  }
  return listWorkerTasks(AI_COLLECTION_SPECIALIST_WORKER_ID)
}

/** @param {import('../data/seedOrders.js').Order[]} [orders] @param {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]} [dtos] */
export function syncShipmentSpecialistTasks(orders, dtos) {
  const orderList = orders ?? initialOrders.filter((o) => o.status !== 'İptal')
  const dtoList =
    dtos ?? orderList.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  const domainEvents = getAllDomainEventsSnapshot()
  const existingTasks = listWorkerTasks()
  const pairs = buildShipmentSpecialistTasks(
    orderList,
    dtoList,
    DEMO_TODAY,
    NOW_ISO,
    domainEvents,
    existingTasks,
  )
  const existingKeys = new Set(
    tasks.map((t) => `${t.workerId}:${t.relatedEntityId}:${t.title}`),
  )
  for (const { task, assessment } of pairs) {
    const key = `${task.workerId}:${task.relatedEntityId}:${task.title}`
    const existingTask = tasks.find(
      (t) => `${t.workerId}:${t.relatedEntityId}:${t.title}` === key,
    )
    if (existingKeys.has(key)) {
      const hasAudit = domainEvents.some(
        (e) =>
          e.type === 'ai.shipment.task.created' &&
          (e.correlationId === existingTask?.id || e.aggregateId === assessment.orderId),
      )
      if (existingTask && !hasAudit) {
        recordShipmentSpecialistTaskAudit(existingTask, assessment)
      }
      continue
    }
    enqueueWorkerTask(task)
    recordShipmentSpecialistTaskAudit(task, assessment)
    existingKeys.add(key)
  }
  return listWorkerTasks(AI_SHIPMENT_SPECIALIST_WORKER_ID)
}

/** @param {import('../data/seedOrders.js').Order[]} [orders] @param {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]} [dtos] */
export function syncProcurementSpecialistTasks(orders, dtos) {
  const orderList = orders ?? initialOrders.filter((o) => o.status !== 'İptal')
  const dtoList =
    dtos ?? orderList.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  const domainEvents = getAllDomainEventsSnapshot()
  const existingTasks = listWorkerTasks()
  const pairs = buildProcurementSpecialistTasks(
    orderList,
    dtoList,
    DEMO_TODAY,
    NOW_ISO,
    domainEvents,
    existingTasks,
  )
  const existingKeys = new Set(
    tasks.map((t) => `${t.workerId}:${t.relatedEntityId}:${t.title}`),
  )
  for (const { task, assessment } of pairs) {
    const key = `${task.workerId}:${task.relatedEntityId}:${task.title}`
    const existingTask = tasks.find(
      (t) => `${t.workerId}:${t.relatedEntityId}:${t.title}` === key,
    )
    if (existingKeys.has(key)) {
      const hasAudit = domainEvents.some(
        (e) =>
          e.type === 'ai.procurement.task.created' &&
          (e.correlationId === existingTask?.id || e.aggregateId === assessment.orderId),
      )
      if (existingTask && !hasAudit) {
        recordProcurementSpecialistTaskAudit(existingTask, assessment)
      }
      continue
    }
    enqueueWorkerTask(task)
    recordProcurementSpecialistTaskAudit(task, assessment)
    existingKeys.add(key)
  }
  return listWorkerTasks(AI_PROCUREMENT_SPECIALIST_WORKER_ID)
}

/** @param {import('../data/seedOrders.js').Order[]} [orders] @param {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]} [dtos] */
export function syncTasksFromBusinessEngine(orders, dtos) {
  const orderList = orders ?? initialOrders.filter((o) => o.status !== 'İptal')
  const dtoList =
    dtos ?? orderList.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  const generated = buildTasksFromBusinessEngine(
    orderList,
    dtoList,
    workers,
    DEMO_TODAY,
    NOW_ISO,
  )
  const existingKeys = new Set(
    tasks.map((t) => `${t.workerId}:${t.relatedEntityId}:${t.title}`),
  )
  for (const task of generated) {
    const key = `${task.workerId}:${task.relatedEntityId}:${task.title}`
    if (existingKeys.has(key)) continue
    enqueueWorkerTask(task)
    existingKeys.add(key)
  }
  syncSalesFollowUpTasks(orderList, dtoList)
  syncCollectionSpecialistTasks(orderList, dtoList)
  syncShipmentSpecialistTasks(orderList, dtoList)
  syncProcurementSpecialistTasks(orderList, dtoList)
  notifyDigitalWorkforceChange()
  return listWorkerTasks()
}

/** @param {string} workerId @param {string} [reason] */
export function pauseDigitalWorker(workerId, reason = '') {
  workers = workers.map((w) =>
    w.id === workerId
      ? { ...w, status: DIGITAL_WORKER_STATUS.PAUSED, enabled: false, updatedAt: NOW_ISO }
      : w,
  )
  coordinatorOverrides.set(workerId, { pauseReason: reason })
  refreshWorkerStatus(workerId)
  notifyDigitalWorkforceChange()
}

/** @param {string} workerId */
export function resumeDigitalWorker(workerId) {
  coordinatorOverrides.delete(workerId)
  workers = workers.map((w) =>
    w.id === workerId ? { ...w, enabled: true, updatedAt: NOW_ISO } : w,
  )
  refreshWorkerStatus(workerId)
  notifyDigitalWorkforceChange()
}

/**
 * @param {string} workerId
 * @param {import('../contracts/v1/digitalWorker.js').WorkerPriorityLevel} priority
 */
export function setWorkerQueuePriority(workerId, priority) {
  workers = workers.map((w) =>
    w.id === workerId ? { ...w, priority, updatedAt: NOW_ISO } : w,
  )
  tasks = tasks.map((t) =>
    t.workerId === workerId && t.status === DIGITAL_WORKER_STATUS.WAITING
      ? { ...t, priority }
      : t,
  )
  notifyDigitalWorkforceChange()
}

/** @param {string} taskId @param {string} [reason] */
export function cancelWorkerTask(taskId, reason = '') {
  const task = tasks.find((t) => t.id === taskId)
  if (!task || task.status === DIGITAL_WORKER_STATUS.RUNNING) return null
  tasks = tasks.filter((t) => t.id !== taskId)
  const updated = {
    ...task,
    status: DIGITAL_WORKER_STATUS.FAILED,
    finishedAt: NOW_ISO,
    completedAt: NOW_ISO,
    result: reason || 'Company Manager iptal',
  }
  const entry = toTaskHistoryEntry(updated)
  taskHistory = [entry, ...taskHistory]
  refreshWorkerStatus(task.workerId)
  notifyDigitalWorkforceChange()
  return entry
}

/** @param {string} taskId @param {string} toWorkerId */
export function reassignWorkerTask(taskId, toWorkerId) {
  const task = tasks.find((t) => t.id === taskId)
  if (!task) return null
  const fromWorkerId = task.workerId
  const updated = { ...task, workerId: toWorkerId, createdBy: 'AI Company Manager' }
  tasks = tasks.map((t) => (t.id === taskId ? updated : t))
  refreshWorkerStatus(fromWorkerId)
  refreshWorkerStatus(toWorkerId)
  notifyDigitalWorkforceChange()
  return updated
}

/**
 * @param {{ workerId: string, orderId: string, title?: string, priority?: import('../contracts/v1/digitalWorker.js').WorkerPriorityLevel }} input
 */
export function createCoordinatorTask(input) {
  return {
    id: `wt-cm-${input.workerId}-${input.orderId}-${Date.now()}`,
    workerId: input.workerId,
    title: input.title ?? `Koordinasyon · ${input.orderId}`,
    description: input.title ?? `Company Manager · ${input.orderId}`,
    priority: input.priority ?? WORKER_PRIORITY.HIGH,
    status: DIGITAL_WORKER_STATUS.WAITING,
    sourceModule: 'company-manager',
    targetModule: input.workerId,
    relatedEntityId: input.orderId,
    relatedModule: 'operations',
    createdAt: NOW_ISO,
    startedAt: null,
    finishedAt: null,
    completedAt: null,
    result: null,
    createdBy: 'AI Company Manager',
  }
}

/** @param {string} workerId */
export function isWorkerPausedByManager(workerId) {
  return coordinatorOverrides.has(workerId)
}

export function getDigitalWorkforceCoreSnapshot() {
  return {
    workers: listDigitalWorkers(),
    tasks: listWorkerTasks(),
    taskHistory: listTaskHistory(),
    queueFifo: peekTaskQueue('fifo'),
    queuePriority: peekTaskQueue('priority'),
    performance: workers.map((w) => getWorkerPerformance(w.id)),
  }
}
