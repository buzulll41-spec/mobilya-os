import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockOrderLineStore } from '../../src/services/mockOrderLineStore.js'
import { resetMockIncomingGoodsStore } from '../../src/services/mockIncomingGoodsStore.js'
import { resetMockSupplierStore } from '../../src/services/mockSupplierStore.js'
import { resetMockSupplierLedgerStore } from '../../src/services/mockSupplierLedgerStore.js'
import { mockListPendingOrderLines } from '../../src/services/mockIncomingGoodsApi.js'
import { ensureMockOrderLinesBootstrapped } from '../../src/services/mockApi.js'

describe('mockListPendingOrderLines picker data', () => {
  beforeEach(() => {
    resetMockSupplierStore()
    resetMockSupplierLedgerStore()
    resetMockIncomingGoodsStore()
    resetMockOrderLineStore()
  })

  it('modal açılışında bekleyen müşteri siparişleri listelenir', async () => {
    ensureMockOrderLinesBootstrapped()
    const pending = await mockListPendingOrderLines()
    expect(pending.length).toBeGreaterThan(0)
  })

  it('müşteri araması seed siparişlerinde çalışır', async () => {
    ensureMockOrderLinesBootstrapped()
    const pending = await mockListPendingOrderLines('Zeynep')
    expect(pending.some((p) => p.customerName.includes('Zeynep'))).toBe(true)
  })

  it('boş arama tüm bekleyen kalemleri döner', async () => {
    ensureMockOrderLinesBootstrapped()
    const all = await mockListPendingOrderLines()
    const filtered = await mockListPendingOrderLines('Zeynep')
    expect(all.length).toBeGreaterThanOrEqual(filtered.length)
  })
})
