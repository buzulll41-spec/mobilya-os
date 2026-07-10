import { describe, expect, it, beforeEach } from 'vitest'
import { PAYMENT_METHOD, PAYMENT_TRANSACTION_KIND } from '../../src/contracts/v1/enums.js'
import { buildOrderPanelPaymentRows } from '../../src/mappers/order/orderPanelPaymentsModel.js'
import { orderHasMailOrderPayment } from '../../src/mappers/collection/collectionCommandCenterModel.js'
import { saveAuthSession } from '../../src/services/authSessionStore.js'
import { resetMockOrdersStore, postOrderPayment } from '../../src/services/mockApi.js'
import { getPaymentTransactionsForSalesOrder } from '../../src/services/mockPaymentStore.js'
import { findSupplierById } from '../../src/services/mockSupplierStore.js'

describe('mail order supplier on payment record', () => {
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

  it('ödeme kaydına tedarikçi adı yazılır', async () => {
    const supplier = findSupplierById('sup-abc')
    expect(supplier).toBeTruthy()

    await postOrderPayment('S-24089', {
      amount: 15_000,
      method: PAYMENT_METHOD.MAIL_ORDER,
      mailOrderSupplierId: supplier.id,
      note: 'POS çekim',
    })

    const txs = getPaymentTransactionsForSalesOrder('S-24089')
    const mo = txs.find((t) => t.kind === PAYMENT_TRANSACTION_KIND.MAIL_ORDER)
    expect(mo?.mailOrderSupplierId).toBe(supplier.id)
    expect(mo?.mailOrderSupplierName).toBe(supplier.companyName)

    const rows = buildOrderPanelPaymentRows(txs, [])
    const row = rows.find((r) => r.id === mo?.id)
    expect(row?.supplierLabel).toBe(supplier.companyName)
    expect(row?.methodLabel).toBe('Mail order')
  })

  it('mail order tedarikçi filtresi siparişi eşleştirir', async () => {
    const supplier = findSupplierById('sup-abc')
    await postOrderPayment('S-24089', {
      amount: 5_000,
      method: PAYMENT_METHOD.MAIL_ORDER,
      mailOrderSupplierId: supplier.id,
    })

    expect(orderHasMailOrderPayment('S-24089', supplier.id)).toBe(true)
    expect(orderHasMailOrderPayment('S-24089', 'sup-delta')).toBe(false)
    expect(orderHasMailOrderPayment('S-24105')).toBe(false)
  })
})
