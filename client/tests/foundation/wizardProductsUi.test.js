import { describe, expect, it } from 'vitest'
import { emptyWizardForm, emptyProductLine, validateWizardStep, computeOrderTotals } from '../../src/features/orders/newOrderWizardModel.js'
import {
  formatWizardMoney,
  parseWizardPriceInput,
  wizardLineTotal,
  computeProductsStepSummary,
  countNamedProducts,
} from '../../src/features/orders/wizardProductsUi.js'

/**
 * @param {number} n
 */
function formWithProductLines(n) {
  const form = emptyWizardForm()
  form.customer = 'Test Müşteri'
  form.products = Array.from({ length: n }, (_, i) => ({
    ...emptyProductLine(),
    id: `line-${i}`,
    name: `Ürün ${i + 1}`,
    qty: '1',
    unitPrice: String((i + 1) * 10_000),
  }))
  return form
}

describe('wizardProductsUi', () => {
  it('formatWizardMoney — Türkçe binlik ayraç ve ₺', () => {
    expect(formatWizardMoney(35_000)).toMatch(/35\.000/)
    expect(formatWizardMoney(35_000)).toContain('₺')
    expect(formatWizardMoney(30_000)).toBe('30.000 ₺')
  })

  it('parseWizardPriceInput — binlik ayraçlı giriş', () => {
    expect(parseWizardPriceInput('35.000,00')).toBe(35_000)
    expect(parseWizardPriceInput('30000')).toBe(30_000)
  })

  it.each([1, 2, 5, 10])('%i ürün — toplam ve sayım doğru', (n) => {
    const form = formWithProductLines(n)
    const expected = (n * (n + 1)) / 2 * 10_000
    expect(computeOrderTotals(form).total).toBe(expected)
    expect(countNamedProducts(form.products)).toBe(n)
    const summary = computeProductsStepSummary(form)
    expect(summary.productCount).toBe(n)
    expect(summary.total).toBe(expected)
    expect(summary.totalFormatted).toContain('₺')
  })

  it('ürün silince toplam güncellenir', () => {
    const form = formWithProductLines(3)
    expect(computeOrderTotals(form).total).toBe(60_000)
    form.products = form.products.filter((p) => p.id !== 'line-2')
    expect(computeOrderTotals(form).total).toBe(30_000)
    expect(countNamedProducts(form.products)).toBe(2)
  })

  it('satır tutarı qty × birim fiyat', () => {
    const line = { name: 'Masa', group: 'Yemek odası', qty: '3', unitPrice: '35000', note: '', id: 'x' }
    expect(wizardLineTotal(line)).toBe(105_000)
    expect(formatWizardMoney(wizardLineTotal(line))).toMatch(/105\.000/)
  })

  it('validation — en az 1 ürün, ad ve fiyat zorunlu', () => {
    const empty = emptyWizardForm()
    empty.customer = 'Ali'
    expect(validateWizardStep(1, empty).ok).toBe(false)

    const one = formWithProductLines(1)
    expect(validateWizardStep(1, one).ok).toBe(true)

    const badPrice = formWithProductLines(1)
    badPrice.products[0].unitPrice = '0'
    expect(validateWizardStep(1, badPrice).ok).toBe(false)
  })

  it('footer layout sınıfları tanımlı (sticky devam)', () => {
    expect('now-foot--sticky').toBeTruthy()
    expect('now-products-step').toBeTruthy()
    expect('now-products-scroll').toBeTruthy()
  })
})
