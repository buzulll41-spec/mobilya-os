import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import type { AiWorkerRunRequest } from '../contracts/llmDto.js'
import { AppHttpError } from '../errors/apiError.js'
import { getAiWorkerConfig, runAiWorkerTask } from '../services/ai/AiWorkerService.js'
import {
  buildCeoLearnedInsights,
  deactivateMemory,
  deleteMemory,
  listMemories,
} from '../services/memory/MemoryService.js'
import { resolveWorkerCode } from '../services/memory/memoryFromDomainEvent.js'

const PIPELINE_WORKERS = new Set([
  'dw-sales-follow-up',
  'dw-collection',
  'dw-shipment',
  'dw-procurement',
])

function parseRunRequest(body: unknown, workerId: string): AiWorkerRunRequest {
  if (!PIPELINE_WORKERS.has(workerId)) {
    throw new AppHttpError(404, `Unknown AI worker: ${workerId}`, 'Not Found')
  }
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body required', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const orderId = typeof o.orderId === 'string' ? o.orderId.trim() : ''
  if (!orderId) {
    throw new AppHttpError(400, 'orderId required', 'Bad Request')
  }

  return {
    workerId,
    orderId,
    taskId: typeof o.taskId === 'string' ? o.taskId : undefined,
    taskTitle: typeof o.taskTitle === 'string' ? o.taskTitle : undefined,
    businessSnapshot:
      o.businessSnapshot && typeof o.businessSnapshot === 'object'
        ? (o.businessSnapshot as Record<string, unknown>)
        : undefined,
    orderContext:
      o.orderContext && typeof o.orderContext === 'object'
        ? (o.orderContext as Record<string, unknown>)
        : undefined,
    ruleBaseline:
      o.ruleBaseline && typeof o.ruleBaseline === 'object'
        ? (o.ruleBaseline as AiWorkerRunRequest['ruleBaseline'])
        : undefined,
    executeTools: o.executeTools === true,
  }
}

export function registerAiWorkerRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/v1/ai/config', async () => getAiWorkerConfig())

  app.post('/v1/ai/workers/:workerId/evaluate', async (req) => {
    const workerId = String((req.params as { workerId: string }).workerId)
    const runReq = parseRunRequest(req.body, workerId)
    return runAiWorkerTask(prisma, { ...runReq, executeTools: false })
  })

  app.post('/v1/ai/workers/:workerId/run', async (req) => {
    const workerId = String((req.params as { workerId: string }).workerId)
    const runReq = parseRunRequest(req.body, workerId)
    return runAiWorkerTask(prisma, { ...runReq, executeTools: runReq.executeTools ?? true })
  })

  app.get('/v1/ai/memory', async (req) => {
    const q = req.query as Record<string, string | undefined>
    const workerCode = q.workerCode ?? (q.workerId ? resolveWorkerCode(q.workerId) : undefined)
    return listMemories(prisma, {
      workerCode,
      importance: q.importance,
      limit: q.limit ? Number(q.limit) : 50,
      active: q.active === 'false' ? false : true,
    })
  })

  app.get('/v1/ai/memory/ceo-insights', async () => buildCeoLearnedInsights(prisma))

  app.patch('/v1/ai/memory/:id/deactivate', async (req) => {
    const id = String((req.params as { id: string }).id)
    const row = await deactivateMemory(prisma, id)
    if (!row) throw new AppHttpError(404, 'Memory not found', 'Not Found')
    return row
  })

  app.delete('/v1/ai/memory/:id', async (req) => {
    const id = String((req.params as { id: string }).id)
    const ok = await deleteMemory(prisma, id)
    if (!ok) throw new AppHttpError(404, 'Memory not found', 'Not Found')
    return { ok: true }
  })
}
