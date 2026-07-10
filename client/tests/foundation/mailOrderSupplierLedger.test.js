import { describe, expect, it, beforeEach } from 'vitest'
import { PAYMENT_METHOD, PAYMENT_TRANSACTION_KIND, PAYMENT_TRANSACTION_STATUS } from '../../src/contracts/v1/enums.js'
import { SUPPLIER_LEDGER_STATUS } from '../../src/contracts/v1/supplierLedgerStatuses.js'
import { saveAuthSession } from '../../src/services/authSessionStore.js'
import {
  resetMockOrdersStore,
  postOrderPayment,
  approveOrderPayment,
  rejectOrderPayment,
} from '../../src/services/mockApi.js'
import { getPaymentTransactionsForSalesOrder } from '../../src/services/mockPaymentStore.js'
import { getLedgerForSupplier } from '../../src/services/mockSupplierLedgerStore.js'
import { findSupplierById } from '../../src/services/mockSupplierStore.js'

describe('mail order supplier ledger approval flow', () => {
  beforeEach(() => {
    resetMockOrdersStore()
  })

  function loginAs(role) {
    saveAuthSession({
      token: `test-${role}`,
      user: {
        id: `u-${role}`,
        fullName: role,
        email: `${role}@test.local`,
        role,
        isActive: true,
        createdAt: '2026-01-01T00:00:00.000Z',
      },
    })
  }

  it('ops post → bakiye sabit + cari bekliyor; admin onay → cari onaylandı', async () => {
    loginAs('OPERATION')
    const supplier = findSupplierById('sup-abc')
    expect(supplier).toBeTruthy()

    const dtoAfterPost = await postOrderPayment('S-24089', {
      amount: 55_000,
      method: PAYMENT_METHOD.MAIL_ORDER,
      mailOrderSupplierId: supplier.id,
      mailOrderCustomerId: 'DÜNYA KUPASI Organizasyon',
    })
    expect(Number.parseFloat(dtoAfterPost.amountPaid.amount)).toBe(60_000)

    const pending = getPaymentTransactionsForSalesOrder('S-24089').find(
      (t) =>
        t.kind === PAYMENT_TRANSACTION_KIND.MAIL_ORDER &&
        t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL,
    )
    expect(pending).toBeTruthy()

    const ledgerPending = getLedgerForSupplier(supplier.id).find(
      (e) => e.paymentTransactionId === pending?.id,
    )
    expect(ledgerPending?.status).toBe(SUPPLIER_LEDGER_STATUS.PENDING)
    expect(ledgerPending?.description).toContain('DÜNYA KUPASI Organizasyon')
    expect(ledgerPending?.description).toContain('Mail Order')

    loginAs('ADMIN')
    const dtoApproved = await approveOrderPayment('S-24089', pending.id, { approvalNote: 'OK' })
    expect(Number.parseFloat(dtoApproved.amountPaid.amount)).toBe(115_000)

    const ledgerApproved = getLedgerForSupplier(supplier.id).find(
      (e) => e.paymentTransactionId === pending.id,
    )
    expect(ledgerApproved?.status).toBe(SUPPLIER_LEDGER_STATUS.APPROVED)
    expect(Number.parseFloat(ledgerApproved?.creditAmount ?? '0')).toBe(55_000)
  })

  it('mail order red → tedarikçi cari reddedildi', async () => {
    loginAs('OPERATION')
    const supplier = findSupplierById('sup-abc')

    await postOrderPayment('S-24089', {
      amount: 10_000,
      method: PAYMENT_METHOD.MAIL_ORDER,
      mailOrderSupplierId: supplier.id,
      mailOrderCustomerId: 'Test Müşteri',
    })

    const pending = getPaymentTransactionsForSalesOrder('S-24089').find(
      (t) => t.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL,
    )
    expect(pending).toBeTruthy()

    loginAs('ADMIN')
    await rejectOrderPayment('S-24089', pending.id, { rejectionNote: 'Geçersiz' })

    const ledger = getLedgerForSupplier(supplier.id).find(
      (e) => e.paymentTransactionId === pending.id,
    )
    expect(ledger?.status).toBe(SUPPLIER_LEDGER_STATUS.REJECTED)
  })
})
