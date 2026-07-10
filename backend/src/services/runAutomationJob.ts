/**
 * Otomasyon işi çalıştırma — Auto Assist.
 *
 * CREATED (onaysız) veya APPROVED işler çalıştırılabilir. Çalıştırma placeholder
 * olay üretir; gerçek SMS/e-posta yok. İlgili vaka varsa durum/sahip güncellenir.
 */

import { AppHttpError } from '../errors/apiError.js'
import type { AutomationJobStatus } from '../contracts/automationJobDto.js'
import { getJobOverrides, setJobOverride, type JobOverride } from './getAutomationJobs.js'
import { updateOperationCase } from './updateOperationCase.js'

export function canRunJob(status: AutomationJobStatus, requiresApproval: boolean): boolean {
  if (status === 'CREATED' && !requiresApproval) return true
  if (status === 'APPROVED') return true
  return false
}

function nowIso(): string {
  return new Date().toISOString()
}

/** İş türüne göre ilgili vakayı günceller (placeholder operasyon). */
function applyJobSideEffects(relatedCaseId: string | null, jobType: string): void {
  if (!relatedCaseId) return
  const roleByType: Record<string, string> = {
    CREATE_COLLECTION_CASE: 'COLLECTION',
    CREATE_SHIPMENT_CASE: 'SHIPMENT',
    CREATE_DATA_QUALITY_CASE: 'OPERATION',
    CREATE_SOURCE_REVIEW_CASE: 'OPERATION',
    CREATE_SALES_REVIEW_CASE: 'SALES',
    CREATE_PROFIT_REVIEW_CASE: 'MANAGER',
  }
  const role = roleByType[jobType] ?? 'OPERATION'
  try {
    updateOperationCase(relatedCaseId, { status: 'ASSIGNED', ownerRole: role })
  } catch {
    // Vaka henüz store'da yoksa yalnızca override oluştur
    updateOperationCase(relatedCaseId, { ownerRole: role })
  }
}

/**
 * Tek işi çalıştırır: EXECUTING → COMPLETED.
 */
export function runAutomationJob(
  id: string,
  opts: {
    requiresApproval?: boolean
    relatedCaseId?: string | null
    jobType?: string
    currentStatus?: AutomationJobStatus
  } = {},
): JobOverride {
  const jobId = typeof id === 'string' ? id.trim() : ''
  if (!jobId) {
    throw new AppHttpError(400, 'İş kimliği gerekli', 'Bad Request', { id: 'Required' })
  }

  const existing = getJobOverrides().get(jobId)
  const requiresApproval = Boolean(opts.requiresApproval)
  const defaultStatus: AutomationJobStatus = requiresApproval ? 'WAITING_APPROVAL' : 'CREATED'
  const current = existing?.status ?? opts.currentStatus ?? defaultStatus

  if (!canRunJob(current, requiresApproval)) {
    throw new AppHttpError(400, `Çalıştırılamaz durum: ${current}`, 'Bad Request', { status: 'Cannot run' })
  }

  const executedAt = nowIso()

  // Placeholder: EXECUTING anı → hemen COMPLETED
  applyJobSideEffects(opts.relatedCaseId ?? null, opts.jobType ?? '')

  const override: JobOverride = {
    status: 'COMPLETED',
    approvedBy: existing?.approvedBy ?? null,
    executedAt,
    updatedAt: executedAt,
  }
  setJobOverride(jobId, override)
  return override
}

/** Toplu çalıştırma. */
export function bulkRunAutomationJobs(
  items: { id: string; requiresApproval?: boolean; relatedCaseId?: string | null; jobType?: string }[],
): { completed: string[]; failed: { id: string; reason: string }[] } {
  const completed: string[] = []
  const failed: { id: string; reason: string }[] = []
  for (const item of items) {
    try {
      runAutomationJob(item.id, item)
      completed.push(item.id)
    } catch (err) {
      const msg = err instanceof AppHttpError ? err.message : 'Çalıştırma başarısız'
      failed.push({ id: item.id, reason: msg })
    }
  }
  return { completed, failed }
}
