import { beforeEach, describe, expect, it, vi } from 'vitest'
import { PAYMENT_METHOD } from '../../src/contracts/v1/enums.js'
import { clearMockSession, readMockSession } from '../../src/services/mockSessionPersistence.js'
import {
  postOrderPayment,
  resetMockOrdersStore,
  getOrders,
} from '../../src/services/mockApi.js'

describe('payment persistence', () => {
  /** @type {Map<string, string>} */
  let storage

  beforeEach(() => {
    storage = new Map()
    vi.stubGlobal('sessionStorage', {
      getItem: (/** @type {string} */ k) => storage.get(k) ?? null,
      setItem: (/** @type {string} */ k, /** @type {string} */ v) => {
        storage.set(k, v)
      },
      removeItem: (/** @type {string} */ k) => {
        storage.delete(k)
      },
    })
    clearMockSession()
    resetMockOrdersStore()
  })

  it('mock modda ödeme sessionStorage snapshot içine yazılır', async () => {
    await postOrderPayment('S-24089', { amount: 5000, method: PAYMENT_METHOD.CASH })
    const snap = readMockSession()
    expect(snap).not.toBeNull()
    expect(snap?.payments.some((t) => t.salesOrderId === 'S-24089')).toBe(true)
  })

  it('mock ödeme sonrası getOrders güncel amountDue döner', async () => {
    await postOrderPayment('S-24089', { amount: 5000, method: PAYMENT_METHOD.CASH })
    const list = await getOrders()
    const row = list.find((d) => d.id === 'S-24089')
    expect(row).toBeDefined()
    expect(Number.parseFloat(row.amountDue.amount)).toBeLessThan(
      Number.parseFloat(row.totalAmount.amount),
    )
  })
})
