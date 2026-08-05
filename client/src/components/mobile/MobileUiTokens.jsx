const MOBILE_UI_ICONS = {
  dashboard: '🏠',
  orders: '📦',
  shipment: '🚚',
  supply: '🏭',
  service: '🔧',
  missing: '📋',
  collection: '💰',
  notifications: '🔔',
  offline: '📴',
  online: '📶',
}

/** @param {keyof typeof MOBILE_UI_ICONS | string} key */
export function getMobileUiIcon(key) {
  return MOBILE_UI_ICONS[key] ?? '•'
}

/**
 * @param {'success' | 'warning' | 'critical' | 'neutral'} tone
 */
export function getMobileUiToneClass(tone) {
  if (tone === 'success') return 'is-success'
  if (tone === 'warning') return 'is-warning'
  if (tone === 'critical') return 'is-critical'
  return 'is-neutral'
}
