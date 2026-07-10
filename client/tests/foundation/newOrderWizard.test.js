import { describe, expect, it } from 'vitest'
import {
  buildCustomerExtraNotesBlock,
  computeOrderTotals,
  emptyWizardForm,
  formatCustomerIdentityCompact,
  formatCustomerPhonesCompact,
  lineTotal,
  mapWizardToCreateOrderRequest,
  mapWizardToLegacyOrder,
  parseCustomerExtraFromNotes,
  validateWizardStep,
} from '../../src/features/orders/newOrderWizardModel.js'

describe('new order wizard model', () => {
  it('kalan bakiye hesaplar', () => {
    const form = emptyWizardForm()
    form.products = [
      {
        id: 'l1',
        name: 'Koltuk',
        group: 'Diğer',
        qty: '2',
        unitPrice: '50000',
        note: '',
      },
    ]
    form.kapora = '20000'
    const { total, kapora, remaining } = computeOrderTotals(form)
    expect(total).toBe(100_000)
    expect(kapora).toBe(20_000)
    expect(remaining).toBe(80_000)
  })

  it('adım validasyonu — müşteri zorunlu', () => {
    const form = emptyWizardForm()
    form.customer = ''
    expect(validateWizardStep(0, form).ok).toBe(false)
    form.customer = 'Ali Veli'
    expect(validateWizardStep(0, form).ok).toBe(true)
  })

  it('adım validasyonu — ürün ve fiyat', () => {
    const form = emptyWizardForm()
    form.customer = 'Test'
    form.products = [{ id: 'l1', name: 'Masa', group: 'Diğer', qty: '1', unitPrice: '1000', note: '' }]
    expect(validateWizardStep(1, form).ok).toBe(true)
    expect(lineTotal(form.products[0])).toBe(1000)
  })

  it('müşteri ek alanları opsiyonel — TC doğrulama', () => {
    const form = emptyWizardForm()
    form.customer = 'Test'
    form.nationalId = '123'
    expect(validateWizardStep(0, form).ok).toBe(false)
    form.nationalId = '12345678901'
    expect(validateWizardStep(0, form).ok).toBe(true)
  })

  it('müşteri ek bilgisi notlara ve mock alanlarına yazılır', () => {
    const form = emptyWizardForm()
    form.customer = 'Kurumsal A.Ş.'
    form.phone = '05321112233'
    form.phoneDialCode = '+90'
    form.phone2 = '02124445566'
    form.taxNumber = '1234567890'
    form.taxOffice = 'Kadıköy'
    form.products = [{ id: 'l1', name: 'Masa', group: 'Diğer', qty: '1', unitPrice: '1000', note: '' }]
    form.dueDate = '2026-07-01'

    const block = buildCustomerExtraNotesBlock(form)
    expect(block).toContain('Vergi no: 1234567890')
    expect(parseCustomerExtraFromNotes(block).taxOffice).toBe('Kadıköy')

    const legacy = mapWizardToLegacyOrder(form)
    expect(legacy.phone).toBe('+905321112233')
    expect(legacy.phone2).toBe('02124445566')
    expect(legacy.taxNumber).toBe('1234567890')
    expect(legacy.notes).toContain('Vergi dairesi: Kadıköy')

    const api = mapWizardToCreateOrderRequest(form)
    expect(api.phone).toBe('+905321112233')
    expect(api.phone2).toBe('02124445566')
    expect(api.notes).toContain('--- Müşteri ek ---')
  })

  it('operasyon kartı telefon ve kimlik özeti', () => {
    const order = {
      phone: '0532 000 00 00',
      phone2: '0212 111 11 11',
      nationalId: '12345678901',
    }
    expect(formatCustomerPhonesCompact(order)).toContain('0532')
    expect(formatCustomerPhonesCompact(order)).toContain('0212')
    expect(formatCustomerIdentityCompact(order)).toBe('TC 12345678901')
  })

  it('legacy ve API draft üretir', () => {
    const form = emptyWizardForm()
    form.customer = 'Müşteri A'
    form.products = [{ id: 'l1', name: 'Yatak', group: 'Diğer', qty: '1', unitPrice: '80000', note: '' }]
    form.dueDate = '2026-07-01'
    form.kapora = '10000'

    const legacy = mapWizardToLegacyOrder(form)
    expect(legacy.amount).toBe(80_000)
    expect(legacy.customer).toBe('Müşteri A')

    const api = mapWizardToCreateOrderRequest(form)
    expect(api.totalAmount).toBe(80_000)
    expect(api.paidAmount).toBe(10_000)
  })
})
