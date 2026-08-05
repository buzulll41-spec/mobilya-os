import { getApiBaseUrl } from '../config/dataSource.js'

/**
 * FAZ 40 — Real AI worker feature flags.
 */
export function isRealAiWorkersEnabled() {
  const flag =
    typeof import.meta.env !== 'undefined' ? import.meta.env.VITE_AI_WORKERS_ENABLED : undefined
  return flag === 'true' || flag === true
}

export function canUseRealAiWorkers() {
  return isRealAiWorkersEnabled() && Boolean(getApiBaseUrl())
}
