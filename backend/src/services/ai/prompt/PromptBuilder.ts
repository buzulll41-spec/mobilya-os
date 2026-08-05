import type { PrismaClient } from '@prisma/client'
import type { AiWorkerAssessment, AiWorkerRunRequest, LlmMessage, LlmToolDefinition } from '../../../contracts/llmDto.js'
import { buildWorkerContext, formatBaselineForPrompt } from '../context/ContextBuilder.js'
import { getPromptTemplate, renderPrompt } from './PromptEngine.js'
import { getToolsForWorker } from '../tools/ToolRegistry.js'
import { listRegisteredTools } from '../tools/ToolEngine.js'

export type WorkerPromptInput = AiWorkerRunRequest & {
  memoryContext: string
}

export type BuiltWorkerPrompt = {
  messages: LlmMessage[]
  tools: LlmToolDefinition[]
  promptVersion: string
  toolCatalogText: string
}

function formatToolCatalog(tools: LlmToolDefinition[]): string {
  if (!tools.length) return '(no tools registered for this worker)'
  return tools
    .map(
      (t, i) =>
        `${i + 1}. ${t.name} — ${t.description}\n   parameters: ${JSON.stringify(t.parameters.properties ?? {})}`,
    )
    .join('\n')
}

function formatToolEngineCatalog(workerId: string): string {
  const meta = listRegisteredTools(workerId)
  if (!meta.length) return ''
  return meta
    .map(
      (t, i) =>
        `${i + 1}. [${t.category}] ${t.name} — ${t.description} (approval: ${t.approvalRequired ? 'yes' : 'no'})`,
    )
    .join('\n')
}

/**
 * FAZ 43 — Auto-assembles Context + Memory + Business Engine + Tool list into LLM messages.
 */
export async function buildWorkerPrompt(
  prisma: PrismaClient,
  input: WorkerPromptInput,
): Promise<BuiltWorkerPrompt> {
  const built = await buildWorkerContext(prisma, {
    workerId: input.workerId,
    orderId: input.orderId,
    businessSnapshot: input.businessSnapshot,
    orderContext: input.orderContext,
    ruleBaseline: input.ruleBaseline,
    taskTitle: input.taskTitle,
    taskId: input.taskId,
    memoryContext: input.memoryContext,
  })

  const llmTools = getToolsForWorker(input.workerId)
  const toolCatalogText = [
    '--- LLM Tools (callable) ---',
    formatToolCatalog(llmTools),
    '',
    '--- ERP Tool Engine (FAZ 42 catalog) ---',
    formatToolEngineCatalog(input.workerId) || '(none)',
  ].join('\n')

  const template = getPromptTemplate(input.workerId)
  const rendered = renderPrompt(template, {
    context: `${built.contextText}\n\n${toolCatalogText}`,
    memory: input.memoryContext,
    baseline: formatBaselineForPrompt(input.ruleBaseline),
  })

  return {
    messages: [
      { role: 'system', content: rendered.system },
      { role: 'user', content: rendered.user },
    ],
    tools: llmTools,
    promptVersion: template.version,
    toolCatalogText,
  }
}

export function parseWorkerAssessment(
  raw: string,
  req: AiWorkerRunRequest,
): AiWorkerAssessment {
  const fallback: AiWorkerAssessment = req.ruleBaseline ?? {
    orderId: req.orderId,
    customerName: '',
    phone: '',
    priority: 'NORMAL',
    score: 50,
    reasons: ['LLM unavailable — rule fallback'],
    taskTitle: req.taskTitle ?? 'AI görev değerlendirmesi',
    taskDescription: 'Kural tabanlı fallback',
    eligible: true,
  }

  try {
    const parsed = JSON.parse(raw) as Partial<AiWorkerAssessment>
    const priority = parsed.priority ?? fallback.priority
    const validPriority = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'].includes(priority)
      ? priority
      : fallback.priority

    return {
      orderId: parsed.orderId ?? fallback.orderId,
      customerName: parsed.customerName ?? fallback.customerName,
      phone: parsed.phone ?? fallback.phone,
      priority: validPriority as AiWorkerAssessment['priority'],
      score: typeof parsed.score === 'number' ? Math.min(100, Math.max(0, parsed.score)) : fallback.score,
      reasons: Array.isArray(parsed.reasons) ? parsed.reasons.map(String) : fallback.reasons,
      taskTitle: parsed.taskTitle ?? fallback.taskTitle,
      taskDescription: parsed.taskDescription ?? fallback.taskDescription,
      eligible:
        typeof parsed.eligible === 'boolean'
          ? parsed.eligible && fallback.eligible !== false
          : fallback.eligible,
      recommendedAction: parsed.recommendedAction ?? fallback.recommendedAction,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : fallback.confidence,
    }
  } catch {
    return fallback
  }
}
