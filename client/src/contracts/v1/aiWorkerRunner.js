/**
 * FAZ 40 — Provider-agnostic AI worker runner contracts.
 * Business Engine snapshot zorunlu input; LLM yalnızca enrich/execute eder.
 */

/** @typedef {'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'} AiWorkerPriority */

/**
 * @typedef {Object} AiWorkerAssessmentDto
 * @property {string} orderId
 * @property {string} customerName
 * @property {string} phone
 * @property {AiWorkerPriority} priority
 * @property {number} score
 * @property {string[]} reasons
 * @property {string} taskTitle
 * @property {string} taskDescription
 * @property {boolean} eligible
 * @property {string} [recommendedAction]
 * @property {number} [confidence]
 */

/**
 * @typedef {Object} AiWorkerRunPayload
 * @property {string} orderId
 * @property {string} [taskId]
 * @property {string} [taskTitle]
 * @property {import('./businessEngine.js').OrderBusinessSnapshot} [businessSnapshot]
 * @property {Record<string, unknown>} [orderContext]
 * @property {AiWorkerAssessmentDto} [ruleBaseline]
 */

/**
 * @typedef {Object} AiWorkerRunResult
 * @property {string} runId
 * @property {string} workerId
 * @property {AiWorkerAssessmentDto} assessment
 * @property {string} providerId
 * @property {string} model
 * @property {string} promptVersion
 * @property {object[]} toolCalls
 * @property {object[]} toolResults
 * @property {string} [memorySummary]
 * @property {{ promptTokens?: number, completionTokens?: number, totalTokens?: number, prompt?: number, completion?: number, total?: number }} [usage]
 * @property {number} [latencyMs]
 * @property {number} [costUsd]
 */

/**
 * @typedef {Object} WorkerSpecialistRunner
 * @property {string} workerId
 * @property {(payload: AiWorkerRunPayload, options?: { executeTools?: boolean }) => Promise<AiWorkerRunResult | null>} run
 */

export {}
