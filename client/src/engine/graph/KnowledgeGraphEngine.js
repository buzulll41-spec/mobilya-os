import { GRAPH_EDGE_TYPE, GRAPH_NODE_TYPE } from '../../contracts/v1/knowledgeGraph.js'

export class KnowledgeGraphEngine {
  constructor() {
    /** @type {Map<string, import('../../contracts/v1/knowledgeGraph.js').GraphNodeDto>} */
    this.nodes = new Map()
    /** @type {Map<string, import('../../contracts/v1/knowledgeGraph.js').GraphEdgeDto>} */
    this.edges = new Map()
    /** @type {Map<string, import('../../contracts/v1/knowledgeGraph.js').GraphEdgeDto[]>} */
    this.out = new Map()
    /** @type {Map<string, import('../../contracts/v1/knowledgeGraph.js').GraphEdgeDto[]>} */
    this.in = new Map()
    /** @type {Map<string, Set<string>>} */
    this.nodesByType = new Map()
  }

  /** @param {import('../../contracts/v1/knowledgeGraph.js').GraphNodeDto} node */
  addNode(node) {
    this.nodes.set(node.id, node)
    if (!this.nodesByType.has(node.type)) this.nodesByType.set(node.type, new Set())
    this.nodesByType.get(node.type).add(node.id)
    return node
  }

  /** @param {import('../../contracts/v1/knowledgeGraph.js').GraphEdgeDto} edge */
  addEdge(edge) {
    this.edges.set(edge.id, edge)
    if (!this.out.has(edge.from)) this.out.set(edge.from, [])
    if (!this.in.has(edge.to)) this.in.set(edge.to, [])
    this.out.get(edge.from).push(edge)
    this.in.get(edge.to).push(edge)
    return edge
  }

  getNode(id) {
    return this.nodes.get(id)
  }

  /** @param {string} type */
  getNodesByType(type) {
    const ids = this.nodesByType.get(type)
    if (!ids) return []
    return [...ids].map((id) => this.nodes.get(id)).filter(Boolean)
  }

  /**
   * @param {string} id
   * @param {{ maxDepth?: number, edgeTypes?: string[], nodeTypes?: string[], direction?: 'out'|'in'|'both' }} [opts]
   */
  getNeighbors(id, opts = {}) {
    const direction = opts.direction ?? 'out'
    /** @type {import('../../contracts/v1/knowledgeGraph.js').GraphEdgeDto[]} */
    const related = []
    if (direction === 'out' || direction === 'both') related.push(...(this.out.get(id) ?? []))
    if (direction === 'in' || direction === 'both') related.push(...(this.in.get(id) ?? []))
    const filtered = related.filter((e) => !opts.edgeTypes || opts.edgeTypes.includes(e.type))
    const ids = new Set()
    for (const e of filtered) {
      if (direction === 'in' || direction === 'both') ids.add(e.from)
      if (direction === 'out' || direction === 'both') ids.add(e.to)
    }
    ids.delete(id)
    return [...ids]
      .map((nid) => this.nodes.get(nid))
      .filter(Boolean)
      .filter((n) => !opts.nodeTypes || opts.nodeTypes.includes(n.type))
  }

  /**
   * @param {string} startId
   * @param {{ maxDepth?: number, edgeTypes?: string[], nodeTypes?: string[], direction?: 'out'|'in'|'both' }} [opts]
   */
  traverse(startId, opts = {}) {
    const maxDepth = opts.maxDepth ?? 4
    const visitedNodes = new Set()
    const visitedEdges = new Set()
    /** @type {import('../../contracts/v1/knowledgeGraph.js').GraphEdgeDto[]} */
    const collectedEdges = []

    const walk = (nodeId, depth) => {
      if (depth > maxDepth) return
      visitedNodes.add(nodeId)
      const direction = opts.direction ?? 'both'
      const edgeLists = []
      if (direction === 'out' || direction === 'both') edgeLists.push(...(this.out.get(nodeId) ?? []))
      if (direction === 'in' || direction === 'both') edgeLists.push(...(this.in.get(nodeId) ?? []))
      for (const edge of edgeLists) {
        if (opts.edgeTypes && !opts.edgeTypes.includes(edge.type)) continue
        if (visitedEdges.has(edge.id)) continue
        visitedEdges.add(edge.id)
        collectedEdges.push(edge)
        const next = edge.from === nodeId ? edge.to : edge.from
        if (!visitedNodes.has(next)) walk(next, depth + 1)
      }
    }

    walk(startId, 0)
    return {
      nodes: [...visitedNodes].map((id) => this.nodes.get(id)).filter(Boolean),
      edges: collectedEdges,
      visited: visitedNodes.size,
    }
  }

  detectCycles(maxDepth = 12) {
    /** @type {string[][]} */
    const cycles = []
    const visiting = new Set()
    /** @type {string[]} */
    const path = []

    const dfs = (nodeId, depth) => {
      if (depth > maxDepth) return
      if (visiting.has(nodeId)) {
        const idx = path.indexOf(nodeId)
        if (idx >= 0) cycles.push(path.slice(idx).concat(nodeId))
        return
      }
      visiting.add(nodeId)
      path.push(nodeId)
      for (const edge of this.out.get(nodeId) ?? []) dfs(edge.to, depth + 1)
      path.pop()
      visiting.delete(nodeId)
    }

    for (const id of this.nodes.keys()) dfs(id, 0)
    return cycles
  }

  subgraph(centerId, depth = 2) {
    return this.traverse(centerId, { maxDepth: depth, direction: 'both' })
  }

  stats() {
    /** @type {Record<string, number>} */
    const nodesByType = {}
    /** @type {Record<string, number>} */
    const edgesByType = {}
    for (const [type, ids] of this.nodesByType.entries()) nodesByType[type] = ids.size
    for (const edge of this.edges.values()) {
      edgesByType[edge.type] = (edgesByType[edge.type] ?? 0) + 1
    }
    return { nodeCount: this.nodes.size, edgeCount: this.edges.size, nodesByType, edgesByType }
  }

  clear() {
    this.nodes.clear()
    this.edges.clear()
    this.out.clear()
    this.in.clear()
    this.nodesByType.clear()
  }
}

export function customerNodeId(name, phone) {
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-')
  return `customer:${slug}:${phone ?? 'na'}`
}

export function employeeNodeId(name) {
  return `employee:${name.trim().toLowerCase().replace(/\s+/g, '-')}`
}

export function riskNodeId(orderId) {
  return `risk:${orderId}`
}

export function taskNodeId(source) {
  return `task:${source}`
}

export function edgeId(type, from, to) {
  return `${type}:${from}->${to}`
}

export { GRAPH_EDGE_TYPE, GRAPH_NODE_TYPE }
