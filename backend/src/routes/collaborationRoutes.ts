import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  getCollaborationFeed,
  getCollaborationHistory,
  getCompanyCollaboration,
  getWorkerCollaboration,
} from '../services/collaboration/CollaborationService.js'

export function registerCollaborationRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/v1/collaboration/feed', async (req) => {
    const q = req.query as { limit?: string }
    const limit = q.limit ? Number(q.limit) : 30
    return getCollaborationFeed(prisma, Number.isFinite(limit) ? limit : 30)
  })

  app.get('/v1/collaboration/history', async (req) => {
    const q = req.query as { limit?: string }
    const limit = q.limit ? Number(q.limit) : 50
    return getCollaborationHistory(prisma, Number.isFinite(limit) ? limit : 50)
  })

  app.get('/v1/collaboration/worker/:id', async (req, reply) => {
    const id = String((req.params as { id: string }).id)
    const result = await getWorkerCollaboration(prisma, id)
    if (!result) {
      reply.code(404)
      return { error: 'Worker not found' }
    }
    return result
  })

  app.get('/v1/collaboration/company', async () => getCompanyCollaboration(prisma))
}
