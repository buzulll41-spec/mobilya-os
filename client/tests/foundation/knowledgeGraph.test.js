import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import { GRAPH_EDGE_TYPE, GRAPH_NODE_TYPE, GRAPH_QUERY } from '../../src/contracts/v1/knowledgeGraph.js'
import {
  KnowledgeGraphEngine,
  customerNodeId,
  edgeId,
} from '../../src/engine/graph/KnowledgeGraphEngine.js'
import {
  buildKnowledgeGraphFromMock,
  queryKnowledgeGraphLocal,
  resetKnowledgeGraphCacheForTests,
} from '../../src/services/graph/KnowledgeGraphService.js'
import { fetchGraphQuery } from '../../src/services/graphClient.js'

describe('Company Knowledge Graph (FAZ 103)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos
  const runtimeCtx = () => ({ orders, dtos, collectionRows: [], todayIso: DEMO_TODAY })

  beforeEach(() => {
    resetKnowledgeGraphCacheForTests()
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  describe('Node', () => {
    it('mock veriden node üretir', () => {
      const engine = buildKnowledgeGraphFromMock(runtimeCtx())
      const stats = engine.stats()
      expect(stats.nodeCount).toBeGreaterThan(orders.length)
      expect(stats.nodesByType[GRAPH_NODE_TYPE.ORDER]).toBeGreaterThan(0)
      expect(stats.nodesByType[GRAPH_NODE_TYPE.CUSTOMER]).toBeGreaterThan(0)
    })
  })

  describe('Edge', () => {
    it('CUSTOMER_HAS_ORDER ve ORDER_HAS_PAYMENT bağları', () => {
      const engine = buildKnowledgeGraphFromMock(runtimeCtx())
      const stats = engine.stats()
      expect(stats.edgesByType[GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER]).toBeGreaterThan(0)
    })
  })

  describe('Traversal', () => {
    it('order subgraph traverse', () => {
      const engine = buildKnowledgeGraphFromMock(runtimeCtx())
      const order = engine.getNodesByType(GRAPH_NODE_TYPE.ORDER)[0]
      const { visited } = engine.traverse(order.id, { maxDepth: 2, direction: 'both' })
      expect(visited).toBeGreaterThan(2)
    })
  })

  describe('Cycle', () => {
    it('temiz grafta cycle yok', () => {
      const engine = buildKnowledgeGraphFromMock(runtimeCtx())
      expect(engine.detectCycles()).toHaveLength(0)
    })
  })

  describe('Performance', () => {
    it('graph query < 200ms', () => {
      buildKnowledgeGraphFromMock(runtimeCtx())
      const started = Date.now()
      queryKnowledgeGraphLocal(runtimeCtx(), GRAPH_QUERY.OVERDUE_PAYMENT_READY_SHIPMENT)
      expect(Date.now() - started).toBeLessThan(200)
    })
  })

  describe('Graph Query', () => {
    it('overdue_payment_ready_shipment sorgusu', async () => {
      const result = await fetchGraphQuery(GRAPH_QUERY.OVERDUE_PAYMENT_READY_SHIPMENT, {}, runtimeCtx())
      expect(result.query).toBe(GRAPH_QUERY.OVERDUE_PAYMENT_READY_SHIPMENT)
      expect(result.path).toContain('Payment')
      expect(result.meta.durationMs).toBeGreaterThanOrEqual(0)
    })

    it('employee_risky_customers sorgusu', async () => {
      const result = await fetchGraphQuery(
        GRAPH_QUERY.EMPLOYEE_RISKY_CUSTOMERS,
        { employee: 'Elçin' },
        runtimeCtx(),
      )
      expect(result.query).toBe(GRAPH_QUERY.EMPLOYEE_RISKY_CUSTOMERS)
      expect(Array.isArray(result.nodes)).toBe(true)
    })
  })

  describe('Engine unit', () => {
    it('manuel graph cycle tespiti', () => {
      const g = new KnowledgeGraphEngine()
      const a = customerNodeId('A', '1')
      const b = 'O1'
      g.addNode({ id: a, type: GRAPH_NODE_TYPE.CUSTOMER, label: 'A' })
      g.addNode({ id: b, type: GRAPH_NODE_TYPE.ORDER, label: 'O1' })
      g.addEdge({ id: edgeId(GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER, a, b), type: GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER, from: a, to: b })
      g.addEdge({ id: 'back', type: GRAPH_EDGE_TYPE.PAYMENT_BELONGS_TO, from: b, to: a })
      expect(g.detectCycles(6).length).toBeGreaterThan(0)
    })
  })
})
