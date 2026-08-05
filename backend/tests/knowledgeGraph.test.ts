import { beforeEach, describe, expect, it } from 'vitest'
import { GRAPH_EDGE_TYPE, GRAPH_NODE_TYPE } from '../src/contracts/knowledgeGraphDto.js'
import {
  KnowledgeGraphEngine,
  customerNodeId,
  edgeId,
  employeeNodeId,
  riskNodeId,
  taskNodeId,
} from '../src/services/graph/KnowledgeGraphEngine.js'

function buildSampleGraph(): KnowledgeGraphEngine {
  const g = new KnowledgeGraphEngine()
  const cust = customerNodeId('Ayşe Yılmaz', '555')
  const emp = employeeNodeId('Nazlı Demir')
  const order = 'S-TEST-1'
  const pay = 'pay-1'
  const ship = 'ship-1'
  const risk = riskNodeId(order)
  const task = taskNodeId('t1')

  g.addNode({ id: cust, type: GRAPH_NODE_TYPE.CUSTOMER, label: 'Ayşe Yılmaz' })
  g.addNode({ id: emp, type: GRAPH_NODE_TYPE.EMPLOYEE, label: 'Nazlı Demir' })
  g.addNode({
    id: order,
    type: GRAPH_NODE_TYPE.ORDER,
    label: order,
    properties: { overdue: true, shipmentReady: true },
  })
  g.addNode({ id: pay, type: GRAPH_NODE_TYPE.PAYMENT, label: 'Kapora' })
  g.addNode({ id: ship, type: GRAPH_NODE_TYPE.SHIPMENT, label: 'PLANNED' })
  g.addNode({ id: risk, type: GRAPH_NODE_TYPE.RISK, label: 'Risk' })
  g.addNode({ id: task, type: GRAPH_NODE_TYPE.TASK, label: 'Task' })
  g.addNode({ id: 'dw-collection', type: GRAPH_NODE_TYPE.AI_WORKER, label: 'Collection AI' })

  g.addEdge({ id: edgeId(GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER, cust, order), type: GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER, from: cust, to: order })
  g.addEdge({ id: edgeId(GRAPH_EDGE_TYPE.EMPLOYEE_HAS_ORDER, emp, order), type: GRAPH_EDGE_TYPE.EMPLOYEE_HAS_ORDER, from: emp, to: order })
  g.addEdge({ id: edgeId(GRAPH_EDGE_TYPE.ORDER_HAS_PAYMENT, order, pay), type: GRAPH_EDGE_TYPE.ORDER_HAS_PAYMENT, from: order, to: pay })
  g.addEdge({ id: edgeId(GRAPH_EDGE_TYPE.ORDER_HAS_SHIPMENT, order, ship), type: GRAPH_EDGE_TYPE.ORDER_HAS_SHIPMENT, from: order, to: ship })
  g.addEdge({ id: edgeId(GRAPH_EDGE_TYPE.WORKER_CREATED_TASK, 'dw-collection', task), type: GRAPH_EDGE_TYPE.WORKER_CREATED_TASK, from: 'dw-collection', to: task })
  g.addEdge({ id: edgeId(GRAPH_EDGE_TYPE.TASK_CREATED_RISK, task, risk), type: GRAPH_EDGE_TYPE.TASK_CREATED_RISK, from: task, to: risk })

  return g
}

describe('Knowledge Graph Engine (FAZ 103)', () => {
  let graph: KnowledgeGraphEngine

  beforeEach(() => {
    graph = buildSampleGraph()
  })

  describe('Node', () => {
    it('node tipleri eklenir ve stats döner', () => {
      const stats = graph.stats()
      expect(stats.nodeCount).toBeGreaterThanOrEqual(7)
      expect(stats.nodesByType[GRAPH_NODE_TYPE.ORDER]).toBe(1)
      expect(stats.nodesByType[GRAPH_NODE_TYPE.CUSTOMER]).toBe(1)
    })
  })

  describe('Edge', () => {
    it('edge tipleri bağlanır', () => {
      const stats = graph.stats()
      expect(stats.edgesByType[GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER]).toBe(1)
      expect(stats.edgesByType[GRAPH_EDGE_TYPE.ORDER_HAS_PAYMENT]).toBe(1)
    })
  })

  describe('Traversal', () => {
    it('order merkezli traverse komşuları bulur', () => {
      const { nodes, visited } = graph.traverse('S-TEST-1', { maxDepth: 2, direction: 'both' })
      expect(visited).toBeGreaterThan(3)
      expect(nodes.some((n) => n.type === GRAPH_NODE_TYPE.PAYMENT)).toBe(true)
      expect(nodes.some((n) => n.type === GRAPH_NODE_TYPE.CUSTOMER)).toBe(true)
    })
  })

  describe('Cycle', () => {
    it('döngüsüz grafta cycle bulunmaz', () => {
      expect(graph.detectCycles()).toHaveLength(0)
    })

    it('döngülü edge tespit edilir', () => {
      graph.addEdge({
        id: 'cycle-edge',
        type: GRAPH_EDGE_TYPE.PAYMENT_BELONGS_TO,
        from: 'pay-1',
        to: customerNodeId('Ayşe Yılmaz', '555'),
      })
      graph.addEdge({
        id: 'cycle-back',
        type: GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER,
        from: customerNodeId('Ayşe Yılmaz', '555'),
        to: 'pay-1',
      })
      const cycles = graph.detectCycles(8)
      expect(cycles.length).toBeGreaterThan(0)
    })
  })

  describe('Performance', () => {
    it('1000 node traverse < 100ms', () => {
      const big = new KnowledgeGraphEngine()
      for (let i = 0; i < 1000; i++) {
        const cid = customerNodeId(`C${i}`, `${i}`)
        const oid = `O${i}`
        big.addNode({ id: cid, type: GRAPH_NODE_TYPE.CUSTOMER, label: `C${i}` })
        big.addNode({ id: oid, type: GRAPH_NODE_TYPE.ORDER, label: oid })
        big.addEdge({
          id: edgeId(GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER, cid, oid),
          type: GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER,
          from: cid,
          to: oid,
        })
      }
      const started = Date.now()
      big.traverse('O500', { maxDepth: 1 })
      expect(Date.now() - started).toBeLessThan(100)
    })
  })

  describe('Graph Query patterns', () => {
    it('overdue + shipment ready order bulunur', () => {
      const matches = graph.getNodesByType(GRAPH_NODE_TYPE.ORDER).filter((n) => {
        const p = n.properties ?? {}
        return p.overdue && p.shipmentReady
      })
      expect(matches).toHaveLength(1)
    })

    it('employee -> risk path', () => {
      const emp = graph.getNodesByType(GRAPH_NODE_TYPE.EMPLOYEE)[0]
      const orders = graph.getNeighbors(emp.id, { edgeTypes: [GRAPH_EDGE_TYPE.EMPLOYEE_HAS_ORDER] })
      expect(orders).toHaveLength(1)
    })
  })
})
