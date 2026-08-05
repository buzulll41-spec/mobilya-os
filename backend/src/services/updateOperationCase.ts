/**
 * Vaka durum/sahip yönetimi — ilk sürüm.
 *
 * KALICI DB TABLOSU YOK. Vakalar her istekte `buildActions` görevlerinden
 * deterministik yeniden üretildiği için, yalnızca kullanıcı tarafından yapılan
 * değişiklikler (durum geçişi, sahip atama) ve bunlardan doğan timeline olayları
 * süreç içi (in-memory) bir Map'te tutulur. `getOperationCases` vakaları üretirken
 * bu store'daki override'ları uygular (id eşleşirse status/owner'ı ezer, olayları ekler).
 *
 * Geçerli geçişler:
 *   OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
 *   IN_PROGRESS ↔ WAITING (WAITING'ten yalnızca IN_PROGRESS'e dönülür)
 *   herhangi bir durumdan → CLOSED
 * Geçersiz status değeri / geçiş 400 (AppHttpError) ile reddedilir.
 */

import { AppHttpError } from '../errors/apiError.js'
import {
  isCaseStatus,
  type CaseStatus,
  type CaseTimelineEventDto,
} from '../contracts/operationCaseDto.js'

export type CaseOverride = {
  status?: CaseStatus
  ownerUserId?: string | null
  ownerRole?: string | null
  events: CaseTimelineEventDto[]
  updatedAt: string
  closedAt?: string | null
}

export type OperationCasePatch = {
  status?: CaseStatus
  ownerUserId?: string | null
  ownerRole?: string | null
}

/** Modül seviyesinde paylaşılan in-memory store. */
const caseStore = new Map<string, CaseOverride>()

/** Doğrusal akış sırası — WAITING dışı geçiş doğrulaması için. */
const FORWARD_ORDER: CaseStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

/** Bir geçişin (from → to) geçerli olup olmadığını döndürür. */
export function canTransitionCaseStatus(from: CaseStatus, to: CaseStatus): boolean {
  if (to === 'CLOSED') return true // herhangi bir durumdan kapatılabilir
  if (to === 'WAITING') return from === 'IN_PROGRESS' || from === 'WAITING'
  if (from === 'WAITING') return to === 'IN_PROGRESS' // beklemeden yalnızca devam'a
  const fromIdx = FORWARD_ORDER.indexOf(from)
  const toIdx = FORWARD_ORDER.indexOf(to)
  if (fromIdx < 0 || toIdx < 0) return false
  return toIdx >= fromIdx
}

/** Bir vakanın geçerli (override'lı) durumunu döndürür; yoksa OPEN. */
export function getCaseStatus(id: string): CaseStatus {
  return caseStore.get(id)?.status ?? 'OPEN'
}

/** Tüm override'ların salt-okunur kopyası. */
export function getCaseOverrides(): Map<string, CaseOverride> {
  return new Map(caseStore)
}

/** Test/yeniden kurulum için store'u temizler. */
export function resetCaseStore(): void {
  caseStore.clear()
}

function trimOrNull(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

/** PATCH gövdesini doğrular; geçersiz status değeri 400. */
export function assertValidOperationCasePatch(body: unknown): OperationCasePatch {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const raw = body as Record<string, unknown>
  const patch: OperationCasePatch = {}

  if (raw.status !== undefined && raw.status !== null && raw.status !== '') {
    const status = typeof raw.status === 'string' ? raw.status.trim().toUpperCase() : ''
    if (!isCaseStatus(status)) {
      throw new AppHttpError(400, 'Geçersiz vaka durumu', 'Bad Request', { status: 'Invalid status' })
    }
    patch.status = status
  }
  if ('ownerUserId' in raw) patch.ownerUserId = trimOrNull(raw.ownerUserId)
  if ('ownerRole' in raw) patch.ownerRole = trimOrNull(raw.ownerRole)

  if (patch.status === undefined && patch.ownerUserId === undefined && patch.ownerRole === undefined) {
    throw new AppHttpError(400, 'Güncellenecek alan yok (status veya owner gerekli)', 'Bad Request')
  }
  return patch
}

/**
 * Vaka durumunu ve/veya sahibini günceller (in-memory). Geçersiz status değeri ya
 * da geçiş 400 ile reddedilir. Sahip değişimi ve durum değişimi için timeline
 * olayı üretilir. RESOLVED/CLOSED'a geçişte closedAt set edilir.
 * @returns güncel override kaydı
 */
export function updateOperationCase(id: string, patch: OperationCasePatch): CaseOverride {
  const caseId = typeof id === 'string' ? id.trim() : ''
  if (!caseId) {
    throw new AppHttpError(400, 'Vaka kimliği gerekli', 'Bad Request', { id: 'Required' })
  }

  const existing = caseStore.get(caseId)
  const now = new Date().toISOString()
  const events: CaseTimelineEventDto[] = existing ? [...existing.events] : []
  const actor = patch.ownerRole ?? patch.ownerUserId ?? existing?.ownerRole ?? null

  const next: CaseOverride = {
    status: existing?.status,
    ownerUserId: existing?.ownerUserId ?? null,
    ownerRole: existing?.ownerRole ?? null,
    events,
    updatedAt: now,
    closedAt: existing?.closedAt ?? null,
  }

  // Sahip atama / devralma
  const ownerChanged =
    (patch.ownerUserId !== undefined && patch.ownerUserId !== (existing?.ownerUserId ?? null)) ||
    (patch.ownerRole !== undefined && patch.ownerRole !== (existing?.ownerRole ?? null))
  if (patch.ownerUserId !== undefined) next.ownerUserId = patch.ownerUserId
  if (patch.ownerRole !== undefined) next.ownerRole = patch.ownerRole
  if (ownerChanged) {
    const who = next.ownerRole ?? next.ownerUserId ?? 'bilinmeyen'
    events.push({ at: now, type: 'ASSIGNED', message: `Vaka devralındı/atandı: ${who}`, actor })
  }

  // Durum geçişi
  if (patch.status !== undefined) {
    if (!isCaseStatus(patch.status)) {
      throw new AppHttpError(400, 'Geçersiz vaka durumu', 'Bad Request', { status: 'Invalid status' })
    }
    const from = existing?.status ?? 'OPEN'
    if (!canTransitionCaseStatus(from, patch.status)) {
      throw new AppHttpError(400, `Geçersiz durum geçişi: ${from} → ${patch.status}`, 'Bad Request', {
        status: 'Invalid transition',
      })
    }
    next.status = patch.status
    events.push({
      at: now,
      type: 'STATUS_CHANGED',
      message: `Durum güncellendi: ${from} → ${patch.status}`,
      actor,
    })
    if (patch.status === 'RESOLVED' || patch.status === 'CLOSED') {
      next.closedAt = now
    }
  }

  caseStore.set(caseId, next)
  return next
}
