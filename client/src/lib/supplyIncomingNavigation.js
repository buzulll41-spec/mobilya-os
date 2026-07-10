/**
 * @param {{
 *   q?: string
 *   orderId?: string
 *   orderLineId?: string
 *   openIncoming?: boolean
 *   tab?: 'operasyon' | 'cari'
 * }} [options]
 */
export function buildSupplyIncomingEntryUrl(options = {}) {
  const params = new URLSearchParams()
  if (options.tab === 'cari') params.set('tab', 'cari')
  if (options.openIncoming !== false && options.tab !== 'cari') params.set('incoming', '1')
  if (options.q?.trim()) params.set('q', options.q.trim())
  if (options.orderId?.trim()) params.set('orderId', options.orderId.trim())
  if (options.orderLineId?.trim()) params.set('lineId', options.orderLineId.trim())
  const qs = params.toString()
  return `#/supply-incoming${qs ? `?${qs}` : ''}`
}

/**
 * @param {string} [hash]
 */
export function parseSupplyIncomingDeepLink(hash = typeof window !== 'undefined' ? window.location.hash : '') {
  const queryPart = hash.split('?')[1] ?? ''
  const params = new URLSearchParams(queryPart)
  const tabRaw = params.get('tab')
  return {
    tab: tabRaw === 'cari' ? 'cari' : 'operasyon',
    openIncoming: params.get('incoming') === '1',
    q: params.get('q') ?? '',
    orderId: params.get('orderId') ?? '',
    lineId: params.get('lineId') ?? '',
  }
}

/**
 * @param {'operasyon' | 'cari'} tab
 */
export function navigateSupplyIncomingTab(tab) {
  if (typeof window === 'undefined') return
  const link = parseSupplyIncomingDeepLink()
  const params = new URLSearchParams()
  if (tab === 'cari') {
    params.set('tab', 'cari')
  } else {
    if (link.openIncoming) params.set('incoming', '1')
    if (link.q) params.set('q', link.q)
    if (link.orderId) params.set('orderId', link.orderId)
    if (link.lineId) params.set('lineId', link.lineId)
  }
  const qs = params.toString()
  window.location.hash = `#/supply-incoming${qs ? `?${qs}` : ''}`
}

/**
 * @param {string} hash
 */
export function navigateToSupplyIncomingEntry(options = {}) {
  if (typeof window === 'undefined') return
  window.location.hash = buildSupplyIncomingEntryUrl(options)
}
