import { beforeEach, describe, expect, it } from 'vitest'
import { resetMockSupplierLedgerStore } from '../../src/services/mockSupplierLedgerStore.js'
import { resetMockSupplierStore } from '../../src/services/mockSupplierStore.js'
import {
  mockCreateSupplier,
  mockListSuppliers,
  mockPostSupplierPayment,
} from '../../src/services/mockSuppliersApi.js'

describe('mockSuppliersApi', () => {
  beforeEach(() => {
    resetMockSupplierStore()
    resetMockSupplierLedgerStore()
  })

  it('tedarikçi oluşturma ve listeleme', async () => {
    const created = await mockCreateSupplier({ companyName: 'Yeni Ltd', code: 'YNL' })
    expect(created.openBalance).toBe('0.00')
    const list = await mockListSuppliers({ q: 'Yeni' })
    expect(list.some((s) => s.id === created.id)).toBe(true)
  })

  it('ödeme öncesi bakiye kontrolü — pasif tedarikçi', async () => {
    const created = await mockCreateSupplier({ companyName: 'Pasif Test', isActive: false })
    await expect(
      mockPostSupplierPayment(created.id, { amount: 100, method: 'CASH' }),
    ).rejects.toThrow(/Pasif/)
  })

  it('seed tedarikçiye ödeme bakiyeyi düşürür', async () => {
    const list = await mockListSuppliers({ activeOnly: false })
    const abc = list.find((s) => s.code === 'ABC')
    expect(abc).toBeTruthy()
    const before = Number.parseFloat(abc.openBalance)
    const result = await mockPostSupplierPayment(abc.id, { amount: 5000, method: 'TRANSFER' })
    expect(Number.parseFloat(result.supplier.openBalance)).toBe(before - 5000)
  })
})
