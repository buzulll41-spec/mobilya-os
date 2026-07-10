import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  getCompanyDecisionQuality,
  getDecisionQualityHistory,
  getWorkerDecisionQuality,
} from '../services/decision/DecisionQualityService.js'

export function registerDecisionRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/v1/decision/company', async () => getCompanyDecisionQuality(prisma))

  app.get('/v1/decision/worker/:id', async (req, reply) => {
    const id = String((req.params as { id: string }).id)
    const result = await getWorkerDecisionQuality(prisma, id)
    if (!result) {
      reply.code(404)
      return { error: 'No decisions for worker' }
    }
    return result
  })

  app.get('/v1/decision/history', async (req) => {
    const q = req.query as { limit?: string }
    const limit = q.limit ? Number(q.limit) : 50
    return getDecisionQualityHistory(prisma, Number.isFinite(limit) ? limit : 50)
  })
}
