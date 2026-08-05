/** FAZ 103 — Company Knowledge Graph contracts. */

export const GRAPH_NODE_TYPE = {
  CUSTOMER: 'Customer',
  ORDER: 'Order',
  PRODUCT: 'Product',
  SUPPLIER: 'Supplier',
  PAYMENT: 'Payment',
  SHIPMENT: 'Shipment',
  WORKER: 'Worker',
  EMPLOYEE: 'Employee',
  TASK: 'Task',
  RISK: 'Risk',
  AI_WORKER: 'AIWorker',
} as const

export type GraphNodeType = (typeof GRAPH_NODE_TYPE)[keyof typeof GRAPH_NODE_TYPE]

export const GRAPH_EDGE_TYPE = {
  CUSTOMER_HAS_ORDER: 'CUSTOMER_HAS_ORDER',
  ORDER_HAS_PRODUCT: 'ORDER_HAS_PRODUCT',
  ORDER_HAS_PAYMENT: 'ORDER_HAS_PAYMENT',
  ORDER_HAS_SHIPMENT: 'ORDER_HAS_SHIPMENT',
  SHIPMENT_ASSIGNED_TO: 'SHIPMENT_ASSIGNED_TO',
  PAYMENT_BELONGS_TO: 'PAYMENT_BELONGS_TO',
  SUPPLIER_SUPPLIES_PRODUCT: 'SUPPLIER_SUPPLIES_PRODUCT',
  EMPLOYEE_HAS_ORDER: 'EMPLOYEE_HAS_ORDER',
  WORKER_CREATED_TASK: 'WORKER_CREATED_TASK',
  TASK_CREATED_RISK: 'TASK_CREATED_RISK',
  AI_SOLVED_RISK: 'AI_SOLVED_RISK',
  WORKER_COLLABORATES_WITH: 'WORKER_COLLABORATES_WITH',
} as const

export type GraphEdgeType = (typeof GRAPH_EDGE_TYPE)[keyof typeof GRAPH_EDGE_TYPE]

export type GraphNodeDto = {
  id: string
  type: GraphNodeType
  label: string
  properties?: Record<string, unknown>
}

export type GraphEdgeDto = {
  id: string
  type: GraphEdgeType
  from: string
  to: string
  properties?: Record<string, unknown>
}

export type GraphSubgraphDto = {
  nodes: GraphNodeDto[]
  edges: GraphEdgeDto[]
  centerId: string
}

export type GraphQueryResultDto = {
  query: string
  path: string[]
  nodes: GraphNodeDto[]
  edges: GraphEdgeDto[]
  matches: GraphNodeDto[][]
  meta: {
    nodeCount: number
    edgeCount: number
    durationMs: number
    traversed: number
  }
}

export type GraphStatsDto = {
  nodeCount: number
  edgeCount: number
  nodesByType: Record<string, number>
  edgesByType: Record<string, number>
}
