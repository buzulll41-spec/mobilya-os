import {
  GRAPH_EDGE_TYPE,
  type GraphEdgeDto,
  type GraphEdgeType,
  type GraphNodeDto,
  type GraphNodeType,
  type GraphStatsDto,
} from '../../contracts/knowledgeGraphDto.js'

export type TraversalOptions = {
  maxDepth?: number
  edgeTypes?: GraphEdgeType[]
  nodeTypes?: GraphNodeType[]
  direction?: 'out' | 'in' | 'both'
}

export class KnowledgeGraphEngine {
  private nodes = new Map<string, GraphNodeDto>()
  private edges = new Map<string, GraphEdgeDto>()
  private out = new Map<string, GraphEdgeDto[]>()
  private in = new Map<string, GraphEdgeDto[]>()
  private nodesByType = new Map<string, Set<string>>()

  addNode(node: GraphNodeDto): GraphNodeDto {
    this.nodes.set(node.id, node)
    if (!this.nodesByType.has(node.type)) this.nodesByType.set(node.type, new Set())
    this.nodesByType.get(node.type)!.add(node.id)
    return node
  }

  addEdge(edge: GraphEdgeDto): GraphEdgeDto {
    this.edges.set(edge.id, edge)
    if (!this.out.has(edge.from)) this.out.set(edge.from, [])
    if (!this.in.has(edge.to)) this.in.set(edge.to, [])
    this.out.get(edge.from)!.push(edge)
    this.in.get(edge.to)!.push(edge)
    return edge
  }

  getNode(id: string): GraphNodeDto | undefined {
    return this.nodes.get(id)
  }

  getNodesByType(type: GraphNodeType): GraphNodeDto[] {
    const ids = this.nodesByType.get(type)
    if (!ids) return []
    return [...ids].map((id) => this.nodes.get(id)!).filter(Boolean)
  }

  getNeighbors(id: string, opts: TraversalOptions = {}): GraphNodeDto[] {
    const direction = opts.direction ?? 'out'
    /** @type {GraphEdgeDto[]} */
    const related: GraphEdgeDto[] = []
    if (direction === 'out' || direction === 'both') {
      related.push(...(this.out.get(id) ?? []))
    }
    if (direction === 'in' || direction === 'both') {
      related.push(...(this.in.get(id) ?? []))
    }
    const filtered = related.filter((e) => !opts.edgeTypes || opts.edgeTypes.includes(e.type))
    const ids = new Set<string>()
    for (const e of filtered) {
      if (direction === 'in' || direction === 'both') ids.add(e.from)
      if (direction === 'out' || direction === 'both') ids.add(e.to)
    }
    ids.delete(id)
    return [...ids]
      .map((nid) => this.nodes.get(nid))
      .filter((n): n is GraphNodeDto => Boolean(n))
      .filter((n) => !opts.nodeTypes || opts.nodeTypes.includes(n.type))
  }

  traverse(startId: string, opts: TraversalOptions = {}): { nodes: GraphNodeDto[]; edges: GraphEdgeDto[]; visited: number } {
    const maxDepth = opts.maxDepth ?? 4
    const visitedNodes = new Set<string>()
    const visitedEdges = new Set<string>()
    /** @type {GraphEdgeDto[]} */
    const collectedEdges: GraphEdgeDto[] = []

    const walk = (nodeId: string, depth: number) => {
      if (depth > maxDepth) return
      visitedNodes.add(nodeId)
      const node = this.nodes.get(nodeId)
      if (!node) return
      if (opts.nodeTypes && depth > 0 && !opts.nodeTypes.includes(node.type)) return

      const direction = opts.direction ?? 'both'
      const edgeLists: GraphEdgeDto[] = []
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
      nodes: [...visitedNodes].map((id) => this.nodes.get(id)!).filter(Boolean),
      edges: collectedEdges,
      visited: visitedNodes.size,
    }
  }

  detectCycles(maxDepth = 12): string[][] {
    /** @type {string[][]} */
    const cycles: string[][] = []
    const visiting = new Set<string>()
    const path: string[] = []

    const dfs = (nodeId: string, depth: number) => {
      if (depth > maxDepth) return
      if (visiting.has(nodeId)) {
        const idx = path.indexOf(nodeId)
        if (idx >= 0) cycles.push(path.slice(idx).concat(nodeId))
        return
      }
      visiting.add(nodeId)
      path.push(nodeId)
      for (const edge of this.out.get(nodeId) ?? []) {
        dfs(edge.to, depth + 1)
      }
      path.pop()
      visiting.delete(nodeId)
    }

    for (const id of this.nodes.keys()) dfs(id, 0)
    return cycles
  }

  subgraph(centerId: string, depth = 2): { nodes: GraphNodeDto[]; edges: GraphEdgeDto[] } {
    const { nodes, edges } = this.traverse(centerId, { maxDepth: depth, direction: 'both' })
    return { nodes, edges }
  }

  stats(): GraphStatsDto {
    /** @type {Record<string, number>} */
    const nodesByType: Record<string, number> = {}
    /** @type {Record<string, number>} */
    const edgesByType: Record<string, number> = {}
    for (const [type, ids] of this.nodesByType.entries()) nodesByType[type] = ids.size
    for (const edge of this.edges.values()) {
      edgesByType[edge.type] = (edgesByType[edge.type] ?? 0) + 1
    }
    return {
      nodeCount: this.nodes.size,
      edgeCount: this.edges.size,
      nodesByType,
      edgesByType,
    }
  }

  clear(): void {
    this.nodes.clear()
    this.edges.clear()
    this.out.clear()
    this.in.clear()
    this.nodesByType.clear()
  }
}

export function customerNodeId(name: string, phone?: string | null): string {
  const slug = name.trim().toLowerCase().replace(/\s+/g, '-')
  return `customer:${slug}:${phone ?? 'na'}`
}

export function employeeNodeId(name: string): string {
  return `employee:${name.trim().toLowerCase().replace(/\s+/g, '-')}`
}

export function riskNodeId(orderId: string): string {
  return `risk:${orderId}`
}

export function taskNodeId(source: string): string {
  return `task:${source}`
}

export function edgeId(type: GraphEdgeType, from: string, to: string): string {
  return `${type}:${from}->${to}`
}

export { GRAPH_EDGE_TYPE }
