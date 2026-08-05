/**
 * AI Shipment Specialist — kural tabanlı sevk takip servisi (FAZ 26).
 * İleride LLM implementasyonu ile değiştirilebilir.
 */

export const AI_SHIPMENT_SPECIALIST_WORKER_ID = 'dw-shipment'

export const SHIPMENT_SPECIALIST_SOURCE_MODULE = 'Shipment'

/** @typedef {'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'} ShipmentSpecialistPriority */

/**
 * @typedef {Object} ShipmentSpecialistAssessment
 * @property {string} orderId
 * @property {string} customerName
 * @property {string} phone
 * @property {ShipmentSpecialistPriority} priority
 * @property {number} score
 * @property {string[]} reasons
 * @property {string} taskTitle
 * @property {string} taskDescription
 * @property {boolean} eligible
 * @property {import('./businessEngine.js').OrderBusinessSnapshot} businessSnapshot
 */

export {}
