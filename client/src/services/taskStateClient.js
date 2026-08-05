import { getApiBaseUrl } from '../config/dataSource.js'
import { createApiClient } from '../lib/apiClient.js'
import { authRequestHeaders } from '../lib/operationActor.js'
import {
  applyTaskOverlayAction,
  clearAllTaskOverlayStates,
  loadTaskStateMap,
  saveTaskStateMap,
} from './taskStateStore.js'

/** @typedef {import('./taskStateStore.js').TaskStateMap} TaskStateMap */
/** @typedef {import('./taskStateStore.js').TaskOverlayStateKind} TaskOverlayStateKind */

/**
 * @param {Array<{ dedupeKey: string, state: string, snoozedUntil?: string | null }>} rows
 * @returns {TaskStateMap}
 */
function mapApiRowsToStateMap(rows) {
  /** @type {TaskStateMap} */
  const map = {}
  for (const r of rows) {
    map[r.dedupeKey] = {
      state: /** @type {TaskOverlayStateKind} */ (r.state),
      updatedAt: new Date().toISOString(),
      ...(r.snoozedUntil ? { snoozedUntil: r.snoozedUntil } : {}),
    }
  }
  return map
}

/**
 * @returns {Promise<TaskStateMap>}
 */
export async function fetchTaskStateMapFromApi() {
  const base = getApiBaseUrl()
  if (!base) return loadTaskStateMap()

  const client = createApiClient(base, { headers: authRequestHeaders() })
  const rows = await client.get('/v1/task-states')
  if (!Array.isArray(rows)) return {}
  const map = mapApiRowsToStateMap(rows)
  saveTaskStateMap(map)
  return map
}

/**
 * @param {string} dedupeKey
 * @param {TaskOverlayStateKind} state
 * @param {{ snoozeHours?: number }} [opts]
 */
export async function persistTaskOverlayAction(dedupeKey, state, opts = {}) {
  const base = getApiBaseUrl()
  if (!base) {
    return applyTaskOverlayAction(dedupeKey, state, opts)
  }

  const client = createApiClient(base, { headers: authRequestHeaders() })
  let snoozedUntil
  if (state === 'snoozed') {
    const hours = opts.snoozeHours ?? 24
    snoozedUntil = new Date(Date.now() + hours * 3_600_000).toISOString()
  }
  await client.put('/v1/task-states', {
    dedupeKey,
    state,
    ...(snoozedUntil ? { snoozedUntil } : {}),
  })
  return applyTaskOverlayAction(dedupeKey, state, opts)
}

export { clearAllTaskOverlayStates, loadTaskStateMap }
