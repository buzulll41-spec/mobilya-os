import type { PrismaClient } from '@prisma/client'
import type { AiWorkerAssessment } from '../../../contracts/llmDto.js'

export type WorkerContextInput = {
  workerId: string
  orderId: string
  businessSnapshot?: Record<string, unknown>
  orderContext?: Record<string, unknown>
  ruleBaseline?: AiWorkerAssessment
  taskTitle?: string
  taskId?: string
}

export type BuiltWorkerContext = {
  orderId: string
  workerId: string
  contextText: string
  orderSummary: Record<string, unknown>
  memoryContext?: string
}

/**
 * ERP context builder — Business Engine snapshot + kontrollü order projection.
 */
export async function buildWorkerContext(
  prisma: PrismaClient,
  input: WorkerContextInput & { memoryContext?: string },
): Promise<BuiltWorkerContext> {
  const order = await prisma.salesOrder.findUnique({
    where: { id: input.orderId },
    include: {
      lines: { take: 12 },
      payments: { take: 8, orderBy: { occurredAt: 'desc' } },
      missingItems: { take: 8 },
    },
  })

  const recentEvents = await prisma.domainEvent.findMany({
    where: { aggregateId: input.orderId },
    orderBy: { occurredAt: 'desc' },
    take: 15,
  })

  const orderSummary = order
    ? {
        id: order.id,
        customer: order.customerName,
        phone: order.customerPhone,
        product: order.productSummary,
        status: order.displayStatus,
        totalAmount: order.totalAmount.toString(),
        amountPaid: order.paidAmount.toString(),
        remainingAmount: order.remainingAmount.toString(),
        dueDate: order.dueDate?.toISOString?.()?.slice(0, 10) ?? null,
        lineCount: 'lines' in order && Array.isArray(order.lines) ? order.lines.length : 0,
        openMissingItems:
          'missingItems' in order && Array.isArray(order.missingItems)
            ? order.missingItems.filter((m: { status: string }) => m.status !== 'RESOLVED').length
            : 0,
        recentPaymentCount:
          'payments' in order && Array.isArray(order.payments) ? order.payments.length : 0,
      }
    : { id: input.orderId, ...(input.orderContext ?? {}) }

  const lines = [
    `Worker: ${input.workerId}`,
    `Order: ${input.orderId}`,
    input.taskId ? `Task: ${input.taskId}` : null,
    input.taskTitle ? `Task Title: ${input.taskTitle}` : null,
    '',
    '--- Order Summary ---',
    JSON.stringify(orderSummary, null, 2),
    '',
    '--- Business Engine Snapshot ---',
    JSON.stringify(input.businessSnapshot ?? {}, null, 2),
    '',
    '--- Recent Domain Events ---',
    recentEvents.length
      ? recentEvents.map((e) => `${e.occurredAt.toISOString()} · ${e.type}`).join('\n')
      : '(none)',
    '',
    '--- Client Order Context ---',
    JSON.stringify(input.orderContext ?? {}, null, 2),
    '',
    '--- ERP Worker Memory ---',
    input.memoryContext ?? '(memory not loaded)',
  ].filter(Boolean)

  return {
    orderId: input.orderId,
    workerId: input.workerId,
    contextText: lines.join('\n'),
    orderSummary,
    memoryContext: input.memoryContext,
  }
}

export function formatBaselineForPrompt(baseline?: AiWorkerAssessment): string {
  if (!baseline) return '(no rule baseline — LLM decides from context only)'
  return JSON.stringify(baseline, null, 2)
}
