import type { PrismaClient } from '@prisma/client'
import {
  GRAPH_EDGE_TYPE,
  GRAPH_NODE_TYPE,
  type GraphQueryResultDto,
  type GraphSubgraphDto,
} from '../../contracts/knowledgeGraphDto.js'
import {
  KnowledgeGraphEngine,
  customerNodeId,
  edgeId,
  employeeNodeId,
  riskNodeId,
  taskNodeId,
} from './KnowledgeGraphEngine.js'
import { detectCollaborationSignals } from '../collaboration/CollaborationEngine.js'

const READY_STATUSES = new Set(['Hazır', 'Sevke Hazır', 'READY', 'SHIPMENT_READY'])
const AI_WORKERS = [
  { id: 'dw-sales-follow-up', label: 'Sales AI' },
  { id: 'dw-collection', label: 'Collection AI' },
  { id: 'dw-shipment', label: 'Shipment AI' },
  { id: 'dw-procurement', label: 'Procurement AI' },
]

let cachedEngine: KnowledgeGraphEngine | null = null
let cachedAt = 0
const CACHE_MS = 30_000

function isOverdueOrder(order: {
  remainingAmount: { toString(): string }
  dueDate: Date | null
  displayStatus: string
}): boolean {
  const remaining = Number(order.remainingAmount)
  if (remaining <= 0) return false
  if (order.dueDate) {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    return order.dueDate < today
  }
  return remaining > 0
}

function isShipmentReady(order: { displayStatus: string }, lines: { shipmentReady: boolean }[]): boolean {
  if (READY_STATUSES.has(order.displayStatus)) return true
  return lines.some((l) => l.shipmentReady)
}

export async function buildKnowledgeGraph(prisma: PrismaClient): Promise<KnowledgeGraphEngine> {
  const now = Date.now()
  if (cachedEngine && now - cachedAt < CACHE_MS) return cachedEngine

  const engine = new KnowledgeGraphEngine()

  const orders = await prisma.salesOrder.findMany({
    include: {
      lines: { include: { product: true, supplier: true } },
      payments: true,
      shipments: true,
    },
  })

  const suppliers = await prisma.supplier.findMany()
  const users = await prisma.user.findMany({ where: { isActive: true } })

  for (const s of suppliers) {
    engine.addNode({
      id: s.id,
      type: GRAPH_NODE_TYPE.SUPPLIER,
      label: s.companyName,
      properties: { code: s.code },
    })
  }

  for (const u of users) {
    engine.addNode({
      id: u.id,
      type: GRAPH_NODE_TYPE.WORKER,
      label: u.fullName,
      properties: { role: u.role, email: u.email },
    })
  }

  for (const ai of AI_WORKERS) {
    engine.addNode({
      id: ai.id,
      type: GRAPH_NODE_TYPE.AI_WORKER,
      label: ai.label,
    })
  }

  /** @type {Map<string, true>} */
  const employeeSeen = new Map()

  for (const order of orders) {
    const custId = customerNodeId(order.customerName, order.customerPhone)
    engine.addNode({
      id: custId,
      type: GRAPH_NODE_TYPE.CUSTOMER,
      label: order.customerName,
      properties: { phone: order.customerPhone },
    })

    engine.addNode({
      id: order.id,
      type: GRAPH_NODE_TYPE.ORDER,
      label: order.id,
      properties: {
        displayStatus: order.displayStatus,
        remainingAmount: Number(order.remainingAmount),
        salesPerson: order.salesPerson,
        overdue: isOverdueOrder(order),
        shipmentReady: isShipmentReady(order, order.lines),
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
      if (!employeeSeen.has(empId)) {
        employeeSeen.set(empId, true)
        engine.addNode({
          id: empId,
          type: GRAPH_NODE_TYPE.EMPLOYEE,
          label: order.salesPerson,
        })
      }
      engine.addEdge({
        id: edgeId(GRAPH_EDGE_TYPE.EMPLOYEE_HAS_ORDER, empId, order.id),
        type: GRAPH_EDGE_TYPE.EMPLOYEE_HAS_ORDER,
        from: empId,
        to: order.id,
      })
    }

    for (const line of order.lines) {
      if (line.productId && line.product) {
        engine.addNode({
          id: line.productId,
          type: GRAPH_NODE_TYPE.PRODUCT,
          label: line.product.productName,
          properties: { productCode: line.product.productCode },
        })
        engine.addEdge({
          id: edgeId(GRAPH_EDGE_TYPE.ORDER_HAS_PRODUCT, order.id, line.productId),
          type: GRAPH_EDGE_TYPE.ORDER_HAS_PRODUCT,
          from: order.id,
          to: line.productId,
        })
        if (line.supplierId) {
          engine.addEdge({
            id: edgeId(GRAPH_EDGE_TYPE.SUPPLIER_SUPPLIES_PRODUCT, line.supplierId, line.productId),
            type: GRAPH_EDGE_TYPE.SUPPLIER_SUPPLIES_PRODUCT,
            from: line.supplierId,
            to: line.productId,
          })
        }
      }
    }

    for (const payment of order.payments) {
      engine.addNode({
        id: payment.id,
        type: GRAPH_NODE_TYPE.PAYMENT,
        label: `${payment.kind} · ${Number(payment.amount)}`,
        properties: { status: payment.status, amount: Number(payment.amount) },
      })
      engine.addEdge({
        id: edgeId(GRAPH_EDGE_TYPE.ORDER_HAS_PAYMENT, order.id, payment.id),
        type: GRAPH_EDGE_TYPE.ORDER_HAS_PAYMENT,
        from: order.id,
        to: payment.id,
      })
      engine.addEdge({
        id: edgeId(GRAPH_EDGE_TYPE.PAYMENT_BELONGS_TO, payment.id, order.id),
        type: GRAPH_EDGE_TYPE.PAYMENT_BELONGS_TO,
        from: payment.id,
        to: order.id,
      })
    }

    for (const shipment of order.shipments) {
      engine.addNode({
        id: shipment.id,
        type: GRAPH_NODE_TYPE.SHIPMENT,
        label: shipment.status,
        properties: { status: shipment.status, crewName: shipment.crewName },
      })
      engine.addEdge({
        id: edgeId(GRAPH_EDGE_TYPE.ORDER_HAS_SHIPMENT, order.id, shipment.id),
        type: GRAPH_EDGE_TYPE.ORDER_HAS_SHIPMENT,
        from: order.id,
        to: shipment.id,
      })
      if (shipment.crewName) {
        const crewId = employeeNodeId(shipment.crewName)
        if (!employeeSeen.has(crewId)) {
          employeeSeen.set(crewId, true)
          engine.addNode({ id: crewId, type: GRAPH_NODE_TYPE.EMPLOYEE, label: shipment.crewName })
        }
        engine.addEdge({
          id: edgeId(GRAPH_EDGE_TYPE.SHIPMENT_ASSIGNED_TO, shipment.id, crewId),
          type: GRAPH_EDGE_TYPE.SHIPMENT_ASSIGNED_TO,
          from: shipment.id,
          to: crewId,
        })
      }
    }

    if (isOverdueOrder(order) || Number(order.remainingAmount) > 5000) {
      const rId = riskNodeId(order.id)
      engine.addNode({
        id: rId,
        type: GRAPH_NODE_TYPE.RISK,
        label: `Risk · ${order.id}`,
        properties: { overdue: isOverdueOrder(order), remaining: Number(order.remainingAmount) },
      })
      const tId = taskNodeId(`collection:${order.id}`)
      engine.addNode({
        id: tId,
        type: GRAPH_NODE_TYPE.TASK,
        label: `Tahsilat görevi · ${order.id}`,
        properties: { domain: 'collection' },
      })
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

  const collabMessages = detectCollaborationSignals({
    domains: {
      collection: { score: 4, pressure: 3 },
      procurement: { score: 2, pressure: 2 },
      sales: { score: 2, pressure: 1 },
    },
    dominant: 'collection',
    conflicts: [],
    topOrderId: orders[0]?.id,
    todayIso: new Date().toISOString().slice(0, 10),
  })
  for (const msg of collabMessages) {
    engine.addEdge({
      id: edgeId(GRAPH_EDGE_TYPE.WORKER_COLLABORATES_WITH, msg.fromWorkerId, msg.toWorkerId),
      type: GRAPH_EDGE_TYPE.WORKER_COLLABORATES_WITH,
      from: msg.fromWorkerId,
      to: msg.toWorkerId,
      properties: { messageType: msg.type, reason: msg.reason },
    })
  }

  cachedEngine = engine
  cachedAt = now
  return engine
}

export function resetKnowledgeGraphCacheForTests(): void {
  cachedEngine = null
  cachedAt = 0
}

export async function queryKnowledgeGraph(
  prisma: PrismaClient,
  queryName: string,
  params: Record<string, string> = {},
): Promise<GraphQueryResultDto> {
  const started = Date.now()
  const engine = await buildKnowledgeGraph(prisma)
  const stats = engine.stats()

  if (queryName === 'overdue_payment_ready_shipment') {
    const orders = engine.getNodesByType(GRAPH_NODE_TYPE.ORDER).filter((n) => {
      const p = n.properties ?? {}
      return p.overdue === true && p.shipmentReady === true
    })
    /** @type {import('../../contracts/knowledgeGraphDto.js').GraphNodeDto[][]} */
    const matches = orders.map((order) => {
      const customer = engine
        .getNeighbors(order.id, { direction: 'in', edgeTypes: [GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER] })[0]
      const payments = engine.getNeighbors(order.id, {
        edgeTypes: [GRAPH_EDGE_TYPE.ORDER_HAS_PAYMENT],
      })
      const shipments = engine.getNeighbors(order.id, {
        edgeTypes: [GRAPH_EDGE_TYPE.ORDER_HAS_SHIPMENT],
      })
      return [customer, ...payments, ...shipments, order].filter(Boolean)
    })
    const nodes = matches.flat()
    const nodeIds = new Set(nodes.map((n) => n.id))
    return {
      query: queryName,
      path: ['Payment', 'Shipment', 'Order', 'Customer'],
      nodes: [...nodeIds].map((id) => engine.getNode(id)!).filter(Boolean),
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

  if (queryName === 'employee_risky_customers') {
    const name = (params.employee ?? params.name ?? '').toLowerCase()
    const employees = engine.getNodesByType(GRAPH_NODE_TYPE.EMPLOYEE).filter((e) =>
      e.label.toLowerCase().includes(name),
    )
    /** @type {import('../../contracts/knowledgeGraphDto.js').GraphNodeDto[][]} */
    const matches = []
    for (const emp of employees) {
      const orders = engine.getNeighbors(emp.id, { edgeTypes: [GRAPH_EDGE_TYPE.EMPLOYEE_HAS_ORDER] })
      for (const order of orders) {
        const customers = engine.getNeighbors(order.id, {
          direction: 'in',
          edgeTypes: [GRAPH_EDGE_TYPE.CUSTOMER_HAS_ORDER],
        })
        const risks = engine.getNeighbors(order.id, {
          direction: 'out',
          edgeTypes: [GRAPH_EDGE_TYPE.TASK_CREATED_RISK],
          nodeTypes: [GRAPH_NODE_TYPE.RISK],
        })
        if (risks.length) matches.push([emp, order, ...customers, ...risks])
      }
    }
    const allNodes = matches.flat()
    const unique = [...new Map(allNodes.map((n) => [n.id, n])).values()]
    return {
      query: queryName,
      path: ['Employee', 'Order', 'Customer', 'Risk'],
      nodes: unique,
      edges: [],
      matches,
      meta: {
        nodeCount: stats.nodeCount,
        edgeCount: stats.edgeCount,
        durationMs: Date.now() - started,
        traversed: unique.length,
      },
    }
  }

  return {
    query: queryName,
    path: [],
    nodes: [],
    edges: [],
    matches: [],
    meta: {
      nodeCount: stats.nodeCount,
      edgeCount: stats.edgeCount,
      durationMs: Date.now() - started,
      traversed: 0,
    },
  }
}

export async function getCustomerSubgraph(prisma: PrismaClient, customerId: string): Promise<GraphSubgraphDto | null> {
  const engine = await buildKnowledgeGraph(prisma)
  const node = engine.getNode(customerId)
  if (!node) return null
  const { nodes, edges } = engine.subgraph(customerId, 3)
  return { nodes, edges, centerId: customerId }
}

export async function getOrderSubgraph(prisma: PrismaClient, orderId: string): Promise<GraphSubgraphDto | null> {
  const engine = await buildKnowledgeGraph(prisma)
  const node = engine.getNode(orderId)
  if (!node) return null
  const { nodes, edges } = engine.subgraph(orderId, 3)
  return { nodes, edges, centerId: orderId }
}

export async function getGraphStats(prisma: PrismaClient) {
  const engine = await buildKnowledgeGraph(prisma)
  return engine.stats()
}

export { KnowledgeGraphEngine }
