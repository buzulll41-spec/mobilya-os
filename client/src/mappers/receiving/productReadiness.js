/** @typedef {'waiting' | 'partial' | 'ready' | 'missing'} ProductReadinessStatus */
/** @typedef {'ok' | 'caution' | 'warn' | 'danger'} ProductReadinessTone */

export const PRODUCT_READINESS_STATUS = {
  WAITING: 'waiting',
  PARTIAL: 'partial',
  READY: 'ready',
  MISSING: 'missing',
}

/**
 * @param {string | number | undefined} raw
 */
export function parseQty(raw) {
  const n = Number.parseFloat(String(raw ?? ''))
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {number} n
 */
export function fmtQty(n) {
  return n.toFixed(2)
}

/**
 * @param {number} ordered
 * @param {number} received
 * @param {boolean} hasOpenMissingOnLine
 */
export function computeLineReadiness(ordered, received, hasOpenMissingOnLine) {
  if (hasOpenMissingOnLine) {
    return { status: /** @type {ProductReadinessStatus} */ ('missing'), label: 'Eksik geliş', tone: /** @type {ProductReadinessTone} */ ('danger') }
  }
  if (received <= 0.0001) {
    return { status: /** @type {ProductReadinessStatus} */ ('waiting'), label: 'Bekleniyor', tone: /** @type {ProductReadinessTone} */ ('warn') }
  }
  if (received < ordered - 0.0001) {
    return { status: /** @type {ProductReadinessStatus} */ ('partial'), label: 'Kısmi geldi', tone: /** @type {ProductReadinessTone} */ ('caution') }
  }
  return { status: /** @type {ProductReadinessStatus} */ ('ready'), label: 'Hazır', tone: /** @type {ProductReadinessTone} */ ('ok') }
}

/**
 * @param {number} ordered
 * @param {number} received
 * @param {number} reserved
 */
export function computeQtyShippable(ordered, received, reserved) {
  const remaining = Math.max(0, ordered - reserved)
  const receivedCap = Math.max(0, received - reserved)
  return Math.min(remaining, receivedCap)
}

/**
 * @param {{ status: ProductReadinessStatus }[]} lines
 */
export function computeOrderReadinessSummary(lines) {
  let readyCount = 0
  let partialCount = 0
  let waitingCount = 0
  let missingCount = 0

  for (const line of lines) {
    if (line.status === PRODUCT_READINESS_STATUS.READY) readyCount += 1
    else if (line.status === PRODUCT_READINESS_STATUS.PARTIAL) partialCount += 1
    else if (line.status === PRODUCT_READINESS_STATUS.WAITING) waitingCount += 1
    else if (line.status === PRODUCT_READINESS_STATUS.MISSING) missingCount += 1
  }

  const totalLines = lines.length
  const allReady = totalLines > 0 && lines.every((l) => l.status === PRODUCT_READINESS_STATUS.READY)
  const orderReadyToShip = allReady

  /** @type {string[]} */
  const detailLines = []
  if (readyCount > 0) detailLines.push(`${readyCount} ürün hazır`)
  if (missingCount > 0) detailLines.push(`${missingCount} ürün eksik`)
  if (waitingCount > 0) detailLines.push(`${waitingCount} ürün bekleniyor`)
  if (partialCount > 0) detailLines.push(`${partialCount} ürün kısmi geldi`)

  const headline = orderReadyToShip
    ? 'Tüm ürünler hazır — sevke uygun.'
    : detailLines.length
      ? detailLines.join(' · ')
      : 'Ürün hazırlık durumu'

  return {
    readyCount,
    partialCount,
    waitingCount,
    missingCount,
    totalLines,
    allReady,
    orderReadyToShip,
    headline,
    detailLines,
  }
}

/**
 * @param {{ orderLineId: string, title: string, qtyReceived: string, qtyShippable: string }[]} planLines
 * @param {{ orderLineId: string, qty: number }[]} selected
 */
export function findReceivingRiskViolations(planLines, selected) {
  const byId = new Map(planLines.map((p) => [p.orderLineId, p]))
  /** @type {{ orderLineId: string, title: string, reason: 'not_received' | 'exceeds_shippable' }[]} */
  const out = []

  for (const row of selected) {
    const plan = byId.get(row.orderLineId)
    if (!plan) continue
    const received = parseQty(plan.qtyReceived)
    const shippable = parseQty(plan.qtyShippable)
    if (received <= 0.0001 && row.qty > 0.0001) {
      out.push({ orderLineId: row.orderLineId, title: plan.title, reason: 'not_received' })
    } else if (row.qty > shippable + 0.0001) {
      out.push({ orderLineId: row.orderLineId, title: plan.title, reason: 'exceeds_shippable' })
    }
  }

  return out
}

/**
 * @param {ProductReadinessStatus} status
 */
export function readinessStatusLabel(status) {
  switch (status) {
    case PRODUCT_READINESS_STATUS.READY:
      return 'Hazır'
    case PRODUCT_READINESS_STATUS.PARTIAL:
      return 'Kısmi geldi'
    case PRODUCT_READINESS_STATUS.WAITING:
      return 'Bekleniyor'
    case PRODUCT_READINESS_STATUS.MISSING:
      return 'Eksik geliş'
    default:
      return status
  }
}
