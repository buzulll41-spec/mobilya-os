import { describe, expect, it } from 'vitest'
import {
  OPERATION_LOCK_ID,
  blocksShipmentPlanning,
  computeGlobalOperationLocks,
  getDrawerVisibleLocks,
  getPrimaryLockBanner,
  isActionBlockedByLocks,
} from '../../src/mappers/order/globalOperationLocks.js'

describe('computeGlobalOperationLocks', () => {
  const todayIso = '2026-05-21'

  it('blocks shipment when open SSH items exist', () => {
    const locks = computeGlobalOperationLocks(
      { id: 'o1', amount: 100_000, status: 'Hazır' },
      { openMissingItemsCount: 2 },
      todayIso,
    )
    expect(isActionBlockedByLocks(locks, OPERATION_LOCK_ID.SSH_BLOCKS_SHIPMENT)).toBe(true)
    expect(blocksShipmentPlanning(locks)).toBe(true)
    expect(getPrimaryLockBanner(locks)?.message).toMatch(/eksik parça/)
    expect(getPrimaryLockBanner(locks)?.severity).toBe('critical')
  })

  it('warns on high balance ratio without blocking when partially paid', () => {
    const locks = computeGlobalOperationLocks(
      { id: 'o2', amount: 100_000, paidAmount: 30_000, status: 'Üretimde' },
      { amountDue: { amount: '70000' }, hasOverdueBalance: true },
      todayIso,
    )
    const balanceLock = locks.find((l) => l.id === OPERATION_LOCK_ID.BALANCE_BLOCKS_SHIPMENT)
    expect(balanceLock).toBeDefined()
    expect(balanceLock?.blocks).toBe(true)
  })

  it('filters info-only locks from drawer banner list', () => {
    const locks = computeGlobalOperationLocks(
      { id: 'o3', amount: 50_000, paid: true, status: 'Hazır' },
      { riskSignalDueDatePendingReceive: true },
      todayIso,
    )
    const visible = getDrawerVisibleLocks(locks)
    expect(visible.every((l) => l.severity !== 'info' || l.blocks)).toBe(true)
  })
})
