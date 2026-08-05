import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  getCompanyLearning,
  getLearningStatistics,
  getOrderLearning,
} from '../services/learning/LearningEngineService.js'

export function registerLearningRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/v1/learning/company', async () => getCompanyLearning(prisma))

  app.get('/v1/learning/order/:id', async (req, reply) => {
    const id = String((req.params as { id: string }).id)
    const result = await getOrderLearning(prisma, id)
    if (!result) {
      reply.code(404)
      return { error: 'No learning records for order' }
    }
    return result
  })

  app.get('/v1/learning/statistics', async () => getLearningStatistics(prisma))
}
