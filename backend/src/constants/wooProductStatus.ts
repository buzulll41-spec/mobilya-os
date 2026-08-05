export const WOO_PRODUCT_STATUS = {
  NOT_READY: 'NOT_READY',
  READY: 'READY',
  SYNC_PENDING: 'SYNC_PENDING',
  SYNCED: 'SYNCED',
  ERROR: 'ERROR',
} as const

export type WooProductStatus = (typeof WOO_PRODUCT_STATUS)[keyof typeof WOO_PRODUCT_STATUS]

const STATUS_SET = new Set<string>(Object.values(WOO_PRODUCT_STATUS))

export function isWooProductStatus(v: string): v is WooProductStatus {
  return STATUS_SET.has(v)
}

export function wooProductStatusLabelTr(status: WooProductStatus): string {
  switch (status) {
    case WOO_PRODUCT_STATUS.NOT_READY:
      return 'Hazır değil'
    case WOO_PRODUCT_STATUS.READY:
      return 'Woo hazır'
    case WOO_PRODUCT_STATUS.SYNC_PENDING:
      return 'Sync bekliyor'
    case WOO_PRODUCT_STATUS.SYNCED:
      return 'Senkronize'
    case WOO_PRODUCT_STATUS.ERROR:
      return 'Woo hatası'
    default:
      return status
  }
}

export function wooProductStatusTone(
  status: WooProductStatus,
): 'success' | 'warning' | 'critical' | 'info' | 'neutral' {
  switch (status) {
    case WOO_PRODUCT_STATUS.READY:
    case WOO_PRODUCT_STATUS.SYNCED:
      return 'success'
    case WOO_PRODUCT_STATUS.SYNC_PENDING:
      return 'warning'
    case WOO_PRODUCT_STATUS.ERROR:
      return 'critical'
    case WOO_PRODUCT_STATUS.NOT_READY:
      return 'neutral'
    default:
      return 'info'
  }
}

const OPERATIONAL_STATUSES = new Set<WooProductStatus>([
  WOO_PRODUCT_STATUS.SYNC_PENDING,
  WOO_PRODUCT_STATUS.SYNCED,
  WOO_PRODUCT_STATUS.ERROR,
])

export function resolveEffectiveWooStatus(
  storedStatus: string | null | undefined,
  readiness: 'READY' | 'NOT_READY',
): WooProductStatus {
  if (storedStatus && isWooProductStatus(storedStatus) && OPERATIONAL_STATUSES.has(storedStatus)) {
    return storedStatus
  }
  return readiness === 'READY' ? WOO_PRODUCT_STATUS.READY : WOO_PRODUCT_STATUS.NOT_READY
}
