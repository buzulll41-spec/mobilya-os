import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  getCompanyOptimization,
  getOptimizationHistory,
  getWorkerOptimization,
} from '../services/optimization/SelfOptimizationService.js'

export function registerOptimizationRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/v1/optimization/company', async () => getCompanyOptimization(prisma))

  app.get('/v1/optimization/worker/:id', async (req, reply) => {
    const id = String((req.params as { id: string }).id)
    const result = await getWorkerOptimization(prisma, id)
    if (!result) {
      reply.code(404)
      return { error: 'Worker not found' }
    }
    return result
  })

  app.get('/v1/optimization/history', async (req) => {
    const q = req.query as { limit?: string }
    const limit = q.limit ? Number(q.limit) : 50
    return getOptimizationHistory(prisma, Number.isFinite(limit) ? limit : 50)
  })
}
