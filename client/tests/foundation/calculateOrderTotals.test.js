import { describe, expect, it } from 'vitest'

import { calculateOrderTotals } from '../../src/features/orders/calculateOrderTotals.js'

import { emptyProductLine, emptyWizardForm, computeOrderTotals } from '../../src/features/orders/newOrderWizardModel.js'



describe('calculateOrderTotals', () => {

  it('örnek: %5 sonra 10.000 TL iskonto', () => {

    const form = emptyWizardForm()

    form.products = [
      {
        ...emptyProductLine(),
        name: 'Set',
        qty: '1',
        unitPrice: '127000',
      },
    ]

    const result = calculateOrderTotals({

      products: form.products,

      discountPercent: '5',

      discountFixed: '10000',

    })

    expect(result.subtotal).toBe(127_000)

    expect(result.percentageDiscountAmount).toBe(6_350)

    expect(result.fixedDiscountAmount).toBe(10_000)

    expect(result.totalDiscount).toBe(16_350)

    expect(result.grandTotal).toBe(110_650)

  })



  it('genel toplam negatif olmaz — TL iskonto ara toplamı aşamaz', () => {

    const form = emptyWizardForm()

    form.products = [{ ...emptyProductLine(), name: 'A', qty: '1', unitPrice: '50000' }]

    const result = calculateOrderTotals({

      products: form.products,

      discountPercent: '0',

      discountFixed: '999999',

    })

    expect(result.grandTotal).toBe(0)

    expect(result.fixedDiscountAmount).toBe(50_000)

  })



  it('computeOrderTotals — kapora kalan grandTotal üzerinden', () => {

    const form = emptyWizardForm()

    form.products = [{ ...emptyProductLine(), name: 'A', qty: '2', unitPrice: '50000' }]

    form.discountPercent = '10'

    form.kapora = '20000'

    const t = computeOrderTotals(form)

    expect(t.subtotal).toBe(100_000)

    expect(t.grandTotal).toBe(90_000)

    expect(t.remaining).toBe(70_000)

    expect(t.total).toBe(90_000)

  })

})


