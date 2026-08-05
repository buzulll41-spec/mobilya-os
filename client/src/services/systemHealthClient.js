import { getApiBaseUrl } from '../config/dataSource.js'
import { withApiRetry } from '../lib/apiRetry.js'
import { getOperationalToday } from '../data/constants.js'
import { buildExecutionSummaryLocal } from './ai-tools/mockAiToolExecutionStore.js'
import { getDigitalWorkforceCoreSnapshot } from './mockDigitalWorkforceStore.js'
import { isCompanyBrainEnabled } from '../config/companyBrainConfig.js'
import { listGlobalMemories } from './genesis/globalMemoryStore.js'
import { getOfflineFirstSnapshot } from './offline/offlineFirstFacade.js'

/**
 * @returns {number | null}
 */
function readClientMemoryMb() {
  const perf = /** @type {Performance & { memory?: { usedJSHeapSize: number } }} */ (performance)
  if (!perf.memory?.usedJSHeapSize) return null
  return Math.round(perf.memory.usedJSHeapSize / (1024 * 1024))
}

/**
 * @returns {Promise<{ ok: boolean, database?: 'up' | 'down', redis?: 'up' | 'down' | null, migration?: 'current' | 'pending' | null, llm?: 'up' | 'down', queue?: { status?: string, depth?: number | null }, notification?: { status?: string, backlog?: number | null }, storage?: { status?: string, orders?: number | null, domainEvents?: number | null }, sync?: { status?: string }, audit?: { status?: string }, version?: string } | null>}
 */
async function fetchBackendHealth() {
  const base = getApiBaseUrl()
  if (!base) return null
  const url = `${base.replace(/\/+$/, '')}/health`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return { ok: false, database: 'down' }
  const body = await res.json().catch(() => null)
  if (!body || typeof body !== 'object') return { ok: false, database: 'down' }
  return /** @type {{ ok: boolean, database?: 'up' | 'down', redis?: 'up' | 'down' | null, migration?: 'current' | 'pending' | null }} */ (
    body
  )
}

/**
 * @returns {Promise<{ cpu?: { processPercent?: number }, ram?: { rssMb?: number }, api?: { avgResponseMs?: number }, database?: { responseMs?: number }, sync?: { status?: string } } | null>}
 */
async function fetchBackendOpsMetrics() {
  const base = getApiBaseUrl()
  if (!base) return null
  const url = `${base.replace(/\/+$/, '')}/v1/ops/metrics`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) return null
  const body = await res.json().catch(() => null)
  if (!body || typeof body !== 'object') return null
  return /** @type {{ cpu?: { processPercent?: number }, ram?: { rssMb?: number }, api?: { avgResponseMs?: number }, database?: { responseMs?: number }, sync?: { status?: string } }} */ (
    body
  )
}

/**
 * Canlı sistem sağlığı — API, DB, Redis, AI, Memory, Queue, Tool Engine, LLM.
 */
export async function collectSystemHealthSnapshot() {
  const todayIso = getOperationalToday()
  const workforce = getDigitalWorkforceCoreSnapshot()
  const workers = workforce.workers ?? []
  const activeWorkers = workers.filter((w) => w.status === 'ACTIVE' || w.status === 'BUSY').length
  const queueDepth =
    (workforce.queuePriority?.length ?? 0) + (workforce.queueFifo?.length ?? 0)
  const toolSummary = buildExecutionSummaryLocal(todayIso)
  const aiMemoryCount = listGlobalMemories(200).length

  let apiOk = null
  let dbOk = null
  let redisOk = null
  let migrationCurrent = null
  let llmConfigured = null
  let backendQueueDepth = null
  let backendNotificationBacklog = null
  let backendStorageRecords = null
  let backendSyncStatus = null
  let backendAuditStatus = null
  let backendVersion = null
  let backendCpuPercent = null
  let backendRamMb = null
  let backendApiAvgResponseMs = null
  let backendDbResponseMs = null

  let offlinePending = 0
  let offlineConflicts = 0
  let offlineSyncing = false

  try {
    const offline = await getOfflineFirstSnapshot()
    offlinePending = offline.pending ?? 0
    offlineConflicts = offline.conflicts ?? 0
    offlineSyncing = offline.syncing === true
  } catch {
    offlinePending = 0
    offlineConflicts = 0
    offlineSyncing = false
  }

  const base = getApiBaseUrl()
  if (base) {
    const health = await withApiRetry(() => fetchBackendHealth(), { maxAttempts: 2 }).catch(
      () => null,
    )
    const metrics = await withApiRetry(() => fetchBackendOpsMetrics(), { maxAttempts: 2 }).catch(
      () => null,
    )
    apiOk = health?.ok === true
    dbOk = health?.database === 'up'
    redisOk = health?.redis === 'up' ? true : health?.redis === 'down' ? false : null
    migrationCurrent = health?.migration === 'current' ? true : health?.migration === 'pending' ? false : null
    llmConfigured = typeof health?.llm === 'string' ? health.llm === 'up' : null
    backendQueueDepth = typeof health?.queue?.depth === 'number' ? health.queue.depth : null
    backendNotificationBacklog =
      typeof health?.notification?.backlog === 'number' ? health.notification.backlog : null
    backendStorageRecords =
      typeof health?.storage?.orders === 'number' ? health.storage.orders : null
    backendSyncStatus = typeof health?.sync?.status === 'string' ? health.sync.status : null
    backendAuditStatus = typeof health?.audit?.status === 'string' ? health.audit.status : null
    backendVersion = typeof health?.version === 'string' ? health.version : null
    backendCpuPercent = typeof metrics?.cpu?.processPercent === 'number' ? metrics.cpu.processPercent : null
    backendRamMb = typeof metrics?.ram?.rssMb === 'number' ? metrics.ram.rssMb : null
    backendApiAvgResponseMs =
      typeof metrics?.api?.avgResponseMs === 'number' ? metrics.api.avgResponseMs : null
    backendDbResponseMs =
      typeof metrics?.database?.responseMs === 'number' ? metrics.database.responseMs : null
  }

  const llmEnv =
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_LLM_PROVIDER : undefined
  if (llmConfigured == null && typeof llmEnv === 'string' && llmEnv.trim()) {
    llmConfigured = true
  }

  return {
    apiOk,
    dbOk,
    redisOk,
    migrationCurrent,
    aiWorkersActive: activeWorkers,
    aiWorkersTotal: workers.length,
    companyBrainEnabled: isCompanyBrainEnabled(),
    queueDepth,
    aiMemoryCount,
    clientMemoryMb: readClientMemoryMb(),
    toolEngineToday: toolSummary.today ?? 0,
    toolEngineFailed: toolSummary.failed ?? 0,
    llmConfigured,
    backendQueueDepth,
    backendNotificationBacklog,
    backendStorageRecords,
    backendSyncStatus,
    backendAuditStatus,
    backendVersion,
    backendCpuPercent,
    backendRamMb,
    backendApiAvgResponseMs,
    backendDbResponseMs,
    offlinePending,
    offlineConflicts,
    offlineSyncing,
    polledAt: new Date().toISOString(),
  }
}
