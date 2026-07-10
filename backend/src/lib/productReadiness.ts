export const PRODUCT_READINESS_STATUS = {
  WAITING: 'waiting',
  PARTIAL: 'partial',
  READY: 'ready',
  MISSING: 'missing',
} as const

export type ProductReadinessStatus =
  (typeof PRODUCT_READINESS_STATUS)[keyof typeof PRODUCT_READINESS_STATUS]

export type ProductReadinessTone = 'ok' | 'caution' | 'warn' | 'danger'

export type LineReadiness = {
  status: ProductReadinessStatus
  label: string
  tone: ProductReadinessTone
}

export function parseQty(value: { toString(): string } | number | string | undefined): number {
  if (value == null) return 0
  const v = typeof value === 'number' ? value : Number.parseFloat(String(value))
  return Number.isFinite(v) ? v : 0
}

export function fmtQty(n: number): string {
  return n.toFixed(2)
}

/**
 * Satır hazırlık durumu — eksik parça (SSH) öncelikli.
 */
export function computeLineReadiness(
  ordered: number,
  received: number,
  hasOpenMissingOnLine: boolean,
): LineReadiness {
  if (hasOpenMissingOnLine) {
    return {
      status: PRODUCT_READINESS_STATUS.MISSING,
      label: 'Eksik geliş',
      tone: 'danger',
    }
  }
  if (received <= 0.0001) {
    return {
      status: PRODUCT_READINESS_STATUS.WAITING,
      label: 'Bekleniyor',
      tone: 'warn',
    }
  }
  if (received < ordered - 0.0001) {
    return {
      status: PRODUCT_READINESS_STATUS.PARTIAL,
      label: 'Kısmi geldi',
      tone: 'caution',
    }
  }
  return {
    status: PRODUCT_READINESS_STATUS.READY,
    label: 'Hazır',
    tone: 'ok',
  }
}

/** Sevk planında bu sefer planlanabilecek üst sınır (gelen adet sınırı). */
export function computeQtyShippable(ordered: number, received: number, reserved: number): number {
  const remaining = Math.max(0, ordered - reserved)
  const receivedCap = Math.max(0, received - reserved)
  return Math.min(remaining, receivedCap)
}

export type OrderReadinessSummary = {
  readyCount: number
  partialCount: number
  waitingCount: number
  missingCount: number
  totalLines: number
  allReady: boolean
  orderReadyToShip: boolean
  headline: string
  detailLines: string[]
}

/**
 * @param lines — satır readiness durumları
 */
export function computeOrderReadinessSummary(
  lines: { status: ProductReadinessStatus }[],
): OrderReadinessSummary {
  let readyCount = 0
  let partialCount = 0
  let waitingCount = 0
  let missingCount = 0

  for (const line of lines) {
    switch (line.status) {
      case PRODUCT_READINESS_STATUS.READY:
        readyCount += 1
        break
      case PRODUCT_READINESS_STATUS.PARTIAL:
        partialCount += 1
        break
      case PRODUCT_READINESS_STATUS.WAITING:
        waitingCount += 1
        break
      case PRODUCT_READINESS_STATUS.MISSING:
        missingCount += 1
        break
      default:
        break
    }
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

export type ReceivingRiskViolation = {
  orderLineId: string
  title: string
  reason: 'not_received' | 'exceeds_shippable'
}

export function findReceivingRiskViolations(
  planLines: {
    orderLineId: string
    title: string
    qtyReceived: string
    qtyShippable: string
  }[],
  selected: { orderLineId: string; qty: number }[],
): ReceivingRiskViolation[] {
  const byId = new Map(planLines.map((p) => [p.orderLineId, p]))
  const out: ReceivingRiskViolation[] = []

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
