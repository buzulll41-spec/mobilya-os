import type { FastifyInstance } from 'fastify'
import type { PrismaClient } from '@prisma/client'
import { AppHttpError } from '../errors/apiError.js'
import {
  approveExecution,
  buildExecutionSummary,
  executeTool,
  listExecutions,
  listRegisteredTools,
  rejectExecution,
} from '../services/ai/tools/ToolEngine.js'

function parseExecuteBody(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body required', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const workerId = typeof o.workerId === 'string' ? o.workerId.trim() : ''
  const toolName = typeof o.toolName === 'string' ? o.toolName.trim() : ''
  if (!workerId || !toolName) {
    throw new AppHttpError(400, 'workerId and toolName required', 'Bad Request')
  }
  const parameters =
    o.parameters && typeof o.parameters === 'object' && !Array.isArray(o.parameters)
      ? (o.parameters as Record<string, unknown>)
      : {}

  return {
    workerId,
    toolName,
    parameters,
    orderId: typeof o.orderId === 'string' ? o.orderId : undefined,
    runId: typeof o.runId === 'string' ? o.runId : undefined,
    taskId: typeof o.taskId === 'string' ? o.taskId : undefined,
    skipApproval: o.skipApproval === true,
  }
}

function parseManagerBody(body: unknown) {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body required', 'Bad Request')
  }
  const o = body as Record<string, unknown>
  const managerName = typeof o.managerName === 'string' ? o.managerName.trim() : ''
  if (!managerName) {
    throw new AppHttpError(400, 'managerName required', 'Bad Request')
  }
  return {
    managerName,
    managerNote: typeof o.managerNote === 'string' ? o.managerNote : undefined,
  }
}

export function registerAiToolRoutes(app: FastifyInstance, prisma: PrismaClient): void {
  app.get('/v1/ai/tools', async (req) => {
    const q = req.query as Record<string, string | undefined>
    const workerId = q.workerId
    return listRegisteredTools(workerId)
  })

  app.post('/v1/ai/tools/execute', async (req) => {
    const body = parseExecuteBody(req.body)
    return executeTool(prisma, body)
  })

  app.get('/v1/ai/executions', async (req) => {
    const q = req.query as Record<string, string | undefined>
    return listExecutions(prisma, {
      workerId: q.workerId,
      status: q.status,
      todayIso: q.todayIso,
      limit: q.limit ? Number(q.limit) : 100,
    })
  })

  app.get('/v1/ai/executions/summary', async (req) => {
    const q = req.query as Record<string, string | undefined>
    const todayIso = q.todayIso ?? new Date().toISOString().slice(0, 10)
    return buildExecutionSummary(prisma, todayIso)
  })

  app.patch('/v1/ai/executions/:id/approve', async (req) => {
    const id = String((req.params as { id: string }).id)
    const body = parseManagerBody(req.body)
    const row = await approveExecution(prisma, id, body.managerName, body.managerNote)
    if (!row) throw new AppHttpError(404, 'Execution not found or not pending approval', 'Not Found')
    return row
  })

  app.patch('/v1/ai/executions/:id/reject', async (req) => {
    const id = String((req.params as { id: string }).id)
    const body = parseManagerBody(req.body)
    const row = await rejectExecution(prisma, id, body.managerName, body.managerNote)
    if (!row) throw new AppHttpError(404, 'Execution not found or not pending approval', 'Not Found')
    return row
  })
}
