const READ_KEY = 'mos-pro-notif-read'

/** @returns {Set<string>} */
export function getReadNotificationIds() {
  try {
    const raw = localStorage.getItem(READ_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    return new Set(Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [])
  } catch {
    return new Set()
  }
}

/** @param {Set<string>} ids */
function persistReadIds(ids) {
  try {
    localStorage.setItem(READ_KEY, JSON.stringify([...ids]))
  } catch {
    /* ignore */
  }
}

/** @param {string} id */
export function markNotificationRead(id) {
  const ids = getReadNotificationIds()
  ids.add(id)
  persistReadIds(ids)
}

/** @param {string[]} ids */
export function markAllNotificationsRead(ids) {
  const read = getReadNotificationIds()
  for (const id of ids) read.add(id)
  persistReadIds(read)
}

/**
 * @param {{ id: string }[]} items
 * @param {Set<string>} [readIds]
 */
export function getUnreadNotificationCount(items, readIds = getReadNotificationIds()) {
  return items.filter((n) => !readIds.has(n.id)).length
}

/**
 * @param {string | undefined} severity
 * @returns {'info' | 'success' | 'warning' | 'critical' | 'ai'}
 */
export function resolveNotificationType(severity) {
  const s = (severity ?? 'info').toLowerCase()
  if (s === 'critical' || s === 'danger' || s === 'error') return 'critical'
  if (s === 'warning' || s === 'warn') return 'warning'
  if (s === 'success' || s === 'ok') return 'success'
  if (s === 'ai') return 'ai'
  return 'info'
}

/** @param {'info' | 'success' | 'warning' | 'critical' | 'ai'} type */
export function notificationTypeLabel(type) {
  if (type === 'success') return 'Başarı'
  if (type === 'warning') return 'Uyarı'
  if (type === 'critical') return 'Kritik'
  if (type === 'ai') return 'AI'
  return 'Bilgi'
}
