import { getApiBaseUrl } from '../config/dataSource.js'
import { withApiRetry } from '../lib/apiRetry.js'
import { getOperationalToday } from '../data/constants.js'
import { buildExecutionSummaryLocal } from './ai-tools/mockAiToolExecutionStore.js'
import { getDigitalWorkforceCoreSnapshot } from './mockDigitalWorkforceStore.js'
import { isCompanyBrainEnabled } from '../config/companyBrainConfig.js'
import { listGlobalMemories } from './genesis/globalMemoryStore.js'

/**
 * @returns {number | null}
 */
function readClientMemoryMb() {
  const perf = /** @type {Performance & { memory?: { usedJSHeapSize: number } }} */ (performance)
  if (!perf.memory?.usedJSHeapSize) return null
  return Math.round(perf.memory.usedJSHeapSize / (1024 * 1024))
}

/**
 * @returns {Promise<{ ok: boolean, database?: 'up' | 'down', redis?: 'up' | 'down' | null, migration?: 'current' | 'pending' | null } | null>}
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

  const base = getApiBaseUrl()
  if (base) {
    const health = await withApiRetry(() => fetchBackendHealth(), { maxAttempts: 2 }).catch(
      () => null,
    )
    apiOk = health?.ok === true
    dbOk = health?.database === 'up'
    redisOk = health?.redis === 'up' ? true : health?.redis === 'down' ? false : null
    migrationCurrent = health?.migration === 'current' ? true : health?.migration === 'pending' ? false : null
    llmConfigured = typeof health?.llm === 'string' ? health.llm === 'up' : null
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
    polledAt: new Date().toISOString(),
  }
}
