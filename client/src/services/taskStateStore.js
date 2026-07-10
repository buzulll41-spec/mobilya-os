import { loadAuthSession } from './authSessionStore.js'

const STORAGE_KEY = 'mobilya-os.task-state.v1'

function resolveStorageKey() {
  const session = loadAuthSession()
  const uid = session?.user?.id
  return typeof uid === 'string' && uid ? `${STORAGE_KEY}.${uid}` : STORAGE_KEY
}

/** @typedef {'dismissed' | 'completed' | 'snoozed'} TaskOverlayStateKind */

/**
 * @typedef {Object} TaskOverlayEntry
 * @property {TaskOverlayStateKind} state
 * @property {string} updatedAt ISO
 * @property {string} [snoozedUntil] ISO — snoozed için
 */

/** @typedef {Record<string, TaskOverlayEntry>} TaskStateMap */

/** localStorage yoksa (test/SSR) bellek içi yedek — kullanıcı anahtarına göre. */
/** @type {Record<string, TaskStateMap>} */
const memoryByKey = {}

let activeStorageKey = STORAGE_KEY

/**
 * @returns {TaskStateMap}
 */
function storageKey() {
  const key = resolveStorageKey()
  if (key !== activeStorageKey) {
    activeStorageKey = key
  }
  return activeStorageKey
}

function memoryForKey(key) {
  if (!memoryByKey[key]) memoryByKey[key] = {}
  return memoryByKey[key]
}

export function loadTaskStateMap() {
  const key = storageKey()
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return { ...memoryForKey(key) }
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return { ...memoryForKey(key) }
    memoryByKey[key] = /** @type {TaskStateMap} */ ({ ...parsed })
    return memoryByKey[key]
  } catch {
    return { ...memoryForKey(key) }
  }
}

/**
 * @param {TaskStateMap} map
 */
export function saveTaskStateMap(map) {
  const key = storageKey()
  memoryByKey[key] = { ...map }
  try {
    localStorage.setItem(key, JSON.stringify(map))
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} dedupeKey
 * @param {TaskOverlayStateKind} state
 * @param {{ snoozedUntil?: string }} [opts]
 */
export function setTaskOverlayState(dedupeKey, state, opts = {}) {
  const map = loadTaskStateMap()
  /** @type {TaskOverlayEntry} */
  const entry = {
    state,
    updatedAt: new Date().toISOString(),
    ...(state === 'snoozed' && opts.snoozedUntil ? { snoozedUntil: opts.snoozedUntil } : {}),
  }
  map[dedupeKey] = entry
  saveTaskStateMap(map)
  return map
}

/**
 * @param {string} dedupeKey
 */
export function clearTaskOverlayState(dedupeKey) {
  const map = loadTaskStateMap()
  delete map[dedupeKey]
  saveTaskStateMap(map)
  return map
}

export function clearAllTaskOverlayStates() {
  saveTaskStateMap({})
}

/**
 * @param {string} dedupeKey
 * @param {TaskOverlayStateKind} state
 * @param {{ snoozeHours?: number }} [opts]
 */
export function applyTaskOverlayAction(dedupeKey, state, opts = {}) {
  if (state === 'snoozed') {
    const hours = opts.snoozeHours ?? 24
    const until = new Date(Date.now() + hours * 3_600_000).toISOString()
    return setTaskOverlayState(dedupeKey, 'snoozed', { snoozedUntil: until })
  }
  return setTaskOverlayState(dedupeKey, state)
}
