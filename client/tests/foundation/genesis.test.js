import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import { resetMockDomainEventStore } from '../../src/services/mockDomainEventStore.js'
import { resetDigitalWorkforceStore } from '../../src/services/mockDigitalWorkforceStore.js'
import { resetCompanyManagerStore } from '../../src/services/company-manager/companyManagerStore.js'
import { resetCompanyBrainStore } from '../../src/services/company-brain/companyBrainStore.js'
import { resetCompanyGoalsStore } from '../../src/services/company-goals/companyGoalsStore.js'
import { resetGlobalMemoryStore, recordStrategyOutcome, listGlobalMemories } from '../../src/services/genesis/globalMemoryStore.js'
import { resetGenesisStore, getGenesisLivingState } from '../../src/services/genesis/genesisStore.js'
import { computeGenesisCompanyScore } from '../../src/engine/genesis/CompanyScoreEngine.js'
import { buildGenesisPredictions } from '../../src/engine/genesis/PredictionEngine.js'
import { runDigitalBoardMeeting } from '../../src/engine/genesis/BoardMeetingEngine.js'
import { handleCeoChatMessage } from '../../src/engine/genesis/CeoChatEngine.js'
import {
  getGenesisSnapshot,
  processCeoChat,
  runGenesisBrainCycle,
  runGenesisHeartbeat,
} from '../../src/services/genesis/GenesisEngine.js'
import { buildGenesisHubExtras } from '../../src/mappers/genesis/genesisModel.js'
import { scoreOperationalDomains } from '../../src/engine/company-manager/PriorityEngine.js'
import { BusinessEngine } from '../../src/engine/businessEngine.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { getAllDomainEventsSnapshot } from '../../src/services/mockDomainEventStore.js'

describe('MOBILYA OS Genesis (FAZ 100)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos

  beforeEach(() => {
    vi.stubEnv('VITE_GENESIS_ENABLED', 'true')
    vi.stubEnv('VITE_COMPANY_BRAIN_ENABLED', 'true')
    resetMockDomainEventStore()
    resetDigitalWorkforceStore()
    resetCompanyManagerStore()
    resetCompanyBrainStore()
    resetCompanyGoalsStore()
    resetGlobalMemoryStore()
    resetGenesisStore()
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  describe('Company Score Engine', () => {
    it('8 boyutta 100 üzerinden skor üretir', () => {
      const snapshots = BusinessEngine.computeOrderSnapshots(orders, dtos, DEMO_TODAY)
      const domains = scoreOperationalDomains({
        snapshots: [...snapshots.values()],
        domainEvents: [],
        todayIso: DEMO_TODAY,
      })
      const score = computeGenesisCompanyScore({ domains, predictionCount: 2 })
      expect(score.dimensions).toHaveLength(8)
      expect(score.totalScore).toBeGreaterThan(0)
      expect(score.totalScore).toBeLessThanOrEqual(100)
    })
  })

  describe('Prediction Engine', () => {
    it('yarın tahminleri üretir', () => {
      const snapshots = BusinessEngine.computeOrderSnapshots(orders, dtos, DEMO_TODAY)
      const domains = scoreOperationalDomains({
        snapshots: [...snapshots.values()],
        domainEvents: [],
        todayIso: DEMO_TODAY,
      })
      const predictions = buildGenesisPredictions({ domains, todayIso: DEMO_TODAY })
      expect(Array.isArray(predictions)).toBe(true)
    })
  })

  describe('Global Memory', () => {
    it('şirket hafızası strateji kaydı tutar', () => {
      recordStrategyOutcome({ strategy: 'Collection boost', success: true })
      expect(listGlobalMemories(5).length).toBeGreaterThan(0)
    })
  })

  describe('Digital Board Meeting', () => {
    it('AI çalışanları gün değerlendirmesi yapar', () => {
      const meeting = runDigitalBoardMeeting({
        todayIso: DEMO_TODAY,
        scenario: 'COLLECTION_DROP',
        stats: { decisionsToday: 3, tasksCompleted: 2 },
        predictions: [{ label: 'Yarın tahsilat düşecek' }],
      })
      expect(meeting.transcript.length).toBeGreaterThanOrEqual(5)
      expect(meeting.ceoSummary).toContain('Digital Board Meeting')
    })
  })

  describe('CEO Chat', () => {
    it('"Sorun ne?" / "Neden?" / "Çöz." yanıtlar', () => {
      const ctx = { orders, dtos, todayIso: DEMO_TODAY }
      const q1 = handleCeoChatMessage('Sorun ne?', ctx)
      expect(q1.genesis.content.toLowerCase()).toMatch(/risk|tahmin|karar/)

      runGenesisBrainCycle({ ...ctx, apply: true })
      const q2 = handleCeoChatMessage('Neden?', ctx)
      expect(q2.genesis.content.length).toBeGreaterThan(5)

      const q3 = handleCeoChatMessage('Çöz.', ctx)
      expect(q3.genesis.actionsTaken).toContain('runCompanyBrainScan')
    })
  })

  describe('Genesis Engine lifecycle', () => {
    it('heartbeat yaşayan durum günceller', () => {
      const ctx = { orders, dtos, todayIso: DEMO_TODAY }
      runGenesisHeartbeat(ctx)
      expect(getGenesisLivingState().heartbeatCount).toBeGreaterThan(0)
    })

    it('brain cycle karar + audit üretir', () => {
      const result = runGenesisBrainCycle({ orders, dtos, todayIso: DEMO_TODAY, apply: true })
      expect(result.decisions.length).toBeGreaterThan(0)
      const events = getAllDomainEventsSnapshot().filter(
        (e) =>
          e.type === DOMAIN_EVENT_TYPE.AI_COMPANY_BRAIN_DECISION ||
          e.type === DOMAIN_EVENT_TYPE.AI_COMPANY_MANAGER_DECISION,
      )
      expect(events.length).toBeGreaterThan(0)
    })

    it('snapshot ve hub VM birleşik görünüm', () => {
      runGenesisBrainCycle({ orders, dtos, todayIso: DEMO_TODAY, apply: true })
      processCeoChat('Sorun ne?', { orders, dtos, todayIso: DEMO_TODAY })
      const snapshot = getGenesisSnapshot()
      expect(snapshot.companyScore.totalScore).toBeGreaterThan(0)
      const hub = buildGenesisHubExtras()
      expect(hub.genesisScore.dimensions.length).toBe(8)
      expect(hub.genesisLiving.breathing).toBe(true)
    })
  })
})
