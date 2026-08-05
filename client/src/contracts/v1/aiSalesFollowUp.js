/**
 * AI Sales Follow-Up — kural tabanlı satış takip servisi (FAZ 24).
 * İleride LLM implementasyonu ile değiştirilebilir.
 */

export const AI_SALES_FOLLOW_UP_WORKER_ID = 'dw-sales-follow-up'

export const SALES_FOLLOW_UP_SOURCE_MODULE = 'Sales'

/** @typedef {'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'} SalesFollowUpPriority */

/**
 * @typedef {Object} SalesFollowUpAssessment
 * @property {string} orderId
 * @property {string} customerName
 * @property {string} phone
 * @property {SalesFollowUpPriority} priority
 * @property {number} score
 * @property {string[]} reasons
 * @property {string} taskTitle
 * @property {string} taskDescription
 * @property {boolean} eligible
 * @property {import('./businessEngine.js').OrderBusinessSnapshot} businessSnapshot
 */

export {}
