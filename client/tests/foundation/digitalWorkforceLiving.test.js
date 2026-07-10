import { describe, expect, it, beforeEach } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { DIGITAL_WORKER_STATUS } from '../../src/contracts/v1/digitalWorker.js'
import {
  AI_LIVING_STATUS,
  AI_LIVING_STATUS_CYCLE,
  AI_LIVING_STATUS_META,
  DigitalWorkforceLivingEngine,
  advanceLivingStatus,
  buildProgressBlocks,
  computeLivingTaskProgress,
  formatLiveRelativeTime,
  resetDigitalWorkforceLivingEngine,
  resolveLivingMessage,
} from '../../src/mappers/digital-workforce/digitalWorkforceLivingEngine.js'
import {
  buildDigitalWorkforceExperienceHub,
} from '../../src/mappers/digital-workforce/digitalWorkforceModel.js'
import {
  resetDigitalWorkforceStore,
  listDigitalWorkers,
  listWorkerTasks,
  listTaskHistory,
  getWorkerPerformance,
  enqueueWorkerTask,
  subscribeDigitalWorkforceStore,
} from '../../src/services/mockDigitalWorkforceStore.js'
import { useLivingDigitalWorkforce } from '../../src/hooks/useLivingDigitalWorkforce.js'

describe('digitalWorkforceLivingEngine status enum', () => {
  it('6 living status tanımlı', () => {
    expect(Object.keys(AI_LIVING_STATUS)).toHaveLength(6)
    expect(AI_LIVING_STATUS_CYCLE).toEqual([
      'WAITING',
      'THINKING',
      'WORKING',
      'CALLING',
      'COMPLETED',
      'IDLE',
    ])
    expect(AI_LIVING_STATUS_META.WORKING.emoji).toBe('🟢')
    expect(AI_LIVING_STATUS_META.THINKING.emoji).toBe('🔵')
    expect(AI_LIVING_STATUS_META.CALLING.emoji).toBe('🟡')
    expect(AI_LIVING_STATUS_META.COMPLETED.emoji).toBe('✅')
  })

  it('status döngüsü sırayla ilerler', () => {
    expect(advanceLivingStatus(AI_LIVING_STATUS.WAITING)).toBe(AI_LIVING_STATUS.THINKING)
    expect(advanceLivingStatus(AI_LIVING_STATUS.THINKING)).toBe(AI_LIVING_STATUS.WORKING)
    expect(advanceLivingStatus(AI_LIVING_STATUS.WORKING)).toBe(AI_LIVING_STATUS.CALLING)
    expect(advanceLivingStatus(AI_LIVING_STATUS.CALLING)).toBe(AI_LIVING_STATUS.COMPLETED)
    expect(advanceLivingStatus(AI_LIVING_STATUS.COMPLETED)).toBe(AI_LIVING_STATUS.IDLE)
    expect(advanceLivingStatus(AI_LIVING_STATUS.IDLE)).toBe(AI_LIVING_STATUS.WAITING)
  })
})

describe('digitalWorkforceLivingEngine messages & progress', () => {
  it('worker temasına göre canlı mesaj üretir', () => {
    const salesMsg = resolveLivingMessage('dw-sales-follow-up', AI_LIVING_STATUS.THINKING, 0)
    const collMsg = resolveLivingMessage('dw-collection', AI_LIVING_STATUS.WORKING, 0)
    const shipMsg = resolveLivingMessage('dw-shipment', AI_LIVING_STATUS.THINKING, 0)
    const procMsg = resolveLivingMessage('dw-procurement', AI_LIVING_STATUS.WORKING, 0)

    expect(salesMsg).toContain('siparişi')
    expect(collMsg).toContain('Tahsilat')
    expect(shipMsg).toContain('Sevk')
    expect(procMsg).toMatch(/Tedarik|Sipariş/)
  })

  it('görev ilerlemesi status ve süreye göre hesaplanır', () => {
    expect(computeLivingTaskProgress(AI_LIVING_STATUS.COMPLETED, 0)).toBe(100)
    expect(computeLivingTaskProgress(AI_LIVING_STATUS.IDLE, 0)).toBe(0)
    const mid = computeLivingTaskProgress(AI_LIVING_STATUS.WORKING, 1600, 3200)
    expect(mid).toBeGreaterThan(50)
    expect(mid).toBeLessThan(80)
    expect(buildProgressBlocks(58)).toBe('■■■□□□')
    expect(buildProgressBlocks(100)).toBe('■■■■■■')
  })

  it('canlı relative time formatı', () => {
    const now = Date.parse('2026-06-18T12:00:05.000Z')
    expect(formatLiveRelativeTime(now - 1000, now)).toBe('Şimdi')
    expect(formatLiveRelativeTime(now - 5000, now)).toBe('Az önce')
    expect(formatLiveRelativeTime(now - 15000, now)).toBe('15 saniye önce')
  })
})

describe('digitalWorkforceLivingEngine cycle & store sync', () => {
  beforeEach(() => {
    resetDigitalWorkforceStore()
    resetDigitalWorkforceLivingEngine()
  })

  it('WorkerStore yeni görev → WAITING + new task anim', () => {
    const engine = new DigitalWorkforceLivingEngine()
    const snapshot = {
      workers: listDigitalWorkers(),
      tasks: listWorkerTasks(),
      taskHistory: listTaskHistory(),
      performance: listDigitalWorkers().map((w) => getWorkerPerformance(w.id)),
    }
    engine.syncFromSnapshot(snapshot, 1000)

    enqueueWorkerTask({
      id: 'dw-living-new',
      workerId: 'dw-shipment',
      title: 'Living test',
      description: 'Test',
      status: DIGITAL_WORKER_STATUS.WAITING,
      priority: 'HIGH',
      sourceModule: 'Shipment',
      relatedEntityId: 'S-TEST',
      createdAt: `${DEMO_TODAY}T10:00:00.000Z`,
    })

    const nextSnapshot = {
      workers: listDigitalWorkers(),
      tasks: listWorkerTasks(),
      taskHistory: listTaskHistory(),
      performance: listDigitalWorkers().map((w) => getWorkerPerformance(w.id)),
    }
    engine.syncFromSnapshot(nextSnapshot, 1100)
    const vm = engine.getLivingMap(1100)['dw-shipment']
    expect(vm.status).toBe(AI_LIVING_STATUS.WAITING)
    expect(vm.showNewTaskAnim).toBe(true)
  })

  it('tick ile status döngüsü ilerler', () => {
    const engine = new DigitalWorkforceLivingEngine()
    const state = engine.getOrCreateState('dw-sales-follow-up', 0)
    state.status = AI_LIVING_STATUS.WAITING
    state.hasWork = true
    state.phaseStartedAt = 0

    engine.tick(3000)
    const vm = engine.getLivingMap(3000)['dw-sales-follow-up']
    expect(vm.status).toBe(AI_LIVING_STATUS.THINKING)
  })

  it('completed animasyon 2 saniye tetiklenir', () => {
    const engine = new DigitalWorkforceLivingEngine()
    const state = engine.getOrCreateState('dw-collection', 1000)
    state.status = AI_LIVING_STATUS.COMPLETED
    state.showCompletedAnim = true
    state.completedAnimUntil = 3000
    state.phaseStartedAt = 1000

    const during = engine.getLivingMap(2000)['dw-collection']
    expect(during.showCompletedAnim).toBe(true)

    engine.tick(3100)
    const after = engine.getLivingMap(3100)['dw-collection']
    expect(after.showCompletedAnim).toBe(false)
  })
})

describe('digitalWorkforceLivingEngine KPI & enrichment', () => {
  beforeEach(() => {
    resetDigitalWorkforceStore()
    resetDigitalWorkforceLivingEngine()
  })

  it('live KPI overlay aktif AI sayısını günceller', () => {
    const engine = new DigitalWorkforceLivingEngine()
    const workers = listDigitalWorkers()
    const hub = buildDigitalWorkforceExperienceHub(
      workers,
      listWorkerTasks(),
      workers.map((w) => getWorkerPerformance(w.id)),
      listTaskHistory(),
    )

    const livingMap = engine.getLivingMap()
    for (const id of Object.keys(livingMap)) {
      const s = engine.getOrCreateState(id)
      s.status = AI_LIVING_STATUS.WORKING
      s.hasWork = true
    }
    const enrichedLiving = engine.getLivingMap()
    const kpis = engine.overlayLiveKpis(hub.kpis, enrichedLiving)
    const activeKpi = kpis.find((k) => k.id === 'active-ai')
    expect(Number(activeKpi?.value)).toBeGreaterThan(0)
  })

  it('kart ve detay VM living alanları ile zenginleşir', () => {
    const engine = new DigitalWorkforceLivingEngine()
    const workers = listDigitalWorkers()
    const hub = buildDigitalWorkforceExperienceHub(
      workers,
      listWorkerTasks(),
      workers.map((w) => getWorkerPerformance(w.id)),
      listTaskHistory(),
    )
    const card = hub.cards[0]
    const living = engine.getLivingMap()[card.id]
    const enriched = engine.enrichCard(card, living)

    expect(enriched.livingMessage).toBeTruthy()
    expect(enriched.livingStatusLabel).toBeTruthy()
    expect(typeof enriched.livingProgress).toBe('number')
    expect(enriched.lastActionLabel).toBeTruthy()
  })

  it('görev satırına progress ekler', () => {
    const engine = new DigitalWorkforceLivingEngine()
    const row = engine.enrichTaskRow(
      {
        id: 't1',
        title: 'Test',
        status: 'RUNNING',
        statusLabel: 'Çalışıyor',
        durationLabel: '2 dk',
        priorityLabel: 'Yüksek',
        sourceModule: 'Sales',
        riskLabel: 'Orta',
      },
      AI_LIVING_STATUS.WORKING,
      58,
    )
    expect(row.progress).toBe(58)
    expect(row.progressBlocks).toBe('■■■□□□')
  })
})

describe('digitalWorkforceLivingEngine store subscription', () => {
  beforeEach(() => {
    resetDigitalWorkforceStore()
    resetDigitalWorkforceLivingEngine()
  })

  it('subscribe + engine sync birlikte çalışır', () => {
    const engine = new DigitalWorkforceLivingEngine()
    let notified = 0
    const unsub = subscribeDigitalWorkforceStore(() => {
      notified += 1
      engine.syncFromSnapshot({
        workers: listDigitalWorkers(),
        tasks: listWorkerTasks(),
        taskHistory: listTaskHistory(),
        performance: listDigitalWorkers().map((w) => getWorkerPerformance(w.id)),
      })
    })

    enqueueWorkerTask({
      id: 'dw-sub-test',
      workerId: 'dw-procurement',
      title: 'Sub test',
      description: 'Test',
      status: DIGITAL_WORKER_STATUS.WAITING,
      priority: 'NORMAL',
      sourceModule: 'Procurement',
      relatedEntityId: 'S-200',
      createdAt: `${DEMO_TODAY}T11:00:00.000Z`,
    })

    expect(notified).toBeGreaterThanOrEqual(1)
    unsub()
  })
})

describe('useLivingDigitalWorkforce hook', () => {
  it('hook modülü export edilir', () => {
    expect(typeof useLivingDigitalWorkforce).toBe('function')
  })
})
