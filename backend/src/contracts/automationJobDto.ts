/**
 * Operasyon Otomasyonu — Automation Job DTO'ları.
 *
 * Faz 9 (Operasyon Vakaları) üzerine kuruludur: vaka/görev çıktılarından
 * deterministik otomasyon işleri üretilir. İlk sürüm human-in-the-loop +
 * Auto Assist: kritik işler onay bekler, bazıları (ZERO_COST) doğrudan çalıştırılabilir.
 *
 * Gerçek SMS/e-posta gönderimi yok; çalıştırma placeholder olay üretir.
 * Depo Katı satış kaynağı olarak hiçbir job üretmez.
 */

import type { ActionPriority } from './actionCenterDto.js'

/** Otomasyon iş türü — vaka hazırlık aksiyonu. */
export type AutomationJobType =
  | 'CREATE_COLLECTION_CASE'
  | 'CREATE_SHIPMENT_CASE'
  | 'CREATE_DATA_QUALITY_CASE'
  | 'CREATE_SOURCE_REVIEW_CASE'
  | 'CREATE_PROFIT_REVIEW_CASE'
  | 'CREATE_SALES_REVIEW_CASE'

/** İş durumu — CREATED → onay/çalıştırma → COMPLETED/FAILED/CANCELLED. */
export type AutomationJobStatus =
  | 'CREATED'
  | 'WAITING_APPROVAL'
  | 'APPROVED'
  | 'EXECUTING'
  | 'COMPLETED'
  | 'FAILED'
  | 'CANCELLED'

export type AutomationJobDto = {
  id: string
  jobType: AutomationJobType
  priority: ActionPriority
  status: AutomationJobStatus
  /** Tetikleyici kaynak: action, case, forecast, profitability. */
  triggerSource: string
  relatedCaseId: string | null
  relatedOrderId: string | null
  recommendedAction: string
  requiresApproval: boolean
  approvedBy: string | null
  executedAt: string | null
  createdAt: string
  updatedAt: string
  /** Detay paneli için opsiyonel alanlar. */
  title?: string
  reason?: string
  salesPerson?: string | null
  /** Aggregate (siparişle ilişkisiz) iş mi? */
  aggregate?: boolean
}

export type AutomationJobsSummaryDto = {
  totalJobs: number
  pendingCount: number
  waitingApprovalCount: number
  executingCount: number
  completedCount: number
  failedCount: number
  cancelledCount: number
  /** Onay gerektirmeyen, çalıştırılmaya hazır iş sayısı. */
  autoRunReadyCount: number
}

/** Kuyruk görünümü — duruma göre gruplar. */
export type AutomationQueueDto = {
  pending: AutomationJobDto[]
  waitingApproval: AutomationJobDto[]
  executing: AutomationJobDto[]
  completed: AutomationJobDto[]
  failed: AutomationJobDto[]
}

export type AutomationJobsFiltersEcho = {
  status: string | null
  priority: string | null
  q: string | null
  salesPerson: string | null
  limitedView: boolean
}

export type AutomationJobsResponseDto = {
  summary: AutomationJobsSummaryDto
  jobs: AutomationJobDto[]
  queue: AutomationQueueDto
  filters: AutomationJobsFiltersEcho
  currency: string
  today: string
  generatedAt: string
}

export const AUTOMATION_JOB_STATUS_VALUES: AutomationJobStatus[] = [
  'CREATED',
  'WAITING_APPROVAL',
  'APPROVED',
  'EXECUTING',
  'COMPLETED',
  'FAILED',
  'CANCELLED',
]

export function isAutomationJobStatus(v: unknown): v is AutomationJobStatus {
  return typeof v === 'string' && (AUTOMATION_JOB_STATUS_VALUES as string[]).includes(v)
}
