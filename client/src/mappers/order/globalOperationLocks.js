/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @typedef {'critical' | 'warning' | 'info'} OperationLockSeverity
 * @typedef {'shipment' | 'shipment_plan' | 'shipment_status'} OperationLockScope
 *
 * @typedef {Object} OperationLock
 * @property {string} id
 * @property {OperationLockSeverity} severity
 * @property {string} message
 * @property {boolean} blocks
 * @property {OperationLockScope[]} scopes
 */

export const OPERATION_LOCK_ID = /** @type {const} */ ({
  SSH_BLOCKS_SHIPMENT: 'SSH_BLOCKS_SHIPMENT',
  BALANCE_BLOCKS_SHIPMENT: 'BALANCE_BLOCKS_SHIPMENT',
  PRODUCTION_NOT_READY: 'PRODUCTION_NOT_READY',
  SHIPMENT_ISSUE: 'SHIPMENT_ISSUE',
  RECEIPT_PENDING: 'RECEIPT_PENDING',
})

const LOCK_PRIORITY = [
  OPERATION_LOCK_ID.SSH_BLOCKS_SHIPMENT,
  OPERATION_LOCK_ID.SHIPMENT_ISSUE,
  OPERATION_LOCK_ID.BALANCE_BLOCKS_SHIPMENT,
  OPERATION_LOCK_ID.PRODUCTION_NOT_READY,
  OPERATION_LOCK_ID.RECEIPT_PENDING,
]

/**
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {string} todayIso
 * @returns {OperationLock[]}
 */
export function computeGlobalOperationLocks(order, dto, todayIso) {
  /** @type {OperationLock[]} */
  const locks = []
  const openMissing = (dto?.openMissingItemsCount ?? 0) > 0
  const due =
    dto?.amountDue != null
      ? Number.parseFloat(dto.amountDue.amount)
      : Math.max(0, (order.amount ?? 0) - (order.paidAmount ?? 0))
  const total = order.amount ?? 1
  const balanceRatio = due / Math.max(total, 1)

  if (openMissing) {
    locks.push({
      id: OPERATION_LOCK_ID.SSH_BLOCKS_SHIPMENT,
      severity: 'critical',
      message: `${dto?.openMissingItemsCount ?? 1} açık eksik parça — sevk kilidi`,
      blocks: true,
      scopes: ['shipment', 'shipment_plan', 'shipment_status'],
    })
  }

  if (dto?.hasShipmentIssue) {
    locks.push({
      id: OPERATION_LOCK_ID.SHIPMENT_ISSUE,
      severity: 'critical',
      message: 'Sevk / montaj sorunu açık — durum güncellemesi bekliyor',
      blocks: true,
      scopes: ['shipment_status'],
    })
  }

  if (due > 0.009 && (dto?.hasOverdueBalance || balanceRatio > 0.4)) {
    locks.push({
      id: OPERATION_LOCK_ID.BALANCE_BLOCKS_SHIPMENT,
      severity: 'warning',
      message: 'Tahsilat tamamlanmadan sevk planı riskli',
      blocks: false,
      scopes: ['shipment_plan'],
    })
  }

  const productionReady =
    order.status === 'Hazır' ||
    order.status === 'Teslim Edildi' ||
    dto?.operationalState?.productionState === 'READY'
  if (!productionReady && order.status !== 'Teslim Edildi' && !openMissing) {
    locks.push({
      id: OPERATION_LOCK_ID.PRODUCTION_NOT_READY,
      severity: 'warning',
      message: 'Üretim / ürün hazırlığı tamamlanmadan sevk planlanmamalı',
      blocks: false,
      scopes: ['shipment_plan'],
    })
  }

  if (dto?.riskSignalDueDatePendingReceive) {
    locks.push({
      id: OPERATION_LOCK_ID.RECEIPT_PENDING,
      severity: 'info',
      message: 'Termin baskısı — fiziksel geliş eksik',
      blocks: false,
      scopes: ['shipment_plan'],
    })
  }

  void todayIso
  return locks.sort(
    (a, b) => LOCK_PRIORITY.indexOf(a.id) - LOCK_PRIORITY.indexOf(b.id),
  )
}

/**
 * @param {OperationLock[]} locks
 * @param {string} lockId
 */
export function isOperationLocked(locks, lockId) {
  const lock = locks.find((l) => l.id === lockId)
  return Boolean(lock?.blocks)
}

/**
 * @param {OperationLock[]} locks
 * @param {OperationLockScope} scope
 */
export function isScopeBlockedByLocks(locks, scope) {
  return locks.some((l) => l.blocks && l.scopes.includes(scope))
}

/**
 * @param {OperationLock[]} locks
 */
export function blocksShipmentPlanning(locks) {
  return isScopeBlockedByLocks(locks, 'shipment_plan')
}

/**
 * @param {OperationLock[]} locks
 * @returns {{ severity: OperationLockSeverity, message: string } | null}
 */
export function getPrimaryLockBanner(locks) {
  const first = locks[0]
  if (!first) return null
  return { severity: first.severity, message: first.message }
}

/**
 * @param {OperationLock[]} locks
 * @param {string} lockId
 */
export function isActionBlockedByLocks(locks, lockId) {
  const lock = locks.find((l) => l.id === lockId)
  return Boolean(lock?.blocks)
}

/**
 * Kilit banner — yalnızca bloklayan veya uyarı seviyesindeki kayıtlar.
 * @param {OperationLock[]} locks
 */
export function getDrawerVisibleLocks(locks) {
  return locks.filter((l) => l.blocks || l.severity !== 'info')
}
