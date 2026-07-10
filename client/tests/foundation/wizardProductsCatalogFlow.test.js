import { describe, expect, it } from 'vitest'
import { shouldAutoOpenProductsCatalog } from '../../src/features/orders/wizardProductsCatalogFlow.js'
import {
  emptyWizardForm,
  hasWizardProducts,
  validateWizardStep,
} from '../../src/features/orders/newOrderWizardModel.js'
import { mergeCatalogIntoWizardProducts } from '../../src/features/products/catalogPicker/catalogPickerModel.js'

describe('wizardProductsCatalogFlow', () => {
  it('shouldAutoOpenProductsCatalog — boş adımda aç', () => {
    expect(shouldAutoOpenProductsCatalog({ hasProducts: false, userDismissed: false })).toBe(true)
  })

  it('shouldAutoOpenProductsCatalog — ürün varken veya kapatıldıysa açma', () => {
    expect(shouldAutoOpenProductsCatalog({ hasProducts: true, userDismissed: false })).toBe(false)
    expect(shouldAutoOpenProductsCatalog({ hasProducts: false, userDismissed: true })).toBe(false)
    expect(shouldAutoOpenProductsCatalog({ locked: true, hasProducts: false, userDismissed: false })).toBe(
      false,
    )
  })

  it('katalog onayı sonrası ürün listesi ve validasyon', () => {
    const form = emptyWizardForm()
    form.customer = 'Test Müşteri'
    const picked = [
      {
        id: 'p1',
        productCode: 'A-1',
        productName: 'Koltuk',
        category: 'Oturma grubu',
        suiteType: null,
        defaultSalePrice: '25000',
        purchasePrice: '15000',
        defaultSupplierId: null,
        defaultSupplierName: 'Tedarikçi A',
        minSalePrice: '20000',
        deliveryDays: 7,
        isActive: true,
        stockType: 'ORDER',
        stockTypeLabel: 'Sipariş',
        marginRatio: 0.4,
        isLowMargin: false,
        createdAt: '',
      },
    ]
    form.products = mergeCatalogIntoWizardProducts(form.products, picked, null)
    // Oturma grubu → fabric profili; katalog satırı boş konfig ile gelir, zorunlu alan testte tamamlanır
    form.products[0].configuration = {
      ...form.products[0].configuration,
      fabricBrand: 'Test Kumaş',
    }
    expect(hasWizardProducts(form)).toBe(true)
    const step1 = validateWizardStep(1, form)
    expect(step1.ok, step1.message).toBe(true)
  })
})
