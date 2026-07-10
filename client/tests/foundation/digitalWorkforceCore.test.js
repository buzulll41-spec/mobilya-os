import { describe, expect, it, beforeEach } from 'vitest'
import { DIGITAL_WORKER_STATUS, WORKER_PRIORITY } from '../../src/contracts/v1/digitalWorker.js'
import {
  compareFifo,
  comparePriorityQueue,
  sortTaskQueue,
  computeWorkerPerformance,
  buildWorkforceDashboardMetrics,
  buildTasksFromBusinessEngine,
  toTaskHistoryEntry,
} from '../../src/engine/digitalWorkforceCore.js'
import {
  resetDigitalWorkforceStore,
  listDigitalWorkers,
  listWorkerTasks,
  listTaskHistory,
  peekTaskQueue,
  dequeueNextTask,
  completeWorkerTask,
  getWorkerPerformance,
} from '../../src/services/mockDigitalWorkforceStore.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { DEMO_TODAY } from '../../src/data/constants.js'

describe('digitalWorkforceCore queue', () => {
  /** @type {import('../../src/contracts/v1/workerTask.js').WorkerTask[]} */
  const sample = [
    {
      id: 'a',
      workerId: 'w1',
      title: 'Low',
      description: '',
      priority: WORKER_PRIORITY.LOW,
      status: DIGITAL_WORKER_STATUS.WAITING,
      sourceModule: 'test',
      targetModule: null,
      relatedEntityId: '1',
      createdAt: '2026-05-01T10:00:00.000Z',
      startedAt: null,
      finishedAt: null,
      result: null,
    },
    {
      id: 'b',
      workerId: 'w1',
      title: 'Critical',
      description: '',
      priority: WORKER_PRIORITY.CRITICAL,
      status: DIGITAL_WORKER_STATUS.WAITING,
      sourceModule: 'test',
      targetModule: null,
      relatedEntityId: '2',
      createdAt: '2026-05-01T11:00:00.000Z',
      startedAt: null,
      finishedAt: null,
      result: null,
    },
    {
      id: 'c',
      workerId: 'w1',
      title: 'Done',
      description: '',
      priority: WORKER_PRIORITY.HIGH,
      status: DIGITAL_WORKER_STATUS.COMPLETED,
      sourceModule: 'test',
      targetModule: null,
      relatedEntityId: '3',
      createdAt: '2026-05-01T09:00:00.000Z',
      startedAt: null,
      finishedAt: '2026-05-01T12:00:00.000Z',
      result: 'ok',
    },
  ]

  it('FIFO sıralaması createdAt ile çalışır', () => {
    const sorted = sortTaskQueue(sample, 'fifo')
    expect(sorted.map((t) => t.id)).toEqual(['a', 'b'])
  })

  it('priority queue önce CRITICAL sonra FIFO', () => {
    const sorted = sortTaskQueue(sample, 'priority')
    expect(sorted.map((t) => t.id)).toEqual(['b', 'a'])
    expect(comparePriorityQueue(sample[1], sample[0])).toBeLessThan(0)
    expect(compareFifo(sample[0], sample[1])).toBeLessThan(0)
  })
})

describe('digitalWorkforceCore performance', () => {
  it('başarı oranı ve ortalama süre hesaplar', () => {
    const history = [
      toTaskHistoryEntry({
        id: 'h1',
        workerId: 'dw-collection',
        title: 'T1',
        description: '',
        priority: WORKER_PRIORITY.HIGH,
        status: DIGITAL_WORKER_STATUS.COMPLETED,
        sourceModule: 'test',
        targetModule: null,
        relatedEntityId: 'x',
        createdAt: '2026-05-01T10:00:00.000Z',
        startedAt: '2026-05-01T10:00:00.000Z',
        finishedAt: '2026-05-01T10:17:00.000Z',
        result: 'ok',
        createdBy: 'BusinessEngine',
      }),
    ]
    const perf = computeWorkerPerformance('dw-collection', [], history)
    expect(perf.totalTasks).toBe(1)
    expect(perf.successfulTasks).toBe(1)
    expect(perf.successRate).toBe(100)
    expect(perf.averageDurationMs).toBe(17 * 60_000)
  })
})

describe('digitalWorkforceCore business engine tasks', () => {
  it('yüksek öncelikli siparişlerden görev üretir', () => {
    resetDigitalWorkforceStore()
    const workers = listDigitalWorkers()
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    const tasks = buildTasksFromBusinessEngine(
      orders,
      dtos,
      workers,
      DEMO_TODAY,
      `${DEMO_TODAY}T09:00:00.000Z`,
    )
    expect(tasks.length).toBeGreaterThan(0)
    expect(tasks.every((t) => t.sourceModule === 'business-engine')).toBe(true)
    expect(tasks.every((t) => t.createdBy === 'BusinessEngine')).toBe(true)
  })
})

describe('mockDigitalWorkforceStore queue ops', () => {
  beforeEach(() => resetDigitalWorkforceStore())

  it('seed: 6 çalışan ve business engine görevleri', () => {
    const workers = listDigitalWorkers()
    const tasks = listWorkerTasks()
    expect(workers).toHaveLength(6)
    expect(tasks.length).toBeGreaterThan(0)
  })

  it('dequeue görevi RUNNING yapar', () => {
    const workerId = 'dw-collection'
    const before = peekTaskQueue('priority', workerId)
    expect(before.length).toBeGreaterThan(0)
    const next = dequeueNextTask(workerId, 'priority')
    expect(next?.status).toBe(DIGITAL_WORKER_STATUS.RUNNING)
    expect(next?.startedAt).toBeTruthy()
  })

  it('complete görevi historye taşır', () => {
    const workerId = 'dw-collection'
    const next = dequeueNextTask(workerId, 'priority')
    expect(next).toBeTruthy()
    const entry = completeWorkerTask(next.id, 'COMPLETED')
    expect(entry?.status).toBe(DIGITAL_WORKER_STATUS.COMPLETED)
    expect(listTaskHistory(workerId).some((h) => h.id === next.id)).toBe(true)
    expect(listWorkerTasks(workerId).some((t) => t.id === next.id)).toBe(false)
  })

  it('dashboard metrikleri history dahil', () => {
    const workers = listDigitalWorkers()
    const tasks = listWorkerTasks()
    const history = listTaskHistory()
    const m = buildWorkforceDashboardMetrics(tasks, workers, history)
    expect(m.totalWorkers).toBe(6)
    expect(m.activeWorkers).toBe(6)
    expect(m.completedTasks).toBeGreaterThanOrEqual(1)
    expect(getWorkerPerformance('dw-collection').totalTasks).toBeGreaterThanOrEqual(1)
  })
})
