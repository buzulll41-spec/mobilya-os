import { describe, expect, it } from 'vitest'
import {
  computeProductCatalogKpis,
  filterProductCatalogItems,
  paginateProductItems,
} from '../../src/mappers/products/productCatalogModel.js'
import { applyProductToWizardLine, mapWizardProductsToLines } from '../../src/features/orders/newOrderWizardModel.js'
import { mockListProducts } from '../../src/services/mockProductsApi.js'

describe('product catalog model', () => {
  const sample = [
    {
      id: 'p1',
      productCode: 'A1',
      productName: 'Koltuk',
      category: 'Oturma grubu',
      suiteType: 'Takım',
      defaultSalePrice: '10000.00',
      minSalePrice: '9000.00',
      purchasePrice: '5000.00',
      defaultSupplierId: null,
      defaultSupplierName: null,
      deliveryDays: 14,
      isActive: true,
      stockType: 'ORDER',
      stockTypeLabel: 'Sipariş',
      marginRatio: 0.5,
      isLowMargin: false,
      createdAt: '',
    },
    {
      id: 'p2',
      productCode: 'B2',
      productName: 'Eski',
      category: 'Diğer',
      suiteType: null,
      defaultSalePrice: '1000.00',
      minSalePrice: '900.00',
      purchasePrice: '950.00',
      defaultSupplierId: null,
      defaultSupplierName: null,
      deliveryDays: 7,
      isActive: false,
      stockType: 'STOCK',
      stockTypeLabel: 'Stok',
      marginRatio: 0.05,
      isLowMargin: true,
      createdAt: '',
    },
  ]

  it('filtreler aktif ürün ve arama', () => {
    const out = filterProductCatalogItems(sample, 'koltuk', { activeOnly: true })
    expect(out).toHaveLength(1)
    expect(out[0].id).toBe('p1')
  })

  it('KPI üretir', () => {
    const kpis = computeProductCatalogKpis(sample)
    expect(kpis.activeCount).toBe(1)
    expect(kpis.inactiveCount).toBe(1)
    expect(kpis.lowMarginCount).toBe(1)
  })

  it('sayfalama', () => {
    const page = paginateProductItems(sample, 1, 1)
    expect(page.items).toHaveLength(1)
    expect(page.total).toBe(2)
  })
})

describe('wizard product integration', () => {
  it('katalog seçimi satıra productId yazar', () => {
    const line = applyProductToWizardLine(
      { id: 'l1', name: '', group: 'Diğer', qty: '1', unitPrice: '', note: '' },
      {
        id: 'prod-1',
        productName: 'Zen Koltuk',
        category: 'Oturma grubu',
        defaultSalePrice: '42000.00',
      },
    )
    expect(line.productId).toBe('prod-1')
    expect(line.name).toBe('Zen Koltuk')
    const lines = mapWizardProductsToLines({
      products: [line],
      customer: '',
      phone: '',
      phone2: '',
      nationalId: '',
      taxNumber: '',
      taxOffice: '',
      city: '',
      district: '',
      neighborhood: '',
      address: '',
      customerNote: '',
      salesPerson: '',
      kapora: '',
      paymentMethod: 'TRANSFER',
      dueDate: '',
      status: 'Bekleniyor',
    })
    expect(lines[0].productId).toBe('prod-1')
    expect(lines[0].title).toBe('Zen Koltuk')
  })
})

describe('mock products api', () => {
  it('liste döner', async () => {
    const res = await mockListProducts({ page: 1, pageSize: 10 })
    expect(res.items.length).toBeGreaterThan(0)
    expect(res.kpis.activeCount).toBeGreaterThan(0)
  })
})
