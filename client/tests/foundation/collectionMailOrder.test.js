import { describe, expect, it, beforeEach } from 'vitest'
import { formatCurrencyTRY } from '../../src/data/dashboardHelpers.js'
import { PAYMENT_METHOD, PAYMENT_TRANSACTION_KIND } from '../../src/contracts/v1/enums.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../../src/contracts/v1/supplierLedgerEntryTypes.js'
import { saveAuthSession } from '../../src/services/authSessionStore.js'
import {
  resetMockOrdersStore,
  postOrderPayment,
} from '../../src/services/mockApi.js'
import { getPaymentTransactionsForSalesOrder } from '../../src/services/mockPaymentStore.js'
import { getLedgerForSupplier } from '../../src/services/mockSupplierLedgerStore.js'

describe('formatCurrencyTRY', () => {
  it('Türkçe binlik ayırıcı kullanır', () => {
    expect(formatCurrencyTRY(173850)).toBe('173.850')
    expect(formatCurrencyTRY(100000)).toBe('100.000')
    expect(formatCurrencyTRY(1369500)).toBe('1.369.500')
  })
})

describe('postOrderPayment mail order', () => {
  beforeEach(() => {
    resetMockOrdersStore()
    saveAuthSession({
      token: 'test',
      user: {
        id: 'u-admin',
        fullName: 'Admin',
        email: 'admin@test.local',
        role: 'ADMIN',
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })
  })

  it('MAIL_ORDER — tahsilat + tedarikçi cari kaydı oluşturur', async () => {
    await postOrderPayment('S-24089', {
      amount: 15_000,
      method: PAYMENT_METHOD.MAIL_ORDER,
      mailOrderSupplierId: 'sup-abc',
      mailOrderCustomerId: 'Test Müşteri',
      note: 'POS çekim',
    })

    const txs = getPaymentTransactionsForSalesOrder('S-24089')
    const mo = txs.find((t) => t.kind === PAYMENT_TRANSACTION_KIND.MAIL_ORDER)
    expect(mo).toBeTruthy()
    expect(Number(mo?.amount?.amount)).toBe(15_000)
    expect(mo?.mailOrderSupplierId).toBe('sup-abc')
    expect(mo?.mailOrderSupplierName).toBe('ABC Mobilya')

    const ledger = getLedgerForSupplier('sup-abc')
    const entry = ledger.find((e) => e.entryType === SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER)
    expect(entry).toBeTruthy()
    expect(Number.parseFloat(String(entry?.creditAmount))).toBe(15_000)
  })

  it('MAIL_ORDER — tedarikçi olmadan reddeder', async () => {
    await expect(
      postOrderPayment('S-24089', { amount: 1000, method: PAYMENT_METHOD.MAIL_ORDER }),
    ).rejects.toThrow(/tedarikçi/i)
  })
})
