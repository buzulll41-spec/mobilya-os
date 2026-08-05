import type { Prisma, PrismaClient } from '@prisma/client'
import type { AiToolResult, LlmToolDefinition } from '../../../contracts/llmDto.js'

export type ToolExecutionContext = {
  prisma: PrismaClient
  workerId: string
  orderId: string
  runId: string
}

export type ToolHandler = (
  ctx: ToolExecutionContext,
  args: Record<string, unknown>,
) => Promise<unknown>

async function appendAiDomainEvent(
  prisma: PrismaClient,
  orderId: string,
  type: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const order = await prisma.salesOrder.findUnique({ where: { id: orderId } })
  if (!order) throw new Error(`Order not found: ${orderId}`)

  await prisma.domainEvent.create({
    data: {
      type,
      aggregateType: 'SalesOrder',
      aggregateId: orderId,
      occurredAt: new Date(),
      correlationId: `ai-${orderId}-${type}-${Date.now()}`,
      payload: {
        ...payload,
        source: 'ai_worker',
      } as Prisma.InputJsonValue,
    },
  })
}

/** ERP servisleri tool olarak — Business Engine üzerinden kontrollü side-effect. */
const TOOL_HANDLERS: Record<string, { workerIds: string[]; handler: ToolHandler; definition: LlmToolDefinition }> = {
  log_sales_follow_up: {
    workerIds: ['dw-sales-follow-up'],
    definition: {
      name: 'log_sales_follow_up',
      description: 'Satış takip araması veya müşteri iletişim notu kaydet',
      parameters: {
        type: 'object',
        properties: {
          note: { type: 'string', description: 'Arama/not özeti' },
          outcome: { type: 'string', enum: ['reached', 'no_answer', 'callback_scheduled'] },
        },
        required: ['note', 'outcome'],
      },
    },
    handler: async (ctx, args) => {
      await appendAiDomainEvent(ctx.prisma, ctx.orderId, 'sales.follow_up.call_logged', {
        note: args.note,
        outcome: args.outcome,
        workerId: ctx.workerId,
        runId: ctx.runId,
      })
      return { logged: true, outcome: args.outcome }
    },
  },
  create_collection_reminder: {
    workerIds: ['dw-collection'],
    definition: {
      name: 'create_collection_reminder',
      description: 'Tahsilat hatırlatması domain event kaydı oluştur',
      parameters: {
        type: 'object',
        properties: {
          amount: { type: 'string', description: 'Hatırlatılacak tutar TL' },
          dueNote: { type: 'string', description: 'Vade/not açıklaması' },
        },
        required: ['amount', 'dueNote'],
      },
    },
    handler: async (ctx, args) => {
      await appendAiDomainEvent(ctx.prisma, ctx.orderId, 'ai.collection.task.created', {
        worker: 'AI Collection',
        amount: args.amount,
        dueNote: args.dueNote,
        runId: ctx.runId,
      })
      return { reminderCreated: true }
    },
  },
  plan_shipment_action: {
    workerIds: ['dw-shipment'],
    definition: {
      name: 'plan_shipment_action',
      description: 'Sevk planlama aksiyonu öner/kaydet',
      parameters: {
        type: 'object',
        properties: {
          action: { type: 'string', enum: ['plan', 'hold', 'escalate'] },
          note: { type: 'string' },
        },
        required: ['action', 'note'],
      },
    },
    handler: async (ctx, args) => {
      await appendAiDomainEvent(ctx.prisma, ctx.orderId, 'ai.shipment.task.created', {
        action: args.action,
        note: args.note,
        runId: ctx.runId,
      })
      return { action: args.action, recorded: true }
    },
  },
  create_procurement_task: {
    workerIds: ['dw-procurement'],
    definition: {
      name: 'create_procurement_task',
      description: 'Tedarik görevi/eksik ürün aksiyonu kaydet',
      parameters: {
        type: 'object',
        properties: {
          itemDescription: { type: 'string' },
          urgency: { type: 'string', enum: ['normal', 'high', 'critical'] },
        },
        required: ['itemDescription', 'urgency'],
      },
    },
    handler: async (ctx, args) => {
      await appendAiDomainEvent(ctx.prisma, ctx.orderId, 'ai.procurement.task.created', {
        itemDescription: args.itemDescription,
        urgency: args.urgency,
        runId: ctx.runId,
      })
      return { taskRecorded: true }
    },
  },
}

export function getToolsForWorker(workerId: string): LlmToolDefinition[] {
  return Object.values(TOOL_HANDLERS)
    .filter((t) => t.workerIds.includes(workerId))
    .map((t) => t.definition)
}

export async function executeToolCall(
  ctx: ToolExecutionContext,
  toolName: string,
  args: Record<string, unknown>,
): Promise<AiToolResult> {
  const entry = TOOL_HANDLERS[toolName]
  if (!entry) {
    return { toolName, success: false, error: `Unknown tool: ${toolName}` }
  }
  if (!entry.workerIds.includes(ctx.workerId)) {
    return { toolName, success: false, error: `Tool ${toolName} not allowed for ${ctx.workerId}` }
  }
  try {
    const output = await entry.handler(ctx, args)
    return { toolName, success: true, output }
  } catch (err) {
    return {
      toolName,
      success: false,
      error: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function executeToolCalls(
  ctx: ToolExecutionContext,
  calls: Array<{ name: string; arguments: Record<string, unknown> }>,
): Promise<AiToolResult[]> {
  const results: AiToolResult[] = []
  for (const call of calls) {
    results.push(await executeToolCall(ctx, call.name, call.arguments))
  }
  return results
}
