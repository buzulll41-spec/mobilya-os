export const SUPPLIER_HEALTH_STATUS = {
  CRITICAL: 'critical',
  RISKY: 'risky',
  NORMAL: 'normal',
  PASSIVE: 'passive',
} as const

export type SupplierHealthStatus =
  (typeof SUPPLIER_HEALTH_STATUS)[keyof typeof SUPPLIER_HEALTH_STATUS]

export type SupplierHealthInput = {
  isActive: boolean
  openBalance: number
  openProductCount: number
  pendingOrderCount: number
  missingQtyTotal: number
  pendingQtyTotal: number
  hasOverdueDelivery: boolean
  daysSinceLastMovement: number | null
  daysSinceLastPayment: number | null
}

export const SUPPLIER_HEALTH_THRESHOLDS = {
  CRITICAL_BALANCE: 100_000,
  CRITICAL_OPEN_PRODUCTS: 8,
  RISKY_IDLE_DAYS: 45,
  PASSIVE_IDLE_DAYS: 90,
  RISKY_MISSING_RATIO: 0.45,
  RISKY_BALANCE_WITH_STALE_PAYMENT_DAYS: 30,
}

/**
 * @param {string | null | undefined} isoDate
 * @param {string} todayIso
 */
export function daysSinceIsoDate(isoDate: string | null | undefined, todayIso: string): number | null {
  if (!isoDate?.trim()) return null
  const a = new Date(`${isoDate.trim()}T12:00:00`)
  const b = new Date(`${todayIso.trim()}T12:00:00`)
  if (Number.isNaN(a.getTime()) || Number.isNaN(b.getTime())) return null
  return Math.floor((b.getTime() - a.getTime()) / 86_400_000)
}

export function formatLastActivityLabel(daysSince: number | null): string {
  if (daysSince === null) return 'Hareket yok'
  if (daysSince <= 0) return 'Bugün'
  if (daysSince === 1) return '1 gün önce'
  return `${daysSince} gün önce`
}

export function computeSupplierHealth(input: SupplierHealthInput): {
  status: SupplierHealthStatus
  label: string
} {
  if (!input.isActive) {
    return { status: SUPPLIER_HEALTH_STATUS.PASSIVE, label: 'Pasif' }
  }

  const missingRatio =
    input.pendingQtyTotal > 0.0001 ? input.missingQtyTotal / input.pendingQtyTotal : 0

  const stalePay =
    input.openBalance > 5000 &&
    input.daysSinceLastPayment !== null &&
    input.daysSinceLastPayment >= SUPPLIER_HEALTH_THRESHOLDS.RISKY_BALANCE_WITH_STALE_PAYMENT_DAYS

  if (
    input.openBalance >= SUPPLIER_HEALTH_THRESHOLDS.CRITICAL_BALANCE ||
    input.openProductCount >= SUPPLIER_HEALTH_THRESHOLDS.CRITICAL_OPEN_PRODUCTS ||
    input.hasOverdueDelivery
  ) {
    return { status: SUPPLIER_HEALTH_STATUS.CRITICAL, label: 'Kritik' }
  }

  if (
    input.daysSinceLastMovement !== null &&
    input.daysSinceLastMovement >= SUPPLIER_HEALTH_THRESHOLDS.PASSIVE_IDLE_DAYS
  ) {
    return { status: SUPPLIER_HEALTH_STATUS.PASSIVE, label: 'Pasif' }
  }

  if (
    (input.daysSinceLastMovement !== null &&
      input.daysSinceLastMovement >= SUPPLIER_HEALTH_THRESHOLDS.RISKY_IDLE_DAYS) ||
    missingRatio >= SUPPLIER_HEALTH_THRESHOLDS.RISKY_MISSING_RATIO ||
    stalePay
  ) {
    return { status: SUPPLIER_HEALTH_STATUS.RISKY, label: 'Riskli' }
  }

  return { status: SUPPLIER_HEALTH_STATUS.NORMAL, label: 'Normal' }
}
