import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import { resetMockDomainEventStore } from '../../src/services/mockDomainEventStore.js'
import { resetDigitalWorkforceStore } from '../../src/services/mockDigitalWorkforceStore.js'
import { resetCompanyManagerStore } from '../../src/services/company-manager/companyManagerStore.js'
import { resetCompanyBrainStore } from '../../src/services/company-brain/companyBrainStore.js'
import { resetGlobalMemoryStore } from '../../src/services/genesis/globalMemoryStore.js'
import { resetGenesisStore } from '../../src/services/genesis/genesisStore.js'
import {
  getAppMode,
  getEnvAppMode,
  isDevelopmentMode,
  isProductionMode,
  setRuntimeModeOverride,
} from '../../src/config/appMode.js'
import { buildLiveSystemHealthView } from '../../src/mappers/pilot/systemHealthModel.js'
import {
  buildGoLiveChecklist,
  computeGoLiveScore,
} from '../../src/mappers/goLive/goLiveReadinessModel.js'
import { buildErrorCenterView } from '../../src/mappers/goLive/errorCenterModel.js'
import {
  clearErrorCenterForTests,
  recordErrorCenterEntry,
  resolveErrorCenterEntry,
} from '../../src/lib/errorCenterStore.js'
import {
  clearOperationAuditForTests,
  listOperationAudit,
} from '../../src/lib/operationAuditLog.js'
import {
  auditAiDecision,
  auditCollectionMutation,
  auditLogin,
  auditMemoryMutation,
  auditOrderMutation,
  auditShipmentMutation,
} from '../../src/lib/criticalAuditBridge.js'
import {
  clearBackupStatusForTests,
  getBackupStatus,
  runSimulatedBackup,
  runSimulatedRestoreTest,
} from '../../src/services/backupClient.js'
import {
  getPerformanceSnapshot,
  markInitialLoadComplete,
  recordPageTransition,
  resetPerformanceMonitorForTests,
} from '../../src/lib/performanceMonitor.js'
import { collectSecurityPosture } from '../../src/services/securityCheckClient.js'
import { runGenesisBrainCycle } from '../../src/services/genesis/GenesisEngine.js'
import { handleCeoChatMessage } from '../../src/engine/genesis/CeoChatEngine.js'
import { recordStrategyOutcome, listGlobalMemories } from '../../src/services/genesis/globalMemoryStore.js'
import { CRITICAL_AUDIT_ACTION } from '../../src/contracts/v1/goLive.js'

describe('Go Live Readiness (FAZ 101)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos

  beforeEach(() => {
    vi.unstubAllEnvs()
    clearErrorCenterForTests()
    clearOperationAuditForTests()
    clearBackupStatusForTests()
    resetPerformanceMonitorForTests()
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
    resetCompanyManagerStore()
    resetCompanyBrainStore()
    resetGlobalMemoryStore()
    resetGenesisStore()
    setRuntimeModeOverride(null)
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  describe('Production Mode', () => {
    it('demo, development, production modları ayırt edilir', () => {
      expect(getAppMode()).toBe('demo')
      vi.stubEnv('VITE_APP_MODE', 'development')
      expect(getEnvAppMode()).toBe('development')
      expect(isDevelopmentMode()).toBe(true)
      vi.stubEnv('VITE_APP_MODE', 'production')
      expect(isProductionMode()).toBe(true)
    })
  })

  describe('System Health extended', () => {
    it('Redis, Company Brain, LLM dahil 9+ bileşen', () => {
      const view = buildLiveSystemHealthView({
        apiOk: true,
        dbOk: true,
        redisOk: true,
        aiWorkersActive: 2,
        aiWorkersTotal: 3,
        companyBrainEnabled: true,
        aiMemoryCount: 5,
        queueDepth: 0,
        llmConfigured: true,
      })
      const ids = view.items.map((i) => i.id)
      expect(ids).toContain('redis')
      expect(ids).toContain('company_brain')
      expect(ids).toContain('llm_provider')
      expect(ids).toContain('memory')
    })
  })

  describe('Go Live Checklist & Score', () => {
    it('12 kontrol maddesi ve 100 üzerinden skor', async () => {
      const healthRaw = {
        apiOk: true,
        dbOk: true,
        aiWorkersActive: 2,
        aiWorkersTotal: 3,
        companyBrainEnabled: true,
        queueDepth: 0,
        aiMemoryCount: 2,
        toolEngineToday: 1,
        toolEngineFailed: 0,
        llmConfigured: true,
        polledAt: new Date().toISOString(),
      }
      const security = await collectSecurityPosture()
      runSimulatedBackup()
      markInitialLoadComplete()
      const checklist = buildGoLiveChecklist(healthRaw, security, getBackupStatus(), getPerformanceSnapshot())
      expect(checklist.checks.length).toBe(12)
      const score = computeGoLiveScore(checklist)
      expect(score.totalScore).toBeGreaterThan(0)
      expect(score.totalScore).toBeLessThanOrEqual(100)
      expect(score.dimensions.length).toBe(4)
    })
  })

  describe('Audit', () => {
    it('kritik işlemler loglanır', () => {
      auditLogin({ role: 'ADMIN', name: 'Test Admin' })
      auditOrderMutation('order.create', { role: 'SALES', name: 'Satış', orderId: 'O-1' })
      auditCollectionMutation('payment.post', { role: 'FINANCE', name: 'Finans' })
      auditShipmentMutation('shipment.plan', { role: 'WAREHOUSE', name: 'Depo' })
      auditAiDecision('Collection priority', { workerId: 'collection-ai' })
      auditMemoryMutation('strategy.recorded')

      const actions = listOperationAudit(10).map((a) => a.action)
      expect(actions).toContain(CRITICAL_AUDIT_ACTION.LOGIN)
      expect(actions).toContain(CRITICAL_AUDIT_ACTION.ORDER)
      expect(actions).toContain(CRITICAL_AUDIT_ACTION.COLLECTION)
      expect(actions).toContain(CRITICAL_AUDIT_ACTION.SHIPMENT)
      expect(actions).toContain(CRITICAL_AUDIT_ACTION.AI_DECISION)
      expect(actions).toContain(CRITICAL_AUDIT_ACTION.MEMORY)
    })
  })

  describe('Error Center', () => {
    it('hata kaydı, listeleme ve çözüm', () => {
      const todayIso = new Date().toISOString().slice(0, 10)
      recordErrorCenterEntry({
        message: 'API timeout',
        category: 'api',
        userName: 'Admin',
        pageId: '#/orders',
        stack: 'Error: timeout\n  at fetch',
      })
      const view = buildErrorCenterView(todayIso)
      expect(view.todayCount).toBe(1)
      expect(view.recentErrors[0]?.message).toBe('API timeout')
      resolveErrorCenterEntry(view.recentErrors[0].id)
      expect(buildErrorCenterView(todayIso).openCount).toBe(0)
    })
  })

  describe('Performance', () => {
    it('sayfa geçişi ve ilk yükleme ölçülür', () => {
      markInitialLoadComplete()
      recordPageTransition('orders', 180)
      const snap = getPerformanceSnapshot()
      expect(snap.pageId).toBe('orders')
      expect(snap.lastTransitionMs).toBe(180)
    })
  })

  describe('Backup', () => {
    it('export ve restore testi simülasyonu', () => {
      expect(getBackupStatus().lastBackupAt).toBeNull()
      runSimulatedBackup()
      expect(getBackupStatus().lastBackupAt).toBeTruthy()
      runSimulatedRestoreTest()
      expect(getBackupStatus().restoreTestedAt).toBeTruthy()
    })
  })

  describe('Smoke — operasyon + AI + CEO', () => {
    it('Login audit + sipariş bağlamı + AI brain + memory + CEO chat', () => {
      auditLogin({ role: 'ADMIN', name: 'CEO' })

      vi.stubEnv('VITE_COMPANY_BRAIN_ENABLED', 'true')
      vi.stubEnv('VITE_GENESIS_ENABLED', 'true')

      const ctx = { orders, dtos, todayIso: DEMO_TODAY, apply: true }
      const brain = runGenesisBrainCycle(ctx)
      expect(brain.decisions.length).toBeGreaterThan(0)

      recordStrategyOutcome({ strategy: 'Go live prep', success: true })
      expect(listGlobalMemories(5).length).toBeGreaterThan(0)

      const chat = handleCeoChatMessage('Sorun ne?', ctx)
      expect(chat.genesis.content.length).toBeGreaterThan(5)

      expect(listOperationAudit(5)[0]?.action).toBe(CRITICAL_AUDIT_ACTION.LOGIN)
    })
  })
})
