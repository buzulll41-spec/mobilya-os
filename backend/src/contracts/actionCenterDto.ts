/**
 * Otomatik Aksiyon Merkezi — "Bugün hangi işi, kim, hangi öncelikle yapmalı?"
 *
 * Bu modül LLM kullanmaz. Görevler açıklanabilir, kural tabanlı ve deterministik
 * üretilir (Faz 7 AI Operasyon Danışmanı'nın üzerine kurulu). Her görevin
 * deterministik stabil bir `id`'si vardır (ör. `collection-call:<orderId>`) ve
 * sayısal dayanağı `evidence` içinde taşınır.
 *
 * Para alanları string (2 ondalık), yüzdeler 1 ondalık. Depo Katı satış kaynağı
 * olarak hiçbir görevde görünmez (kaynak verisi Faz 5A motorundan gelir).
 */

/** Öncelik — P1 en acil, P5 en düşük. */
export type ActionPriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5'

export type ActionCategory =
  | 'COLLECTION'
  | 'SHIPMENT'
  | 'DATA_QUALITY'
  | 'SALES'
  | 'SUPPLIER'
  | 'OPERATIONS'
  | 'RISK'

export type ActionStatus = 'OPEN' | 'ASSIGNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DISMISSED'

/** Görevin bağlı olduğu kayıt türü (varsa). */
export type ActionRelatedEntityType = 'order' | 'orderLine' | 'shipment' | 'supplier' | 'source' | null

export type ActionEvidence = Record<string, string | number | boolean | null>

export type ActionDto = {
  id: string
  priority: ActionPriority
  category: ActionCategory
  title: string
  reason: string
  recommendedAction: string
  /** Görevden sorumlu rol etiketi (COLLECTION/SHIPMENT/OPERATION/SALES/SUPPLIER). */
  assignedRole: string
  relatedEntityType: ActionRelatedEntityType
  relatedEntityId: string | null
  status: ActionStatus
  evidence: ActionEvidence
  createdAt: string
  /** Son durum değişikliği zamanı (yoksa createdAt). */
  lastActionAt: string
  updatedAt: string
  /** Detay paneli için opsiyonel zenginleştirme alanları. */
  riskLabel?: string | null
  relatedCustomer?: string | null
  relatedOrder?: string | null
  relatedShipment?: string | null
}

export type ActionCenterSummaryDto = {
  totalOpen: number
  p1Count: number
  p2Count: number
  completedCount: number
  dismissedCount: number
  /** Tamamlanma oranı (0–100, 1 ondalık). */
  completionRate: number
}

export type ActionCenterFiltersEcho = {
  priority: string | null
  category: string | null
  status: string | null
  q: string | null
  salesPerson: string | null
  limitedView: boolean
}

export type ActionCenterResponseDto = {
  summary: ActionCenterSummaryDto
  actions: ActionDto[]
  filters: ActionCenterFiltersEcho
  currency: string
  today: string
  generatedAt: string
}

/** Geçerli durum değerleri (PATCH doğrulaması için). */
export const ACTION_STATUS_VALUES: ActionStatus[] = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'DISMISSED',
]

export function isActionStatus(v: unknown): v is ActionStatus {
  return typeof v === 'string' && (ACTION_STATUS_VALUES as string[]).includes(v)
}
