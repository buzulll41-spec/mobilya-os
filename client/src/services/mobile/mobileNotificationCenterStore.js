const MOBILE_NOTIF_HISTORY_KEY = 'mos-mobile-notification-history-v1'
const MOBILE_NOTIF_READ_KEY = 'mos-mobile-notification-read-v1'
const MOBILE_NOTIF_PREFS_KEY = 'mos-mobile-notification-prefs-v1'
const MOBILE_NOTIF_SIGNAL_KEY = 'mos-mobile-notification-signal-v1'
const MOBILE_NOTIF_HISTORY_LIMIT = 50

/**
 * @typedef {'order' | 'shipment' | 'service' | 'missing' | 'collection'} MobileNotificationType
 *
 * @typedef {{
 *   id: string
 *   type: MobileNotificationType
 *   title: string
 *   body: string
 *   createdAt: string
 *   navTarget: string
 *   navFilter?: import('../../lib/opsDeepLink.js').OpsDeepLinkFilterId
 * }} MobileLiveNotification
 *
 * @typedef {{
 *   vibrationEnabled: boolean
 *   soundEnabled: boolean
 * }} MobileNotificationPreferences
 *
 * @typedef {{
 *   order: number
 *   shipment: number
 *   service: number
 *   missing: number
 *   collection: number
 * }} MobileNotificationSignalSnapshot
 */

/** @returns {MobileLiveNotification[]} */
export function readMobileNotificationHistory() {
  try {
    const raw = localStorage.getItem(MOBILE_NOTIF_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((item) => item && typeof item.id === 'string')
  } catch {
    return []
  }
}

/** @param {MobileLiveNotification[]} history */
function writeMobileNotificationHistory(history) {
  try {
    localStorage.setItem(
      MOBILE_NOTIF_HISTORY_KEY,
      JSON.stringify(history.slice(0, MOBILE_NOTIF_HISTORY_LIMIT)),
    )
  } catch {
    // ignore storage errors
  }
}

/** @returns {Set<string>} */
export function readMobileNotificationReadIds() {
  try {
    const raw = localStorage.getItem(MOBILE_NOTIF_READ_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((item) => typeof item === 'string') : [])
  } catch {
    return new Set()
  }
}

/** @param {Set<string>} ids */
function writeMobileNotificationReadIds(ids) {
  try {
    localStorage.setItem(MOBILE_NOTIF_READ_KEY, JSON.stringify([...ids]))
  } catch {
    // ignore storage errors
  }
}

/** @param {string} id */
export function markMobileNotificationRead(id) {
  const ids = readMobileNotificationReadIds()
  ids.add(id)
  writeMobileNotificationReadIds(ids)
}

/** @param {string[]} ids */
export function markAllMobileNotificationsRead(ids) {
  const read = readMobileNotificationReadIds()
  for (const id of ids) read.add(id)
  writeMobileNotificationReadIds(read)
}

/**
 * @param {MobileLiveNotification[]} history
 * @param {Set<string>} [readIds]
 */
export function getMobileUnreadNotificationCount(history, readIds = readMobileNotificationReadIds()) {
  return history.filter((item) => !readIds.has(item.id)).length
}

/** @returns {MobileNotificationPreferences} */
export function readMobileNotificationPreferences() {
  try {
    const raw = localStorage.getItem(MOBILE_NOTIF_PREFS_KEY)
    if (!raw) return { vibrationEnabled: true, soundEnabled: false }
    const parsed = JSON.parse(raw)
    return {
      vibrationEnabled: parsed?.vibrationEnabled !== false,
      soundEnabled: parsed?.soundEnabled === true,
    }
  } catch {
    return { vibrationEnabled: true, soundEnabled: false }
  }
}

/** @param {MobileNotificationPreferences} prefs */
export function writeMobileNotificationPreferences(prefs) {
  try {
    localStorage.setItem(MOBILE_NOTIF_PREFS_KEY, JSON.stringify(prefs))
  } catch {
    // ignore storage errors
  }
}

/**
 * @param {MobileLiveNotificationSignalSnapshot} snapshot
 */
export function writeMobileNotificationSignalSnapshot(snapshot) {
  try {
    localStorage.setItem(MOBILE_NOTIF_SIGNAL_KEY, JSON.stringify(snapshot))
  } catch {
    // ignore storage errors
  }
}

/** @returns {MobileLiveNotificationSignalSnapshot | null} */
export function readMobileNotificationSignalSnapshot() {
  try {
    const raw = localStorage.getItem(MOBILE_NOTIF_SIGNAL_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    return {
      order: Number(parsed.order) || 0,
      shipment: Number(parsed.shipment) || 0,
      service: Number(parsed.service) || 0,
      missing: Number(parsed.missing) || 0,
      collection: Number(parsed.collection) || 0,
    }
  } catch {
    return null
  }
}

/**
 * @param {Omit<MobileLiveNotification, 'id' | 'createdAt'>} input
 * @param {MobileNotificationPreferences} prefs
 */
export function appendMobileLiveNotification(input, prefs) {
  const entry = {
    ...input,
    id: `mob-notif-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: new Date().toISOString(),
  }
  const current = readMobileNotificationHistory()
  writeMobileNotificationHistory([entry, ...current])
  triggerMobileAlertFeedback(prefs)
  return entry
}

/** @param {MobileNotificationPreferences} prefs */
function triggerMobileAlertFeedback(prefs) {
  if (prefs.vibrationEnabled && typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    navigator.vibrate([24, 30, 24])
  }

  if (!prefs.soundEnabled) return
  if (typeof window === 'undefined') return
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) return

  try {
    const ctx = new AudioContextCtor()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = 880
    gain.gain.value = 0.03
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start()
    osc.stop(ctx.currentTime + 0.12)
    window.setTimeout(() => {
      void ctx.close()
    }, 200)
  } catch {
    // ignore sound failures
  }
}
