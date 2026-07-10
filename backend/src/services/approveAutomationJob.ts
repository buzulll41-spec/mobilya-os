/**
 * Otomasyon işi onay ve iptal — human-in-the-loop.
 *
 * WAITING_APPROVAL → APPROVED (onay). Herhangi bir aktif durumdan → CANCELLED (iptal).
 * Durum override'ları in-memory store'da tutulur.
 */

import { AppHttpError } from '../errors/apiError.js'
import type { AutomationJobStatus } from '../contracts/automationJobDto.js'
import { getJobOverrides, setJobOverride, type JobOverride } from './getAutomationJobs.js'

const CANCELLABLE: Set<AutomationJobStatus> = new Set([
  'CREATED',
  'WAITING_APPROVAL',
  'APPROVED',
  'EXECUTING',
])

export function canApproveJob(status: AutomationJobStatus): boolean {
  return status === 'WAITING_APPROVAL'
}

export function canCancelJob(status: AutomationJobStatus): boolean {
  return CANCELLABLE.has(status)
}

function nowIso(): string {
  return new Date().toISOString()
}

export type ApproveJobBody = { approvedBy?: string | null }

export function assertValidApproveBody(body: unknown): ApproveJobBody {
  if (!body || typeof body !== 'object') return {}
  const raw = body as Record<string, unknown>
  const approvedBy = typeof raw.approvedBy === 'string' && raw.approvedBy.trim() ? raw.approvedBy.trim() : null
  return { approvedBy }
}

/**
 * Tek işi onaylar. WAITING_APPROVAL dışındaki durumda 400.
 */
export function approveAutomationJob(
  id: string,
  body: ApproveJobBody = {},
  currentStatus: AutomationJobStatus = 'WAITING_APPROVAL',
): JobOverride {
  const jobId = typeof id === 'string' ? id.trim() : ''
  if (!jobId) {
    throw new AppHttpError(400, 'İş kimliği gerekli', 'Bad Request', { id: 'Required' })
  }

  const existing = getJobOverrides().get(jobId)
  const current = existing?.status ?? currentStatus
  if (!canApproveJob(current)) {
    throw new AppHttpError(400, `Onaylanamaz durum: ${current}`, 'Bad Request', { status: 'Cannot approve' })
  }

  const override: JobOverride = {
    status: 'APPROVED',
    approvedBy: body.approvedBy ?? 'manager',
    updatedAt: nowIso(),
    executedAt: existing?.executedAt ?? null,
  }
  setJobOverride(jobId, override)
  return override
}

/**
 * Tek işi iptal eder.
 */
export function cancelAutomationJob(id: string, currentStatus: AutomationJobStatus = 'CREATED'): JobOverride {
  const jobId = typeof id === 'string' ? id.trim() : ''
  if (!jobId) {
    throw new AppHttpError(400, 'İş kimliği gerekli', 'Bad Request', { id: 'Required' })
  }

  const existing = getJobOverrides().get(jobId)
  const current = existing?.status ?? currentStatus
  if (!canCancelJob(current)) {
    throw new AppHttpError(400, `İptal edilemez durum: ${current}`, 'Bad Request', { status: 'Cannot cancel' })
  }

  const override: JobOverride = {
    status: 'CANCELLED',
    approvedBy: existing?.approvedBy ?? null,
    updatedAt: nowIso(),
    executedAt: existing?.executedAt ?? null,
  }
  setJobOverride(jobId, override)
  return override
}

export type BulkJobIdsBody = { ids?: string[] }

export function assertValidBulkIds(body: unknown): string[] {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const raw = body as Record<string, unknown>
  if (!Array.isArray(raw.ids) || raw.ids.length === 0) {
    throw new AppHttpError(400, 'ids dizisi gerekli', 'Bad Request', { ids: 'Required' })
  }
  return raw.ids.map((x) => (typeof x === 'string' ? x.trim() : '')).filter(Boolean)
}

/** Toplu onay — başarılı/başarısız ayrımı döner. */
export function bulkApproveAutomationJobs(
  ids: string[],
  body: ApproveJobBody = {},
  statusById: Map<string, AutomationJobStatus> = new Map(),
): { approved: string[]; failed: { id: string; reason: string }[] } {
  const approved: string[] = []
  const failed: { id: string; reason: string }[] = []
  for (const id of ids) {
    try {
      approveAutomationJob(id, body, statusById.get(id) ?? 'WAITING_APPROVAL')
      approved.push(id)
    } catch (err) {
      const msg = err instanceof AppHttpError ? err.message : 'Onay başarısız'
      failed.push({ id, reason: msg })
    }
  }
  return { approved, failed }
}

/** Toplu iptal. */
export function bulkCancelAutomationJobs(
  ids: string[],
  statusById: Map<string, AutomationJobStatus> = new Map(),
): { cancelled: string[]; failed: { id: string; reason: string }[] } {
  const cancelled: string[] = []
  const failed: { id: string; reason: string }[] = []
  for (const id of ids) {
    try {
      cancelAutomationJob(id, statusById.get(id) ?? 'CREATED')
      cancelled.push(id)
    } catch (err) {
      const msg = err instanceof AppHttpError ? err.message : 'İptal başarısız'
      failed.push({ id, reason: msg })
    }
  }
  return { cancelled, failed }
}
