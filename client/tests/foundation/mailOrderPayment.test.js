import { describe, expect, it } from 'vitest'
import {
  applyPaymentMethodChange,
  buildMailOrderCustomerOptions,
  computeOrderTotals,
  emptyWizardForm,
  isMailOrderPayment,
  mapWizardToCreateOrderRequest,
  resolveMailOrderCollectionAmount,
  validateWizardStep,
} from '../../src/features/orders/newOrderWizardModel.js'
import { PAYMENT_METHOD } from '../../src/contracts/v1/enums.js'
import { createOrder, resetMockOrdersStore } from '../../src/services/mockApi.js'
import { authenticateTestAdmin } from './_helpers/testAuth.js'
import { getPaymentTransactionsForSalesOrder } from '../../src/services/mockPaymentStore.js'
import { getLedgerForSupplier } from '../../src/services/mockSupplierLedgerStore.js'
import { PAYMENT_TRANSACTION_KIND } from '../../src/contracts/v1/enums.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../../src/contracts/v1/supplierLedgerEntryTypes.js'

describe('mail order payment', () => {
  it('mail order tutarı otomatik doldurulmaz', () => {
    const form = emptyWizardForm()
    form.products = [
      { id: 'l1', name: 'Koltuk', group: 'Diğer', qty: '1', unitPrice: '100000', note: '' },
    ]
    form.discountPercent = '10'
    const next = applyPaymentMethodChange(form, PAYMENT_METHOD.MAIL_ORDER)
    expect(isMailOrderPayment(next.paymentMethod)).toBe(true)
    expect(next.mailOrderAmount).toBe('')
    expect(next.kapora).toBe('')
  })

  it('boş mail order tutarında kayıt genel toplamı kullanır', () => {
    const form = emptyWizardForm()
    form.customer = 'Test'
    form.products = [{ id: 'l1', name: 'Masa', group: 'Diğer', qty: '1', unitPrice: '120000', note: '' }]
    form.dueDate = '2026-08-01'
    Object.assign(form, applyPaymentMethodChange(form, PAYMENT_METHOD.MAIL_ORDER))
    form.mailOrderCustomerId = 'Ali'
    form.mailOrderSupplierId = 'sup-abc'

    const { grandTotal } = computeOrderTotals(form)
    expect(resolveMailOrderCollectionAmount(form, grandTotal)).toBe(120_000)

    const api = mapWizardToCreateOrderRequest(form)
    expect(api.paidAmount).toBe(120_000)
    expect(api.totalAmount).toBe(120_000)
  })

  it('kısmi tahsilat — finans özeti ve API', () => {
    const form = emptyWizardForm()
    form.customer = 'Test'
    form.products = [{ id: 'l1', name: 'Masa', group: 'Diğer', qty: '1', unitPrice: '120000', note: '' }]
    form.dueDate = '2026-08-01'
    form.paymentMethod = PAYMENT_METHOD.MAIL_ORDER
    form.mailOrderCustomerId = 'Ali'
    form.mailOrderSupplierId = 'sup-abc'
    form.mailOrderAmount = '40000'

    const totals = computeOrderTotals(form)
    expect(totals.kapora).toBe(40_000)
    expect(totals.remaining).toBe(80_000)

    const api = mapWizardToCreateOrderRequest(form)
    expect(api.paidAmount).toBe(40_000)
    expect(api.mailOrderAmount).toBe(40_000)
  })

  it('mail order validasyonu — müşteri ve tedarikçi zorunlu', () => {
    const form = emptyWizardForm()
    form.customer = 'Sipariş Müşteri'
    form.products = [{ id: 'l1', name: 'Masa', group: 'Diğer', qty: '1', unitPrice: '5000', note: '' }]
    form.dueDate = '2026-08-01'
    Object.assign(form, applyPaymentMethodChange(form, PAYMENT_METHOD.MAIL_ORDER))
    expect(validateWizardStep(2, form).ok).toBe(false)
    form.mailOrderCustomerId = 'Ayşe Kaya'
    expect(validateWizardStep(2, form).ok).toBe(false)
    form.mailOrderSupplierId = 'sup-abc'
    expect(validateWizardStep(2, form).ok).toBe(true)
  })

  it('müşteri kartı seçenekleri — sipariş müşterisi + son müşteriler', () => {
    const opts = buildMailOrderCustomerOptions(['Ahmet Yılmaz', 'Ayşe Kaya'], 'Sipariş Müşteri')
    expect(opts.map((o) => o.label)).toContain('Ahmet Yılmaz')
    expect(opts.map((o) => o.label)).toContain('Sipariş Müşteri')
  })

  it('mock kayıt — kısmi tutar tedarikçi cariye yansır', async () => {
    resetMockOrdersStore()
    authenticateTestAdmin()
    const total = 120_000
    const partial = 40_000

    const created = await createOrder({
      customerName: 'Mail Order Test',
      productTitle: 'X',
      totalAmount: total,
      paidAmount: partial,
      status: 'Bekleniyor',
      paymentMethod: PAYMENT_METHOD.MAIL_ORDER,
      mailOrderCustomerId: 'Ahmet Yılmaz',
      mailOrderSupplierId: 'sup-abc',
      mailOrderAmount: partial,
      lines: [{ title: 'X', quantity: 1, unitPrice: total, sortOrder: 0 }],
    })

    expect(created.paidAmount).toBe(partial)
    expect(created.amount).toBe(total)

    const txs = getPaymentTransactionsForSalesOrder(created.id)
    const mo = txs.find((t) => t.kind === PAYMENT_TRANSACTION_KIND.MAIL_ORDER)
    expect(mo).toBeTruthy()
    expect(Number.parseFloat(mo.amount.amount)).toBe(partial)

    const ledger = getLedgerForSupplier('sup-abc')
    const entry = ledger.find((e) => e.entryType === SUPPLIER_LEDGER_ENTRY_TYPE.MAIL_ORDER)
    expect(entry).toBeTruthy()
    expect(Number.parseFloat(entry.creditAmount)).toBe(partial)
  })

  it('normal ödeme — mail order alanları gönderilmez', () => {
    const form = emptyWizardForm()
    form.customer = 'Normal'
    form.products = [{ id: 'l1', name: 'Masa', group: 'Diğer', qty: '1', unitPrice: '1000', note: '' }]
    form.dueDate = '2026-08-01'
    form.kapora = '500'
    const api = mapWizardToCreateOrderRequest(form)
    expect(api.paymentMethod).toBe(PAYMENT_METHOD.TRANSFER)
    expect(api.mailOrderSupplierId).toBeUndefined()
    expect(api.paidAmount).toBe(500)
    const { remaining } = computeOrderTotals(form)
    expect(remaining).toBe(500)
  })
})
