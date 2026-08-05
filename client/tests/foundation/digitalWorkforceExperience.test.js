import { describe, expect, it, beforeEach } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { DIGITAL_WORKER_STATUS } from '../../src/contracts/v1/digitalWorker.js'
import {
  AI_SPECIALIST_WORKER_IDS,
  DIGITAL_WORKER_THEMES,
  buildDigitalWorkforceHash,
  buildDigitalWorkforceTaskRowVm,
  parseDigitalWorkforceWorkerFromHash,
  resolveDigitalWorkerTheme,
  resolveExperienceStatusLabel,
  resolveWorkerIdFromCriticalIssueId,
} from '../../src/mappers/digital-workforce/digitalWorkforceExperience.js'
import {
  buildDigitalWorkforceExperienceHub,
  buildDigitalWorkerExperienceDetailVm,
  buildDigitalWorkforceTaskHintsFromEngine,
} from '../../src/mappers/digital-workforce/digitalWorkforceModel.js'
import { buildExecutiveCommandCenterView } from '../../src/mappers/executive/executiveCommandCenterModel.js'
import {
  resetDigitalWorkforceStore,
  listDigitalWorkers,
  listWorkerTasks,
  listTaskHistory,
  getWorkerPerformance,
  subscribeDigitalWorkforceStore,
  enqueueWorkerTask,
} from '../../src/services/mockDigitalWorkforceStore.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import DigitalWorkforcePage from '../../src/pages/DigitalWorkforcePage.jsx'
import DigitalWorkforceCard from '../../src/features/digital-workforce/DigitalWorkforceCard.jsx'
import DigitalWorkforceDrawer from '../../src/features/digital-workforce/DigitalWorkforceDrawer.jsx'

describe('digitalWorkforceExperience themes & hash', () => {
  it('dört AI uzmanı tema renkleri tanımlı', () => {
    expect(AI_SPECIALIST_WORKER_IDS).toHaveLength(4)
    expect(resolveDigitalWorkerTheme('dw-sales-follow-up').accent).toBe('#16a34a')
    expect(resolveDigitalWorkerTheme('dw-collection').accent).toBe('#ea580c')
    expect(resolveDigitalWorkerTheme('dw-shipment').accent).toBe('#2563eb')
    expect(resolveDigitalWorkerTheme('dw-procurement').accent).toBe('#9333ea')
    expect(DIGITAL_WORKER_THEMES['dw-sales-follow-up'].shortName).toBe('AI Sales')
  })

  it('hash worker parametresini parse eder', () => {
    expect(parseDigitalWorkforceWorkerFromHash('#/digital-workforce?worker=dw-shipment')).toBe(
      'dw-shipment',
    )
    expect(buildDigitalWorkforceHash('dw-collection')).toBe('#/digital-workforce?worker=dw-collection')
    expect(buildDigitalWorkforceHash(null)).toBe('#/digital-workforce')
  })

  it('CEO kritik issue id → workerId eşlemesi', () => {
    expect(resolveWorkerIdFromCriticalIssueId('ai-sales:S-100')).toBe('dw-sales-follow-up')
    expect(resolveWorkerIdFromCriticalIssueId('ship:S-100')).toBe('dw-shipment')
    expect(resolveWorkerIdFromCriticalIssueId('proc:S-100')).toBe('dw-procurement')
    expect(resolveWorkerIdFromCriticalIssueId('coll:S-100')).toBe('dw-collection')
    expect(resolveWorkerIdFromCriticalIssueId('order:S-100')).toBeNull()
  })
})

describe('digitalWorkforceExperience hub & cards', () => {
  beforeEach(() => {
    resetDigitalWorkforceStore()
  })

  it('5 KPI ve yalnızca 4 AI kartı üretir', () => {
    const workers = listDigitalWorkers()
    const tasks = listWorkerTasks()
    const history = listTaskHistory()
    const performance = workers.map((w) => getWorkerPerformance(w.id))
    const hub = buildDigitalWorkforceExperienceHub(workers, tasks, performance, history)

    expect(hub.kpis).toHaveLength(5)
    expect(hub.kpis.map((k) => k.id)).toEqual([
      'active-ai',
      'pending-tasks',
      'completed-today',
      'success-rate',
      'avg-duration',
    ])
    expect(hub.cards).toHaveLength(4)
    expect(hub.cards.map((c) => c.id)).toEqual(
      expect.arrayContaining([...AI_SPECIALIST_WORKER_IDS]),
    )
    expect(hub.cards.every((c) => c.theme?.shortName?.startsWith('AI '))).toBe(true)
  })

  it('kart durum etiketleri Çalışıyor/Hazır/Bekliyor', () => {
    expect(resolveExperienceStatusLabel(DIGITAL_WORKER_STATUS.RUNNING, false)).toBe('Çalışıyor')
    expect(resolveExperienceStatusLabel(DIGITAL_WORKER_STATUS.WAITING, false)).toBe('Bekliyor')
    expect(resolveExperienceStatusLabel(DIGITAL_WORKER_STATUS.PREPARING, false)).toBe('Hazır')
    expect(resolveExperienceStatusLabel(DIGITAL_WORKER_STATUS.PREPARING, true)).toBe('Bekliyor')
  })

  it('kart VM başarı oranı ve son görev alanları içerir', () => {
    const workers = listDigitalWorkers()
    const worker = workers.find((w) => w.id === 'dw-collection')
    expect(worker).toBeTruthy()
    const hub = buildDigitalWorkforceExperienceHub(
      workers,
      listWorkerTasks(),
      workers.map((w) => getWorkerPerformance(w.id)),
      listTaskHistory(),
    )
    const card = hub.cards.find((c) => c.id === 'dw-collection')
    expect(card).toBeTruthy()
    expect(typeof card.successRate).toBe('number')
    expect(card.averageDurationLabel).toBeTruthy()
    expect(card.lastActionLabel).toBeTruthy()
    expect(card.lastCompletedTaskTitle).toBeTruthy()
  })
})

describe('digitalWorkforceExperience task rows & drawer VM', () => {
  beforeEach(() => {
    resetDigitalWorkforceStore()
  })

  it('görev satırı VM tüm alanları içerir', () => {
    const task = listWorkerTasks('dw-shipment')[0]
    if (!task) {
      enqueueWorkerTask({
        id: 'dw-test-task-1',
        workerId: 'dw-shipment',
        title: 'Test sevk görevi',
        description: 'Risk nedeni: Termin geçmiş · S-SHIP-DEMO',
        status: DIGITAL_WORKER_STATUS.WAITING,
        priority: 'HIGH',
        sourceModule: 'Shipment',
        relatedEntityId: 'S-SHIP-DEMO',
        createdAt: `${DEMO_TODAY}T08:00:00.000Z`,
      })
    }
    const row = buildDigitalWorkforceTaskRowVm(
      listWorkerTasks('dw-shipment')[0] ?? listWorkerTasks()[0],
    )
    expect(row.statusLabel).toBeTruthy()
    expect(row.durationLabel).toBeTruthy()
    expect(row.priorityLabel).toBeTruthy()
    expect(row.sourceModule).toBeTruthy()
    expect(row.riskLabel).toBeTruthy()
  })

  it('drawer detay VM bölümleri üretir', () => {
    const worker = listDigitalWorkers().find((w) => w.id === 'dw-procurement')
    expect(worker).toBeTruthy()
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    bootstrapMockOrderLinesFromOrders(orders)
    const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    const hints = buildDigitalWorkforceTaskHintsFromEngine(orders, dtos, DEMO_TODAY)
    const detail = buildDigitalWorkerExperienceDetailVm(
      worker,
      listWorkerTasks(worker.id),
      listTaskHistory(worker.id),
      getWorkerPerformance(worker.id),
      hints,
    )

    expect(detail.displayName).toBe('AI Procurement')
    expect(Array.isArray(detail.todayTasks)).toBe(true)
    expect(Array.isArray(detail.pendingTasks)).toBe(true)
    expect(Array.isArray(detail.completedTasks)).toBe(true)
    expect(Array.isArray(detail.taskHistory)).toBe(true)
    expect(Array.isArray(detail.engineRisks)).toBe(true)
    expect(Array.isArray(detail.createdTasks)).toBe(true)
    expect(detail.performance.successRate).toBeGreaterThanOrEqual(0)
  })
})

describe('digitalWorkforceExperience live subscription', () => {
  beforeEach(() => {
    resetDigitalWorkforceStore()
  })

  it('subscribeDigitalWorkforceStore enqueue sonrası tetiklenir', () => {
    let calls = 0
    const unsub = subscribeDigitalWorkforceStore(() => {
      calls += 1
    })
    enqueueWorkerTask({
      id: 'dw-live-test',
      workerId: 'dw-sales-follow-up',
      title: 'Canlı test görevi',
      description: 'FAZ 28 live update test',
      status: DIGITAL_WORKER_STATUS.WAITING,
      priority: 'NORMAL',
      sourceModule: 'Sales',
      relatedEntityId: 'S-10001',
      createdAt: `${DEMO_TODAY}T09:00:00.000Z`,
    })
    expect(calls).toBeGreaterThanOrEqual(1)
    unsub()
  })
})

describe('digitalWorkforceExperience CEO deep link', () => {
  it('AI kritik konular workerId taşır', () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    bootstrapMockOrderLinesFromOrders(orders)
    const listItemDtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    const view = buildExecutiveCommandCenterView({
      orders,
      listItemDtos,
      collectionRows: [],
      shipmentRowVMs: [],
      domainEvents: [],
      todayIso: DEMO_TODAY,
    })

    const aiIssues = view.criticalIssues.filter((i) => i.navTarget === 'digital-workforce')
    expect(aiIssues.length).toBeGreaterThan(0)
    expect(aiIssues.every((i) => i.workerId && AI_SPECIALIST_WORKER_IDS.includes(i.workerId))).toBe(
      true,
    )
  })
})

describe('digitalWorkforceExperience UI modules', () => {
  it('sayfa, kart ve drawer bileşenleri yüklenir', () => {
    expect(typeof DigitalWorkforcePage).toBe('function')
    expect(typeof DigitalWorkforceCard).toBe('function')
    expect(typeof DigitalWorkforceDrawer).toBe('function')
  })
})
