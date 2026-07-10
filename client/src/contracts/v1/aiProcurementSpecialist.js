/**
 * AI Procurement Specialist — kural tabanlı tedarik takip servisi (FAZ 27).
 * İleride LLM implementasyonu ile değiştirilebilir.
 */

export const AI_PROCUREMENT_SPECIALIST_WORKER_ID = 'dw-procurement'

export const PROCUREMENT_SPECIALIST_SOURCE_MODULE = 'Procurement'

/** @typedef {'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'} ProcurementSpecialistPriority */

/**
 * @typedef {Object} ProcurementSpecialistAssessment
 * @property {string} orderId
 * @property {string} customerName
 * @property {string} supplierName
 * @property {string} phone
 * @property {ProcurementSpecialistPriority} priority
 * @property {number} score
 * @property {string[]} reasons
 * @property {string} taskTitle
 * @property {string} taskDescription
 * @property {boolean} eligible
 * @property {import('./businessEngine.js').OrderBusinessSnapshot} businessSnapshot
 */

export {}
