import { CEO_COPILOT_INTENT, CEO_COPILOT_ROLE, CEO_COPILOT_TOOL } from '../../contracts/v1/ceoCopilot.js'
import { completeLlmChat } from '../../services/llm/llmProvider.js'
import { detectCeoCopilotIntent } from '../../engine/ceo-copilot/CeoCopilotIntentEngine.js'
import { buildCeoCopilotContext } from '../../engine/ceo-copilot/CeoCopilotContextEngine.js'
import { buildStructuredCopilotReply } from '../../engine/ceo-copilot/CeoCopilotResponseEngine.js'
import { buildGraphCopilotReply } from '../../engine/ceo-copilot/CeoCopilotGraphBridge.js'
import { buildPredictionCopilotReply } from '../../engine/ceo-copilot/CeoCopilotPredictionBridge.js'
import { buildLearningCopilotReply } from '../../engine/ceo-copilot/CeoCopilotLearningBridge.js'
import { buildDecisionCopilotReply } from '../../engine/ceo-copilot/CeoCopilotDecisionBridge.js'
import { buildOptimizationCopilotReply } from '../../engine/ceo-copilot/CeoCopilotOptimizationBridge.js'
import { buildCollaborationCopilotReply } from '../../engine/ceo-copilot/CeoCopilotCollaborationBridge.js'
import { buildBoardCopilotReply } from '../../engine/ceo-copilot/CeoCopilotBoardBridge.js'
import { buildDeepLinksForIntent } from '../../engine/ceo-copilot/deepLinkBuilder.js'
import { executeCeoCopilotTool } from '../../engine/ceo-copilot/CeoCopilotToolEngine.js'
import {
  appendCeoCopilotMessage,
  getActiveConversation,
  getConversationMemory,
} from '../../services/ceo-copilot/ceoCopilotStore.js'

/**
 * @param {string} message
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   shipmentRows?: import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM[]
 *   todayIso: string
 * }} runtimeCtx
 */
export async function processCeoCopilotMessage(message, runtimeCtx) {
  const trimmed = message.trim()
  if (!trimmed) {
    return { ok: false, error: 'Boş mesaj' }
  }

  const conv = getActiveConversation()
  const lastAssistant = [...conv.messages].reverse().find((m) => m.role === CEO_COPILOT_ROLE.ASSISTANT)

  appendCeoCopilotMessage({
    role: CEO_COPILOT_ROLE.CEO,
    content: trimmed,
  })

  const intent = detectCeoCopilotIntent(trimmed, { lastIntent: lastAssistant?.intent })
  const ctx = buildCeoCopilotContext({
    ...runtimeCtx,
    lastIntent: lastAssistant?.intent,
  })

  /** @type {string[]} */
  const toolsUsed = []

  if (intent === CEO_COPILOT_INTENT.EXECUTE_ACTION) {
    executeCeoCopilotTool(CEO_COPILOT_TOOL.RUN_BRAIN_SCAN, runtimeCtx)
    toolsUsed.push(CEO_COPILOT_TOOL.RUN_BRAIN_SCAN)
  }

  if (
    intent === CEO_COPILOT_INTENT.GRAPH_OVERDUE_READY ||
    intent === CEO_COPILOT_INTENT.GRAPH_EMPLOYEE_RISKY
  ) {
    toolsUsed.push('knowledge_graph_query')
  }

  if (
    intent === CEO_COPILOT_INTENT.PREDICTION_RISKY_ORDERS ||
    intent === CEO_COPILOT_INTENT.PREDICTION_TOMORROW_DELAY ||
    intent === CEO_COPILOT_INTENT.PREDICTION_RISKY_CUSTOMERS ||
    intent === CEO_COPILOT_INTENT.PREDICTION_WEEK_COLLECTION
  ) {
    toolsUsed.push('prediction_engine')
  }

  if (
    intent === CEO_COPILOT_INTENT.LEARNING_ACCURACY ||
    intent === CEO_COPILOT_INTENT.LEARNING_BEST_PREDICTION ||
    intent === CEO_COPILOT_INTENT.LEARNING_WORST_TOPIC ||
    intent === CEO_COPILOT_INTENT.LEARNING_CONFIDENCE
  ) {
    toolsUsed.push('learning_engine')
  }

  if (
    intent === CEO_COPILOT_INTENT.DECISION_BEST_WORKER ||
    intent === CEO_COPILOT_INTENT.DECISION_LOW_QUALITY ||
    intent === CEO_COPILOT_INTENT.DECISION_30_DAY_PERFORMANCE ||
    intent === CEO_COPILOT_INTENT.DECISION_RISK_REDUCTION
  ) {
    toolsUsed.push('decision_quality_engine')
  }

  if (
    intent === CEO_COPILOT_INTENT.OPTIMIZATION_MONTHLY_GROWTH ||
    intent === CEO_COPILOT_INTENT.OPTIMIZATION_BEST_WORKER ||
    intent === CEO_COPILOT_INTENT.OPTIMIZATION_MOST_CHANGES ||
    intent === CEO_COPILOT_INTENT.OPTIMIZATION_CURRENT_STRATEGY
  ) {
    toolsUsed.push('self_optimization_engine')
  }

  if (
    intent === CEO_COPILOT_INTENT.COLLABORATION_TODAY_FEED ||
    intent === CEO_COPILOT_INTENT.COLLABORATION_MOST_HELP ||
    intent === CEO_COPILOT_INTENT.COLLABORATION_BUSIEST_TEAM
  ) {
    toolsUsed.push('collaboration_engine')
  }

  if (
    intent === CEO_COPILOT_INTENT.BOARD_CONVENE ||
    intent === CEO_COPILOT_INTENT.BOARD_TODAY_MEETING ||
    intent === CEO_COPILOT_INTENT.BOARD_TOP_DECISIONS ||
    intent === CEO_COPILOT_INTENT.BOARD_TOMORROW_FOCUS ||
    intent === CEO_COPILOT_INTENT.BOARD_STRATEGIC_QUESTION ||
    intent === CEO_COPILOT_INTENT.BOARD_HISTORY
  ) {
    toolsUsed.push('board_meeting_engine')
  }

  const structured =
    (await buildGraphCopilotReply(intent, trimmed, runtimeCtx)) ??
    (await buildPredictionCopilotReply(intent, trimmed, runtimeCtx)) ??
    (await buildLearningCopilotReply(intent, trimmed, runtimeCtx)) ??
    (await buildDecisionCopilotReply(intent, trimmed, runtimeCtx)) ??
    (await buildOptimizationCopilotReply(intent, trimmed, runtimeCtx)) ??
    (await buildCollaborationCopilotReply(intent, trimmed, runtimeCtx)) ??
    (await buildBoardCopilotReply(intent, trimmed, runtimeCtx)) ??
    buildStructuredCopilotReply(intent, ctx)

  const deepLinks = buildDeepLinksForIntent(intent, { ...ctx, lastIntent: lastAssistant?.intent ?? intent })

  const memory = getConversationMemory(8)
  const llm = await completeLlmChat(
    [
      {
        role: 'system',
        content:
          'Sen MOBILYA OS CEO Copilot asistanısın. Kısa, net, Türkçe yanıt ver. Madde işaretleri kullan.',
      },
      ...memory.slice(0, -1).map((m) => ({ role: /** @type {const} */ (m.role), content: m.content })),
      { role: 'user', content: trimmed },
      { role: 'assistant', content: structured },
    ],
    { fallback: structured },
  )

  const assistantMsg = appendCeoCopilotMessage({
    role: CEO_COPILOT_ROLE.ASSISTANT,
    content: llm.content,
    intent,
    toolsUsed,
    deepLinks,
    providerId: llm.providerId,
  })

  return {
    ok: true,
    intent,
    message: assistantMsg,
    deepLinks,
    providerId: llm.providerId,
    model: llm.model,
  }
}

export {}
