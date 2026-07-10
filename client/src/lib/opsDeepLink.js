/**
 * @typedef {'today' | 'tomorrow' | 'week' | 'future' | 'all' | 'overdue' | 'pending_confirm' | 'critical' | 'locked' | 'missing-image' | 'missing-variant' | 'partial' | 'none' | 'waiting' | 'ready' | 'pending-approval'} OpsDeepLinkFilterId
 */

const OPS_DEEP_LINK_KEY = 'mosOpsDeepLink'

/**
 * @param {string} page
 * @param {OpsDeepLinkFilterId} filter
 */
export function setOpsDeepLink(page, filter) {
  try {
    sessionStorage.setItem(OPS_DEEP_LINK_KEY, JSON.stringify({ page, filter, ts: Date.now() }))
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} page
 * @returns {OpsDeepLinkFilterId | null}
 */
export function consumeOpsDeepLink(page) {
  try {
    const raw = sessionStorage.getItem(OPS_DEEP_LINK_KEY)
    if (!raw) return null
    const data = JSON.parse(raw)
    if (data?.page !== page) return null
    sessionStorage.removeItem(OPS_DEEP_LINK_KEY)
    return /** @type {OpsDeepLinkFilterId} */ (data.filter)
  } catch {
    return null
  }
}

/**
 * @param {string} page
 * @param {OpsDeepLinkFilterId} filter
 * @param {(page: string, ctx?: { opsFilter?: OpsDeepLinkFilterId }) => void} onNavigate
 */
export function navigateWithOpsFilter(page, filter, onNavigate) {
  setOpsDeepLink(page, filter)
  onNavigate(page, { opsFilter: filter })
}
