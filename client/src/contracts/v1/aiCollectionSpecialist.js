/**
 * AI Collection Specialist — kural tabanlı tahsilat takip servisi (FAZ 25).
 * İleride LLM implementasyonu ile değiştirilebilir.
 */

export const AI_COLLECTION_SPECIALIST_WORKER_ID = 'dw-collection'

export const COLLECTION_SPECIALIST_SOURCE_MODULE = 'Collection'

/** @typedef {'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'} CollectionSpecialistPriority */

/**
 * @typedef {Object} CollectionSpecialistAssessment
 * @property {string} orderId
 * @property {string} customerName
 * @property {string} phone
 * @property {CollectionSpecialistPriority} priority
 * @property {number} score
 * @property {string[]} reasons
 * @property {string} taskTitle
 * @property {string} taskDescription
 * @property {boolean} eligible
 * @property {import('./businessEngine.js').OrderBusinessSnapshot} businessSnapshot
 */

export {}
