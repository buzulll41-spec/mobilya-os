import { describe, expect, it } from 'vitest'
import { MAIN_NAV, PAGE_TITLE } from '../../src/constants/navigation.js'
import { canAccessPage } from '../../src/constants/roleAccess.js'
import { USER_ROLE } from '../../src/contracts/v1/user.js'
import { DIGITAL_WORKER_STATUS } from '../../src/contracts/v1/digitalWorker.js'
import {
  buildDigitalWorkforceHub,
  buildDigitalWorkerDetailVm,
  DIGITAL_WORKFORCE_FUTURE_TABS,
} from '../../src/mappers/digital-workforce/digitalWorkforceModel.js'
import {
  listDigitalWorkers,
  listWorkerTasks,
  listTaskHistory,
  resetDigitalWorkforceStore,
  getWorkerPerformance,
} from '../../src/services/mockDigitalWorkforceStore.js'
import {
  resetCompanyManagerStore,
  subscribeCompanyManagerStore,
  recordCompanyManagerTaskCompleted,
} from '../../src/services/company-manager/companyManagerStore.js'
import {
  resetCompanyBrainStore,
  subscribeCompanyBrainStore,
  recordCompanyBrainScan,
} from '../../src/services/company-brain/companyBrainStore.js'
import DigitalWorkforcePage from '../../src/pages/DigitalWorkforcePage.jsx'
import DigitalWorkforceCard from '../../src/features/digital-workforce/DigitalWorkforceCard.jsx'
import DigitalWorkforceDetailView from '../../src/features/digital-workforce/DigitalWorkforceDetailView.jsx'
import DigitalWorkforceDrawer from '../../src/features/digital-workforce/DigitalWorkforceDrawer.jsx'

describe('digitalWorkforceModel', () => {
  it('6 dijital çalışan seed verisi ve FAZ 23A KPI üretir', () => {
    resetDigitalWorkforceStore()
    const workers = listDigitalWorkers()
    const tasks = listWorkerTasks()
    const history = listTaskHistory()
    const performance = workers.map((w) => getWorkerPerformance(w.id))
    const hub = buildDigitalWorkforceHub(workers, tasks, performance, history)

    expect(workers).toHaveLength(6)
    expect(hub.cards).toHaveLength(6)
    expect(hub.kpis.find((k) => k.id === 'total')?.value).toBe('6')
    expect(hub.kpis.find((k) => k.id === 'active')?.label).toBe('Aktif çalışan')
    expect(hub.kpis.find((k) => k.id === 'waiting-tasks')).toBeTruthy()
    expect(hub.kpis.find((k) => k.id === 'running-tasks')).toBeTruthy()
    expect(hub.kpis.find((k) => k.id === 'completed-tasks')?.value).toBe('1')
    expect(hub.cards.every((c) => c.status === DIGITAL_WORKER_STATUS.PREPARING)).toBe(false)
    expect(hub.cards.some((c) => c.status === DIGITAL_WORKER_STATUS.WAITING)).toBe(true)
    expect(hub.cards[0].role).toBeTruthy()
    expect(hub.cards[0].icon).toBeTruthy()
  })

  it('detay VM performans ve geçmiş içerir', () => {
    resetDigitalWorkforceStore()
    const worker = listDigitalWorkers().find((w) => w.id === 'dw-collection')
    expect(worker).toBeTruthy()
    const history = listTaskHistory(worker.id)
    const performance = getWorkerPerformance(worker.id)
    const detail = buildDigitalWorkerDetailVm(worker, listWorkerTasks(worker.id), history, performance)

    expect(detail.name).toBe('AI Collection Specialist')
    expect(detail.futureTabs).toEqual(DIGITAL_WORKFORCE_FUTURE_TABS)
    expect(detail.performance.totalTasks).toBeGreaterThanOrEqual(1)
    expect(detail.taskHistory.length).toBeGreaterThanOrEqual(1)
  })
})

describe('digital workforce navigation', () => {
  it('ana menüde Digital Workforce tanımlı', () => {
    const item = MAIN_NAV.find((n) => n.id === 'digital-workforce')
    expect(item?.label).toBe('Digital Workforce')
    expect(PAGE_TITLE['digital-workforce']).toBe('Digital Workforce')
  })

  it('admin ve manager erişebilir', () => {
    expect(canAccessPage(USER_ROLE.ADMIN, 'digital-workforce')).toBe(true)
    expect(canAccessPage(USER_ROLE.MANAGER, 'digital-workforce')).toBe(true)
  })
})

describe('digital workforce UI modules', () => {
  it('sayfa ve kart bileşenleri yüklenir', () => {
    expect(typeof DigitalWorkforcePage).toBe('function')
    expect(typeof DigitalWorkforceCard).toBe('function')
    expect(typeof DigitalWorkforceDetailView).toBe('function')
    expect(typeof DigitalWorkforceDrawer).toBe('function')
  })

  it('store notify listeners Set yerine callback çağırır', () => {
    resetCompanyManagerStore()
    resetCompanyBrainStore()
    let managerCalls = 0
    let brainCalls = 0
    const unsubManager = subscribeCompanyManagerStore(() => {
      managerCalls += 1
    })
    const unsubBrain = subscribeCompanyBrainStore(() => {
      brainCalls += 1
    })

    expect(() => recordCompanyManagerTaskCompleted()).not.toThrow()
    expect(() =>
      recordCompanyBrainScan({
        decisions: [],
        edges: [],
        scenario: 'BALANCED',
        scanAt: '2026-06-18T12:00:00.000Z',
        dominantDomain: 'orders',
        goals: {
          collectionRateTarget: 0,
          shipmentDelayMaxPct: 0,
          procurementWaitMaxPct: 0,
          riskyReceivableMax: 0,
          updatedAt: '2026-06-18T12:00:00.000Z',
        },
        status: {
          running: 0,
          busy: 0,
          risky: 0,
          waiting: 0,
          totalWorkers: 0,
          activeTasks: 0,
          pendingTasks: 0,
          completedTasks: 0,
        },
      }),
    ).not.toThrow()

    expect(managerCalls).toBe(1)
    expect(brainCalls).toBe(1)

    unsubManager()
    unsubBrain()
  })
})
