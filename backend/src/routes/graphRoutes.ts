import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import {
  getCustomerSubgraph,
  getGraphStats,
  getOrderSubgraph,
  queryKnowledgeGraph,
} from '../services/graph/KnowledgeGraphService.js'

export function registerGraphRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/v1/graph/query', async (req) => {
    const q = req.query as { q?: string; employee?: string; name?: string }
    const query = typeof q.q === 'string' ? q.q.trim() : ''
    if (!query) {
      throw new AppHttpError(400, 'Query parameter q is required', 'Bad Request')
    }
    const params: Record<string, string> = {}
    if (typeof q.employee === 'string') params.employee = q.employee
    if (typeof q.name === 'string') params.name = q.name
    return queryKnowledgeGraph(prisma, query, params)
  })

  app.get('/v1/graph/customer/:id', async (req, reply) => {
    const id = decodeURIComponent(String((req.params as { id: string }).id))
    const subgraph = await getCustomerSubgraph(prisma, id)
    if (!subgraph) {
      reply.code(404)
      return { error: 'Customer node not found' }
    }
    return subgraph
  })

  app.get('/v1/graph/order/:id', async (req, reply) => {
    const id = String((req.params as { id: string }).id)
    const subgraph = await getOrderSubgraph(prisma, id)
    if (!subgraph) {
      reply.code(404)
      return { error: 'Order node not found' }
    }
    return subgraph
  })

  app.get('/v1/graph/stats', async () => getGraphStats(prisma))
}
