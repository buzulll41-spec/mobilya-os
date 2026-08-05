import { GRAPH_EDGE_TYPE, GRAPH_NODE_TYPE, GRAPH_QUERY } from '../../contracts/v1/knowledgeGraph.js'
import {
  KnowledgeGraphEngine,
  customerNodeId,
  edgeId,
  employeeNodeId,
  riskNodeId,
  taskNodeId,
} from '../../engine/graph/KnowledgeGraphEngine.js'
import { getAllPaymentsSnapshot } from '../mockPaymentStore.js'
import { isCollectionOverdue } from '../../mappers/collection/collectionCommandCenterModel.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import { moneyToNumber } from '../../mappers/moneyHelpers.js'
import { getCollaborationMessagesSnapshot } from '../collaboration/collaborationMessageStore.js'

const READY_STATUSES = new Set(['Hazır', 'Sevke Hazır', 'Sevke hazır'])
const AI_WORKERS = [
  { id: 'dw-sales-follow-up', label: 'Sales AI' },
  { id: 'dw-collection', label: 'Collection AI' },
  { id: 'dw-shipment', label: 'Shipment AI' },
  { id: 'dw-procurement', label: 'Procurement AI' },
]

/** @type {KnowledgeGraphEngine | null} */
let cached = null

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   todayIso: string
 * }} input
 */
export function buildKnowledgeGraphFromMock(input) {
  const { orders, dtos, collectionRows = [], todayIso } = input
  const engine = new KnowledgeGraphEngine()
  const dtoById = new Map(dtos.map((d) => [d.id, d]))
  const payments = getAllPaymentsSnapshot()

  for (const ai of AI_WORKERS) {
    engine.addNode({ id: ai.id, type: GRAPH_NODE_TYPE.AI_WORKER, label: ai.label })
  }

  /** @type {Map<string, boolean>} */
  const employees = new Map()

  for (const order of orders) {
    const dto = dtoById.get(order.id)
    const custId = customerNodeId(order.customer, order.phone)
    const overdue =
      collectionRows.some((r) => r.id === order.id && isCollectionOverdue(r, todayIso)) ||
      (dto && remainingBalance(dto) > 0 && dto.hasOverdueBalance)
    const shipmentReady = READY_STATUSES.has(order.status ?? '') || dto?.partiallyShipped

    engine.addNode({
      id: custId,
      type: GRAPH_NODE_TYPE.CUSTOMER,
      label: order.customer,
      properties: { phone: order.phone },
    })
    engine.addNode({
      id: order.id,
      type: GRAPH_NODE_TYPE.ORDER,
      label: order.id,
      properties: {
        status: order.status,
        overdue: Boolean(overdue),
        shipmentReady: Boolean(shipmentReady),
        salesPerson: order.salesPerson,
      },
    })
    engine.addEdge({
      id: edgeId(GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER, custId, order.id),
      type: GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER,
      from: custId,
      to: order.id,
    })

    if (order.salesPerson) {
      const empId = employeeNodeId(order.salesPerson)
      if (!employees.has(empId)) {
        employees.set(empId, true)
        engine.addNode({ id: empId, type: GRAPH_NODE_TYPE.EMPLOYEE, label: order.salesPerson })
      }
      engine.addEdge({
        id: edgeId(GRAPH_EDGE_TYPE.EMPLOYEE_HAS_ORDER, empId, order.id),
        type: GRAPH_EDGE_TYPE.EMPLOYEE_HAS_ORDER,
        from: empId,
        to: order.id,
      })
    }

    const orderPayments = payments.filter((p) => p.salesOrderId === order.id || p.orderId === order.id)
    for (const payment of orderPayments) {
      engine.addNode({
        id: payment.id,
        type: GRAPH_NODE_TYPE.PAYMENT,
        label: `${payment.kind ?? 'payment'} · ${moneyToNumber(payment.amount)}`,
        properties: { status: payment.status },
      })
      engine.addEdge({
        id: edgeId(GRAPH_EDGE_TYPE.ORDER_HAS_PAYMENT, order.id, payment.id),
        type: GRAPH_EDGE_TYPE.ORDER_HAS_PAYMENT,
        from: order.id,
        to: payment.id,
      })
    }

    const shipId = `shipment:${order.id}`
    engine.addNode({
      id: shipId,
      type: GRAPH_NODE_TYPE.SHIPMENT,
      label: shipmentReady ? 'Sevke hazır' : order.status ?? 'Bekliyor',
      properties: { ready: shipmentReady },
    })
    engine.addEdge({
      id: edgeId(GRAPH_EDGE_TYPE.ORDER_HAS_SHIPMENT, order.id, shipId),
      type: GRAPH_EDGE_TYPE.ORDER_HAS_SHIPMENT,
      from: order.id,
      to: shipId,
    })

    if (overdue) {
      const rId = riskNodeId(order.id)
      const tId = taskNodeId(`collection:${order.id}`)
      engine.addNode({ id: rId, type: GRAPH_NODE_TYPE.RISK, label: `Risk · ${order.customer}` })
      engine.addNode({ id: tId, type: GRAPH_NODE_TYPE.TASK, label: `Tahsilat · ${order.id}` })
      engine.addEdge({
        id: edgeId(GRAPH_EDGE_TYPE.WORKER_CREATED_TASK, 'dw-collection', tId),
        type: GRAPH_EDGE_TYPE.WORKER_CREATED_TASK,
        from: 'dw-collection',
        to: tId,
      })
      engine.addEdge({
        id: edgeId(GRAPH_EDGE_TYPE.TASK_CREATED_RISK, tId, rId),
        type: GRAPH_EDGE_TYPE.TASK_CREATED_RISK,
        from: tId,
        to: rId,
      })
      engine.addEdge({
        id: edgeId(GRAPH_EDGE_TYPE.AI_SOLVED_RISK, 'dw-collection', rId),
        type: GRAPH_EDGE_TYPE.AI_SOLVED_RISK,
        from: 'dw-collection',
        to: rId,
      })
    }
  }

  for (const msg of getCollaborationMessagesSnapshot()) {
    engine.addEdge({
      id: edgeId(GRAPH_EDGE_TYPE.WORKER_COLLABORATES_WITH, msg.fromWorkerId, msg.toWorkerId),
      type: GRAPH_EDGE_TYPE.WORKER_COLLABORATES_WITH,
      from: msg.fromWorkerId,
      to: msg.toWorkerId,
      properties: { messageType: msg.type, reason: msg.reason },
    })
  }

  cached = engine
  return engine
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   todayIso: string
 * }} runtimeCtx
 * @param {string} queryName
 * @param {Record<string, string>} [params]
 */
export function queryKnowledgeGraphLocal(runtimeCtx, queryName, params = {}) {
  const started = Date.now()
  const engine = cached ?? buildKnowledgeGraphFromMock(runtimeCtx)
  const stats = engine.stats()

  if (queryName === GRAPH_QUERY.OVERDUE_PAYMENT_READY_SHIPMENT) {
    const orders = engine.getNodesByType(GRAPH_NODE_TYPE.ORDER).filter((n) => {
      const p = n.properties ?? {}
      return p.overdue && p.shipmentReady
    })
    const matches = orders.map((order) => {
      const customer = engine.getNeighbors(order.id, {
        direction: 'in',
        edgeTypes: [GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER],
      })[0]
      const payments = engine.getNeighbors(order.id, { edgeTypes: [GRAPH_EDGE_TYPE.ORDER_HAS_PAYMENT] })
      const shipments = engine.getNeighbors(order.id, { edgeTypes: [GRAPH_EDGE_TYPE.ORDER_HAS_SHIPMENT] })
      return [customer, ...payments, ...shipments, order].filter(Boolean)
    })
    const nodes = [...new Map(matches.flat().map((n) => [n.id, n])).values()]
    return {
      query: queryName,
      path: ['Payment', 'Shipment', 'Order', 'Customer'],
      nodes,
      edges: [],
      matches,
      meta: {
        nodeCount: stats.nodeCount,
        edgeCount: stats.edgeCount,
        durationMs: Date.now() - started,
        traversed: orders.length,
      },
    }
  }

  if (queryName === GRAPH_QUERY.EMPLOYEE_RISKY_CUSTOMERS) {
    const name = (params.employee ?? params.name ?? '').toLowerCase()
    const employees = engine.getNodesByType(GRAPH_NODE_TYPE.EMPLOYEE).filter((e) =>
      e.label.toLowerCase().includes(name),
    )
    /** @type {import('../../contracts/v1/knowledgeGraph.js').GraphNodeDto[][]} */
    const matches = []
    for (const emp of employees) {
      const empOrders = engine.getNeighbors(emp.id, { edgeTypes: [GRAPH_EDGE_TYPE.EMPLOYEE_HAS_ORDER] })
      for (const order of empOrders) {
        const customers = engine.getNeighbors(order.id, {
          direction: 'in',
          edgeTypes: [GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER],
        })
        const risks = engine
          .getNeighbors(order.id, { direction: 'both' })
          .filter((n) => n.type === GRAPH_NODE_TYPE.RISK)
        if (risks.length) matches.push([emp, order, ...customers, ...risks])
      }
    }
    const nodes = [...new Map(matches.flat().map((n) => [n.id, n])).values()]
    return {
      query: queryName,
      path: ['Employee', 'Order', 'Customer', 'Risk'],
      nodes,
      edges: [],
      matches,
      meta: {
        nodeCount: stats.nodeCount,
        edgeCount: stats.edgeCount,
        durationMs: Date.now() - started,
        traversed: nodes.length,
      },
    }
  }

  return {
    query: queryName,
    path: [],
    nodes: [],
    edges: [],
    matches: [],
    meta: { nodeCount: stats.nodeCount, edgeCount: stats.edgeCount, durationMs: Date.now() - started, traversed: 0 },
  }
}

export function getCustomerSubgraphLocal(runtimeCtx, customerId) {
  const engine = cached ?? buildKnowledgeGraphFromMock(runtimeCtx)
  if (!engine.getNode(customerId)) return null
  const { nodes, edges } = engine.subgraph(customerId, 3)
  return { nodes, edges, centerId: customerId }
}

export function getOrderSubgraphLocal(runtimeCtx, orderId) {
  const engine = cached ?? buildKnowledgeGraphFromMock(runtimeCtx)
  if (!engine.getNode(orderId)) return null
  const { nodes, edges } = engine.subgraph(orderId, 3)
  return { nodes, edges, centerId: orderId }
}

export function resetKnowledgeGraphCacheForTests() {
  cached = null
}

export { KnowledgeGraphEngine, GRAPH_QUERY }
