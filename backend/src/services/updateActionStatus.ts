/**
 * Aksiyon durum yönetimi — ilk sürüm.
 *
 * KALICI DB TABLOSU YOK. Görevler her istekte deterministik kurallarla yeniden
 * üretildiği için, yalnızca kullanıcı tarafından değiştirilen durum override'ları
 * süreç içi (in-memory) bir Map'te tutulur. `getActionCenter` görevleri üretirken
 * bu store'daki override'ları uygular (id eşleşirse status'u ezer).
 *
 * Geçerli geçişler: OPEN → ASSIGNED → IN_PROGRESS → COMPLETED, ve herhangi bir
 * durumdan DISMISSED. Geçersiz status değeri 400 (AppHttpError) ile reddedilir.
 */

import { AppHttpError } from '../errors/apiError.js'
import { isActionStatus, type ActionStatus } from '../contracts/actionCenterDto.js'

export type ActionStatusOverride = {
  status: ActionStatus
  lastActionAt: string
}

/** Modül seviyesinde paylaşılan in-memory store. */
const actionStatusStore = new Map<string, ActionStatusOverride>()

/** Doğrusal akış sırası — geçiş doğrulaması için. */
const FORWARD_ORDER: ActionStatus[] = ['OPEN', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED']

/** İleri geçiş ya da DISMISSED'e geçiş geçerli mi? */
export function canTransitionActionStatus(from: ActionStatus, to: ActionStatus): boolean {
  if (to === 'DISMISSED') return true
  if (from === 'DISMISSED') return to === 'OPEN' // yeniden açma
  const fromIdx = FORWARD_ORDER.indexOf(from)
  const toIdx = FORWARD_ORDER.indexOf(to)
  if (fromIdx < 0 || toIdx < 0) return false
  return toIdx >= fromIdx
}

/** Bir görevin geçerli (override'lı) durumunu döndürür; yoksa OPEN. */
export function getActionStatus(id: string): ActionStatus {
  return actionStatusStore.get(id)?.status ?? 'OPEN'
}

/** Tüm override'ların salt-okunur kopyası. */
export function getActionStatusOverrides(): Map<string, ActionStatusOverride> {
  return new Map(actionStatusStore)
}

/** Test/yeniden kurulum için store'u temizler. */
export function resetActionStatusStore(): void {
  actionStatusStore.clear()
}

export function assertValidActionStatus(body: unknown): ActionStatus {
  if (!body || typeof body !== 'object') {
    throw new AppHttpError(400, 'Request body must be a JSON object', 'Bad Request')
  }
  const raw = (body as Record<string, unknown>).status
  const status = typeof raw === 'string' ? raw.trim().toUpperCase() : ''
  if (!isActionStatus(status)) {
    throw new AppHttpError(400, 'Geçersiz görev durumu', 'Bad Request', { status: 'Invalid status' })
  }
  return status
}

/**
 * Görev durumunu günceller (in-memory). Geçersiz status değeri 400 ile reddedilir.
 * @returns güncel override kaydı (status + lastActionAt)
 */
export function updateActionStatus(id: string, status: ActionStatus): ActionStatusOverride {
  const taskId = typeof id === 'string' ? id.trim() : ''
  if (!taskId) {
    throw new AppHttpError(400, 'Görev kimliği gerekli', 'Bad Request', { id: 'Required' })
  }
  if (!isActionStatus(status)) {
    throw new AppHttpError(400, 'Geçersiz görev durumu', 'Bad Request', { status: 'Invalid status' })
  }

  const from = getActionStatus(taskId)
  if (!canTransitionActionStatus(from, status)) {
    throw new AppHttpError(400, `Geçersiz durum geçişi: ${from} → ${status}`, 'Bad Request', {
      status: 'Invalid transition',
    })
  }

  const record: ActionStatusOverride = { status, lastActionAt: new Date().toISOString() }
  actionStatusStore.set(taskId, record)
  return record
}
