/**
 * Operasyon Orkestrasyon Merkezi — Vaka (Case) DTO'ları.
 *
 * Faz 8 (Otomatik Aksiyon Merkezi) üzerine kuruludur: `buildActions` çıktısındaki
 * tekil görevler (ActionDto) operasyon VAKALARINA gruplanır. Vakalar deterministik
 * üretilir (caseNumber = `CASE-<orderId>` gibi); kullanıcı durum/sahip değişiklikleri
 * süreç içi (in-memory) bir store'da tutulur ve her üretimde uygulanır.
 *
 * Para alanları string (2 ondalık) — buildActions'tan miras. Vaka durumları kendi
 * yaşam döngüsüne sahiptir (görev durumlarından bağımsız).
 */

import type { ActionDto } from './actionCenterDto.js'

/** Vaka durumu — OPEN açık, CLOSED kapanmış. */
export type CaseStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'WAITING'
  | 'RESOLVED'
  | 'CLOSED'

/** Vaka önceliği — P1 en acil, P5 en düşük (içindeki görevlerin en yükseği). */
export type CasePriority = 'P1' | 'P2' | 'P3' | 'P4' | 'P5'

/** Zaman çizelgesi olayı. */
export type CaseTimelineEventDto = {
  at: string
  /** Olay türü: CASE_CREATED, ACTION_ADDED, ASSIGNED, STATUS_CHANGED. */
  type: string
  message: string
  actor?: string | null
}

export type OperationCaseDto = {
  id: string
  caseNumber: string
  priority: CasePriority
  status: CaseStatus
  title: string
  description: string
  customerId: string | null
  customerName: string | null
  orderIds: string[]
  actionIds: string[]
  riskLevel: string | null
  ownerUserId: string | null
  ownerRole: string | null
  createdAt: string
  updatedAt: string
  closedAt: string | null
  /** Liste/sayfa için yardımcı sayaçlar. */
  actionCount: number
  orderCount: number
  /** Birincil sipariş numarası (varsa) — tablo gösterimi için. */
  primaryOrderNumber: string | null
}

/** İlişkili sipariş özeti (detay sayfası için). */
export type CaseRelatedOrderDto = {
  orderId: string
  orderNumber: string | null
  customerName: string | null
}

export type OperationCaseDetailDto = {
  case: OperationCaseDto
  relatedActions: ActionDto[]
  timeline: CaseTimelineEventDto[]
  relatedOrders: CaseRelatedOrderDto[]
  notes: string[]
}

export type OperationCasesSummaryDto = {
  openCases: number
  p1Cases: number
  unassigned: number
  waiting: number
  resolved: number
  /** Kapanan vakaların createdAt→closedAt ortalaması (saat, 1 ondalık); yoksa 0. */
  avgResolutionHours: number
}

export type OperationCasesFiltersEcho = {
  priority: string | null
  status: string | null
  q: string | null
  salesPerson: string | null
  limitedView: boolean
}

export type OperationCasesResponseDto = {
  summary: OperationCasesSummaryDto
  cases: OperationCaseDto[]
  filters: OperationCasesFiltersEcho
  currency: string
  today: string
  generatedAt: string
}

/** Geçerli vaka durumları (PATCH doğrulaması için). */
export const CASE_STATUS_VALUES: CaseStatus[] = [
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'WAITING',
  'RESOLVED',
  'CLOSED',
]

export function isCaseStatus(v: unknown): v is CaseStatus {
  return typeof v === 'string' && (CASE_STATUS_VALUES as string[]).includes(v)
}
