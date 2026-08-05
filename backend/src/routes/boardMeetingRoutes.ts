import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import {
  getBoardMeetingHistory,
  getLatestBoardMeeting,
  runBoardMeeting,
} from '../services/board/BoardMeetingService.js'

export function registerBoardMeetingRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.post('/v1/board/meeting', async (req) => {
    const body = (req.body ?? {}) as { question?: string }
    return runBoardMeeting(prisma, body.question ?? 'Bugünkü şirket toplantısı')
  })

  app.get('/v1/board/latest', async () => getLatestBoardMeeting(prisma))

  app.get('/v1/board/history', async (req) => {
    const q = req.query as { limit?: string }
    const limit = q.limit ? Number(q.limit) : 20
    return getBoardMeetingHistory(prisma, Number.isFinite(limit) ? limit : 20)
  })
}
