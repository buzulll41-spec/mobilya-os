/**
 * FAZ 41 — AI Worker Memory contracts.
 */

export const MEMORY_ENTITY_TYPE = {
  CUSTOMER: 'CUSTOMER',
  ORDER: 'ORDER',
  SUPPLIER: 'SUPPLIER',
  PRODUCT: 'PRODUCT',
  PAYMENT: 'PAYMENT',
  SHIPMENT: 'SHIPMENT',
  SERVICE: 'SERVICE',
  GENERAL: 'GENERAL',
} as const

export type MemoryEntityType = (typeof MEMORY_ENTITY_TYPE)[keyof typeof MEMORY_ENTITY_TYPE]

export const MEMORY_TYPE = MEMORY_ENTITY_TYPE

export type MemoryType = MemoryEntityType

export const MEMORY_IMPORTANCE = {
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
} as const

export type MemoryImportance = (typeof MEMORY_IMPORTANCE)[keyof typeof MEMORY_IMPORTANCE]

export type AIWorkerMemoryDto = {
  id: string
  workerCode: string
  entityType: MemoryEntityType
  entityId: string
  memoryType: MemoryType
  title: string
  content: string
  importance: MemoryImportance
  sourceEvent: string | null
  active: boolean
  createdAt: string
  updatedAt: string
}

export type CreateMemoryInput = {
  workerCode: string
  entityType: MemoryEntityType
  entityId: string
  memoryType: MemoryType
  title: string
  content: string
  importance: MemoryImportance
  sourceEvent?: string
}

export type WorkerMemoryContextQuery = {
  workerCode: string
  orderId?: string
  customerId?: string
  customerName?: string
  supplierId?: string
  limit?: number
}

export type CeoLearnedInsightDto = {
  id: string
  workerCode: string
  workerLabel: string
  message: string
  importance: MemoryImportance
  entityLabel: string
  createdAt: string
}
