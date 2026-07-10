import { describe, expect, it } from 'vitest'
import {
  computeLineTotal,
  resolveCommerceTotals,
} from '../../src/domain/commerce/commerceFinance.js'
import { normalizeCreateOrderInput } from '../../src/domain/order/normalizeCreateOrder.js'
import { runWithMockApiTimers } from './_helpers/mockApiTimers.js'
import { createOrder, resetMockOrdersStore } from '../../src/services/mockApi.js'
import { authenticateTestAdmin } from './_helpers/testAuth.js'

describe('commerce finance (client)', () => {
  it('resolveCommerceTotals mirrors backend rule', () => {
    const t = resolveCommerceTotals({
      subtotalAmount: 13_000,
      paidAmount: 3000,
      discountFixedAmount: 1300,
    })
    expect(t.totalAmount).toBe(11_700)
    expect(t.remainingAmount).toBe(8700)
  })

  it('normalizeCreateOrderInput — iskontolu çok satırlı', () => {
    const n = normalizeCreateOrderInput({
      customerName: 'Test',
      paidAmount: 0,
      status: 'Bekleniyor',
      subtotalAmount: 13_000,
      discountPercent: 10,
      lines: [
        { title: 'A', quantity: 2, unitPrice: 5000, sortOrder: 0 },
        { title: 'B', quantity: 1, unitPrice: 3000, sortOrder: 1 },
      ],
    })
    expect(n.subtotalAmount).toBe(13_000)
    expect(n.discountAmount).toBe(1300)
    expect(n.totalAmount).toBe(11_700)
    expect(n.lines[0].lineTotal).toBe(10_000)
  })

  it('mock createOrder — partial payment updates remaining', async () => {
    resetMockOrdersStore()
    authenticateTestAdmin()
    const order = await runWithMockApiTimers(() =>
      createOrder({
        customerName: 'Tahsilat',
        paidAmount: 1000,
        status: 'Bekleniyor',
        lines: [{ title: 'X', quantity: 1, unitPrice: 5000, sortOrder: 0 }],
      }),
    )
    expect(order.totalAmount ?? order.amount).toBe(5000)
    expect(order.remainingAmount).toBe(4000)
    expect(order.paidAmount).toBe(1000)
  })
})
