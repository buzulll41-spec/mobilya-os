import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { getEnterpriseReleaseMarkdown, getEnterpriseReleaseReport } from '../services/enterprise/EnterpriseReleaseService.js'

export function registerEnterpriseReleaseRoutes(app: FastifyInstance, _prisma: PrismaClient): void {
  app.get('/v1/enterprise/release', async () => getEnterpriseReleaseReport())

  app.get('/v1/enterprise/release/report', async () => ({
    markdown: getEnterpriseReleaseMarkdown(),
    report: getEnterpriseReleaseReport(),
  }))
}
