import type { Prisma, PrismaClient } from '@prisma/client'
import type { AiToolExecutionDto } from '../../../contracts/aiToolDto.js'
import { AI_TOOL_DOMAIN_EVENT } from '../../../contracts/aiToolDto.js'

export type ToolAuditContext = {
  executionId: string
  workerId: string
  toolName: string
  orderId?: string | null
  runId?: string | null
  taskId?: string | null
  parameters: Record<string, unknown>
  status: string
  result?: Record<string, unknown> | null
  managerName?: string | null
  safeMode: boolean
}

function resolveEventType(status: string): string {
  switch (status) {
    case 'SUCCESS':
      return AI_TOOL_DOMAIN_EVENT.EXECUTED
    case 'FAILED':
      return AI_TOOL_DOMAIN_EVENT.FAILED
    case 'WAITING_APPROVAL':
      return AI_TOOL_DOMAIN_EVENT.WAITING_APPROVAL
    case 'DENIED':
      return AI_TOOL_DOMAIN_EVENT.DENIED
    default:
      return AI_TOOL_DOMAIN_EVENT.REQUESTED
  }
}

export async function writeToolAuditEvents(
  prisma: PrismaClient,
  ctx: ToolAuditContext,
): Promise<void> {
  const aggregateId = ctx.orderId ?? ctx.executionId
  const basePayload = {
    source: 'ai_tool_engine',
    executionId: ctx.executionId,
    workerId: ctx.workerId,
    toolName: ctx.toolName,
    runId: ctx.runId,
    taskId: ctx.taskId,
    parameters: ctx.parameters,
    status: ctx.status,
    result: ctx.result ?? null,
    managerName: ctx.managerName ?? null,
    safeMode: ctx.safeMode,
    audit: {
      module: 'AI_TOOL',
      recordId: ctx.executionId,
      description: `${ctx.toolName} · ${ctx.status}`,
    },
  }

  await prisma.domainEvent.create({
    data: {
      type: AI_TOOL_DOMAIN_EVENT.REQUESTED,
      aggregateType: ctx.orderId ? 'SalesOrder' : 'AIToolExecution',
      aggregateId,
      occurredAt: new Date(),
      correlationId: `ai-tool-req-${ctx.executionId}`,
      payload: basePayload as Prisma.InputJsonValue,
    },
  })

  const outcomeType = resolveEventType(ctx.status)
  if (outcomeType !== AI_TOOL_DOMAIN_EVENT.REQUESTED) {
    await prisma.domainEvent.create({
      data: {
        type: outcomeType,
        aggregateType: ctx.orderId ? 'SalesOrder' : 'AIToolExecution',
        aggregateId,
        occurredAt: new Date(),
        correlationId: `ai-tool-out-${ctx.executionId}-${ctx.status}`,
        payload: basePayload as Prisma.InputJsonValue,
      },
    })
  }
}

export async function writeToolApprovalEvent(
  prisma: PrismaClient,
  execution: AiToolExecutionDto,
  action: 'approved' | 'rejected',
  managerName: string,
  managerNote?: string,
): Promise<void> {
  const type =
    action === 'approved' ? AI_TOOL_DOMAIN_EVENT.APPROVED : AI_TOOL_DOMAIN_EVENT.REJECTED
  const aggregateId = execution.orderId ?? execution.id

  await prisma.domainEvent.create({
    data: {
      type,
      aggregateType: execution.orderId ? 'SalesOrder' : 'AIToolExecution',
      aggregateId,
      occurredAt: new Date(),
      correlationId: `ai-tool-${action}-${execution.id}`,
      payload: {
        source: 'ai_tool_engine',
        executionId: execution.id,
        workerId: execution.workerId,
        toolName: execution.toolName,
        managerName,
        managerNote: managerNote ?? null,
        audit: {
          module: 'AI_TOOL',
          recordId: execution.id,
          description: `${execution.toolName} · ${action}`,
        },
      } as Prisma.InputJsonValue,
    },
  })
}
