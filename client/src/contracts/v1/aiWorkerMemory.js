/**
 * FAZ 41 — AI Worker Memory contracts (client).
 */

export const MEMORY_ENTITY_TYPE = /** @type {const} */ ({
  CUSTOMER: 'CUSTOMER',
  ORDER: 'ORDER',
  SUPPLIER: 'SUPPLIER',
  PRODUCT: 'PRODUCT',
  PAYMENT: 'PAYMENT',
  SHIPMENT: 'SHIPMENT',
  SERVICE: 'SERVICE',
  GENERAL: 'GENERAL',
})

export const MEMORY_TYPE = MEMORY_ENTITY_TYPE

export const MEMORY_IMPORTANCE = /** @type {const} */ ({
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
})

/**
 * @typedef {keyof typeof MEMORY_ENTITY_TYPE} MemoryEntityType
 * @typedef {keyof typeof MEMORY_IMPORTANCE} MemoryImportance
 * @typedef {{
 *   id: string
 *   workerCode: string
 *   entityType: MemoryEntityType
 *   entityId: string
 *   memoryType: MemoryEntityType
 *   title: string
 *   content: string
 *   importance: MemoryImportance
 *   sourceEvent: string | null
 *   active: boolean
 *   createdAt: string
 *   updatedAt: string
 * }} AIWorkerMemoryDto
 */

export const WORKER_ID_TO_CODE = /** @type {Record<string, string>} */ ({
  'dw-sales-follow-up': 'AI_SALES_FOLLOW_UP',
  'dw-collection': 'AI_COLLECTION',
  'dw-shipment': 'AI_SHIPMENT',
  'dw-procurement': 'AI_PROCUREMENT',
})

export const WORKER_CODE_LABELS = /** @type {Record<string, string>} */ ({
  AI_SALES_FOLLOW_UP: 'AI Sales',
  AI_COLLECTION: 'AI Collection',
  AI_SHIPMENT: 'AI Shipment',
  AI_PROCUREMENT: 'AI Procurement',
})

export {}
