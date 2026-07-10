import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  getCompanyPredictions,
  getCustomerPrediction,
  getOrderPrediction,
} from '../services/prediction/PredictionService.js'

export function registerPredictionRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/v1/predictions/order/:id', async (req, reply) => {
    const id = String((req.params as { id: string }).id)
    const prediction = await getOrderPrediction(prisma, id)
    if (!prediction) {
      reply.code(404)
      return { error: 'Order not found' }
    }
    return prediction
  })

  app.get('/v1/predictions/customer/:id', async (req, reply) => {
    const id = decodeURIComponent(String((req.params as { id: string }).id))
    const prediction = await getCustomerPrediction(prisma, id)
    if (!prediction) {
      reply.code(404)
      return { error: 'Customer not found' }
    }
    return prediction
  })

  app.get('/v1/predictions/company', async () => getCompanyPredictions(prisma))
}
