import { getApiBaseUrl } from '../config/dataSource.js'
import { canUseRealAiWorkers } from '../config/aiWorkerConfig.js'

/**
 * @typedef {import('../contracts/v1/aiWorkerRunner.js').AiWorkerRunPayload} AiWorkerRunPayload
 * @typedef {import('../contracts/v1/aiWorkerRunner.js').AiWorkerRunResult} AiWorkerRunResult
 */

/**
 * @returns {Promise<{ enabled: boolean; providerId: string; model: string } | null>}
 */
export async function fetchAiWorkerConfig() {
  const base = getApiBaseUrl()
  if (!base) return null
  try {
    const res = await fetch(`${base}/v1/ai/config`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * @param {string} workerId
 * @param {AiWorkerRunPayload} payload
 * @param {{ executeTools?: boolean }} [options]
 * @returns {Promise<AiWorkerRunResult | null>}
 */
export async function runAiWorkerTaskRemote(workerId, payload, options = {}) {
  if (!canUseRealAiWorkers()) return null
  const base = getApiBaseUrl()
  if (!base) return null

  const path = options.executeTools ? 'run' : 'evaluate'
  try {
    const res = await fetch(`${base}/v1/ai/workers/${workerId}/${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        executeTools: options.executeTools ?? path === 'run',
      }),
    })
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
