import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import { COLLABORATION_MESSAGE_TYPE } from '../../src/contracts/v1/collaboration.js'
import {
  createCollaborationMessage,
  detectCollaborationSignals,
  buildCollaborationGraph,
  sortMessagesByPriority,
  resetCollaborationEngineSeqForTests,
} from '../../src/engine/collaboration/CollaborationEngine.js'
import {
  getCollaborationFeedLocal,
  getCollaborationHistoryLocal,
  getCompanyCollaborationSummaryLocal,
  getWorkerCollaborationLocal,
  resetCollaborationStoreForTests,
  runCollaborationScan,
} from '../../src/services/collaboration/CollaborationService.js'
import { resetCompanyManagerStore } from '../../src/services/company-manager/companyManagerStore.js'
import { runCompanyManagerScan } from '../../src/services/company-manager/CompanyManager.js'
import { fetchCollaborationFeed, fetchCollaborationHistory } from '../../src/services/collaborationClient.js'
import { buildKnowledgeGraphFromMock, resetKnowledgeGraphCacheForTests } from '../../src/services/graph/KnowledgeGraphService.js'
import { GRAPH_EDGE_TYPE } from '../../src/contracts/v1/knowledgeGraph.js'

describe('Multi-Agent Collaboration V1 (FAZ 108)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos
  const runtimeCtx = () => ({ orders, dtos, collectionRows: [], todayIso: DEMO_TODAY })

  beforeEach(() => {
    resetCollaborationStoreForTests()
    resetCollaborationEngineSeqForTests()
    resetKnowledgeGraphCacheForTests()
    resetCompanyManagerStore()
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  describe('Worker Message', () => {
    it('Collection tahsilat riski Shipment WAIT gönderir', () => {
      const messages = detectCollaborationSignals({
        domains: {
          collection: { score: 4, pressure: 3 },
          procurement: { score: 1, pressure: 0 },
          sales: { score: 1, pressure: 0 },
        },
        dominant: 'collection',
        conflicts: [],
        ranked: [],
        todayIso: DEMO_TODAY,
      })
      const wait = messages.find((m) => m.type === COLLABORATION_MESSAGE_TYPE.WAIT)
      expect(wait?.fromWorkerId).toBe('dw-collection')
      expect(wait?.toWorkerId).toBe('dw-shipment')
    })

    it('Procurement Sales RISK_ALERT gönderir', () => {
      const messages = detectCollaborationSignals({
        domains: {
          collection: { score: 1, pressure: 0 },
          procurement: { score: 3, pressure: 2 },
          sales: { score: 1, pressure: 0 },
        },
        dominant: 'procurement',
        conflicts: [],
        ranked: [],
        todayIso: DEMO_TODAY,
      })
      const alert = messages.find((m) => m.type === COLLABORATION_MESSAGE_TYPE.RISK_ALERT)
      expect(alert?.fromWorkerId).toBe('dw-procurement')
      expect(alert?.toWorkerId).toBe('dw-sales-follow-up')
    })
  })

  describe('Transfer', () => {
    it('kuyruk yoğunluğunda TASK_TRANSFER üretir', () => {
      const messages = detectCollaborationSignals({
        domains: {
          collection: { score: 1, pressure: 0 },
          procurement: { score: 1, pressure: 0 },
          sales: { score: 1, pressure: 0 },
        },
        dominant: 'shipment',
        conflicts: [{ kind: 'QUEUE_OVERLOAD', workerId: 'dw-shipment', message: 'yoğun' }],
        ranked: [],
        todayIso: DEMO_TODAY,
      })
      expect(messages.some((m) => m.type === COLLABORATION_MESSAGE_TYPE.TASK_TRANSFER)).toBe(true)
    })
  })

  describe('Priority Change', () => {
    it('Executive dominant worker PRIORITY_CHANGE gönderir', () => {
      const messages = detectCollaborationSignals({
        domains: {
          collection: { score: 1, pressure: 0 },
          procurement: { score: 1, pressure: 0 },
          sales: { score: 5, pressure: 2 },
        },
        dominant: 'sales',
        conflicts: [],
        ranked: [],
        todayIso: DEMO_TODAY,
      })
      const change = messages.find((m) => m.type === COLLABORATION_MESSAGE_TYPE.PRIORITY_CHANGE)
      expect(change?.fromWorkerId).toBe('dw-ceo-assistant')
      expect(change?.toWorkerId).toBe('dw-sales-follow-up')
    })
  })

  describe('History', () => {
    it('collaboration geçmişi kaydedilir', () => {
      runCollaborationScan(runtimeCtx())
      const history = getCollaborationHistoryLocal({ limit: 10 })
      expect(history.total).toBeGreaterThan(0)
      expect(Array.isArray(history.records)).toBe(true)
    })
  })

  describe('Performance', () => {
    it('collaboration feed < 500ms', async () => {
      runCollaborationScan(runtimeCtx())
      const started = Date.now()
      await fetchCollaborationFeed(runtimeCtx())
      expect(Date.now() - started).toBeLessThan(500)
    })
  })

  describe('Company Collaboration', () => {
    it('şirket collaboration özeti döner', () => {
      runCompanyManagerScan({ orders, dtos, todayIso: DEMO_TODAY, apply: false })
      const summary = getCompanyCollaborationSummaryLocal(runtimeCtx())
      expect(summary.workers.length).toBeGreaterThan(0)
      expect(summary.graph.length).toBeGreaterThan(0)
      expect(summary.busiestTeamLabel).toBeTruthy()
    })

    it('worker inbox/outbox profili', () => {
      runCollaborationScan(runtimeCtx())
      const worker = getWorkerCollaborationLocal('dw-shipment', runtimeCtx())
      expect(worker.messagesReceived).toBeGreaterThan(0)
    })

    it('knowledge graph worker collaboration edge içerir', () => {
      runCollaborationScan(runtimeCtx())
      const engine = buildKnowledgeGraphFromMock(runtimeCtx())
      const stats = engine.stats()
      expect(stats.edgesByType[GRAPH_EDGE_TYPE.WORKER_COLLABORATES_WITH]).toBeGreaterThan(0)
    })

    it('history API', async () => {
      runCollaborationScan(runtimeCtx())
      const history = await fetchCollaborationHistory(runtimeCtx(), { limit: 5 })
      expect(history.records.length).toBeGreaterThan(0)
    })

    it('mesaj önceliği sıralaması', () => {
      const messages = [
        createCollaborationMessage('dw-collection', 'dw-shipment', 'INFO', { reason: 'info' }),
        createCollaborationMessage('dw-procurement', 'dw-sales-follow-up', 'RISK_ALERT', {
          reason: 'alert',
        }),
      ]
      const sorted = sortMessagesByPriority(messages)
      expect(sorted[0].type).toBe(COLLABORATION_MESSAGE_TYPE.RISK_ALERT)
    })

    it('collaboration graph oluşturulur', () => {
      const messages = detectCollaborationSignals({
        domains: {
          collection: { score: 4, pressure: 3 },
          procurement: { score: 2, pressure: 2 },
          sales: { score: 2, pressure: 1 },
        },
        dominant: 'collection',
        conflicts: [],
        ranked: [],
        todayIso: DEMO_TODAY,
      })
      const graph = buildCollaborationGraph(messages)
      expect(graph.length).toBeGreaterThan(0)
    })

    it('feed bugünkü mesajları döner', () => {
      runCollaborationScan(runtimeCtx())
      const feed = getCollaborationFeedLocal({ todayIso: DEMO_TODAY, limit: 20 })
      expect(feed.todayCount).toBeGreaterThan(0)
      expect(feed.messages.length).toBeGreaterThan(0)
    })
  })
})
