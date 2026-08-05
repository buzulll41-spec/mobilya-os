import { describe, expect, it, beforeEach } from 'vitest'
import { CATALOG_NAV_CATEGORIES, CATALOG_PICKER_PAGE_SIZE } from '../../src/constants/productCatalog.js'
import {
  buildCatalogPageNumbers,
  CATALOG_PICKER_WIZARD_CONFIRM_LABEL,
  computeCatalogSelectionTotal,
  createWizardLineFromProduct,
  emptyCatalogPickerQuery,
  filtersToListQuery,
  formatCatalogPageRange,
  isCatalogPickerConfirmEnabled,
  mergeCatalogIntoWizardProducts,
  toggleCatalogSelection,
} from '../../src/features/products/catalogPicker/catalogPickerModel.js'
import { filterProductCatalogItems } from '../../src/mappers/products/productCatalogModel.js'
import { resetMockProductStore } from '../../src/services/mockProductStore.js'
import { mockListProducts } from '../../src/services/mockProductsApi.js'

describe('catalogPicker model', () => {
  it('filtersToListQuery — 20/sayfa', () => {
    const q = filtersToListQuery(
      { q: 'mayer', category: 'Oturma grubu' },
      2,
      CATALOG_PICKER_PAGE_SIZE,
    )
    expect(q.pageSize).toBe(20)
    expect(q.page).toBe(2)
    expect(q.category).toBe('Oturma grubu')
  })

  it('formatCatalogPageRange ve sayfa numaraları', () => {
    expect(formatCatalogPageRange(1, 20, 51)).toBe('1 - 20 / 51 ürün')
    expect(formatCatalogPageRange(3, 20, 51)).toBe('41 - 51 / 51 ürün')
    expect(buildCatalogPageNumbers(2, 5)).toEqual([1, 2, 3, 4, 5])
    expect(buildCatalogPageNumbers(5, 10)).toContain(5)
  })

  it('computeCatalogSelectionTotal', () => {
    const total = computeCatalogSelectionTotal([
      { defaultSalePrice: '10000.00' },
      { defaultSalePrice: '25000.00' },
    ])
    expect(total).toBe(35_000)
  })

  it('toggleCatalogSelection — seçim ve kaldırma', () => {
    const p1 = { id: 'p1', productName: 'A' }
    const p2 = { id: 'p2', productName: 'B' }
    const one = toggleCatalogSelection([], p1)
    expect(one).toHaveLength(1)
    expect(isCatalogPickerConfirmEnabled(one.length)).toBe(true)

    const two = toggleCatalogSelection(one, p2)
    expect(two).toHaveLength(2)
    expect(computeCatalogSelectionTotal(two.map((p, i) => ({
      defaultSalePrice: i === 0 ? '40000' : '50000',
      ...p,
    })))).toBe(90_000)

    const back = toggleCatalogSelection(two, p1)
    expect(back).toHaveLength(1)
    expect(back[0].id).toBe('p2')
  })

  it('isCatalogPickerConfirmEnabled — 0 pasif, 1+ aktif', () => {
    expect(isCatalogPickerConfirmEnabled(0)).toBe(false)
    expect(isCatalogPickerConfirmEnabled(1)).toBe(true)
    expect(isCatalogPickerConfirmEnabled(3)).toBe(true)
    expect(CATALOG_PICKER_WIZARD_CONFIRM_LABEL).toBe('Seçilenleri Siparişe Ekle')
  })

  it('createWizardLineFromProduct — sipariş satırı alanları', () => {
    const line = createWizardLineFromProduct({
      id: 'p1',
      productCode: 'PRD-MAYER-001',
      productName: 'MAYER KÖŞE',
      category: 'Oturma grubu',
      suiteType: 'Takım',
      defaultSalePrice: '89000.00',
      purchasePrice: '52000.00',
      defaultSupplierId: 'sup-1',
      defaultSupplierName: 'Mayer',
      minSalePrice: '80000',
      deliveryDays: 14,
      isActive: true,
      stockType: 'ORDER',
      stockTypeLabel: 'Sipariş',
      marginRatio: 0.4,
      isLowMargin: false,
      createdAt: '',
    })
    expect(line.productId).toBe('p1')
    expect(line.productCode).toBe('PRD-MAYER-001')
    expect(line.purchasePrice).toBe('52000')
  })

  it('mergeCatalogIntoWizardProducts — çoklu satır', () => {
    const base = [{ id: 'l1', name: '', group: 'Diğer', qty: '1', unitPrice: '', note: '' }]
    const products = [
      {
        id: 'p1',
        productCode: 'A',
        productName: 'Ürün 1',
        category: 'Sehpa',
        suiteType: 'Tekil',
        defaultSalePrice: '5000',
        purchasePrice: '3000',
        defaultSupplierId: null,
        defaultSupplierName: null,
        minSalePrice: '4500',
        deliveryDays: 7,
        isActive: true,
        stockType: 'ORDER',
        stockTypeLabel: 'Sipariş',
        marginRatio: 0.4,
        isLowMargin: false,
        createdAt: '',
      },
      {
        id: 'p2',
        productCode: 'B',
        productName: 'Ürün 2',
        category: 'Oturma grubu',
        suiteType: 'Takım',
        defaultSalePrice: '8000',
        purchasePrice: '5000',
        defaultSupplierId: null,
        defaultSupplierName: null,
        minSalePrice: '7000',
        deliveryDays: 7,
        isActive: true,
        stockType: 'ORDER',
        stockTypeLabel: 'Sipariş',
        marginRatio: 0.4,
        isLowMargin: false,
        createdAt: '',
      },
    ]
    const merged = mergeCatalogIntoWizardProducts(base, products, 'l1')
    expect(merged).toHaveLength(2)
    expect(merged[0].productId).toBe('p1')
    expect(merged[1].productId).toBe('p2')
  })

  it('mergeCatalogIntoWizardProducts — toplu seçim boş satırları doldurur', () => {
    const base = [{ id: 'l1', name: '', group: 'Diğer', qty: '1', unitPrice: '', note: '' }]
    const products = [
      {
        id: 'p1',
        productCode: 'A',
        productName: 'Ürün 1',
        category: 'Sehpa',
        suiteType: 'Tekil',
        defaultSalePrice: '40000',
        purchasePrice: '3000',
        defaultSupplierId: null,
        defaultSupplierName: null,
        minSalePrice: '4500',
        deliveryDays: 7,
        isActive: true,
        stockType: 'ORDER',
        stockTypeLabel: 'Sipariş',
        marginRatio: 0.4,
        isLowMargin: false,
        createdAt: '',
      },
      {
        id: 'p2',
        productCode: 'B',
        productName: 'Ürün 2',
        category: 'Oturma grubu',
        suiteType: 'Takım',
        defaultSalePrice: '35000',
        purchasePrice: '5000',
        defaultSupplierId: null,
        defaultSupplierName: null,
        minSalePrice: '7000',
        deliveryDays: 7,
        isActive: true,
        stockType: 'ORDER',
        stockTypeLabel: 'Sipariş',
        marginRatio: 0.4,
        isLowMargin: false,
        createdAt: '',
      },
      {
        id: 'p3',
        productCode: 'C',
        productName: 'Ürün 3',
        category: 'Yatak odası',
        suiteType: 'Tekil',
        defaultSalePrice: '42500',
        purchasePrice: '5000',
        defaultSupplierId: null,
        defaultSupplierName: null,
        minSalePrice: '7000',
        deliveryDays: 7,
        isActive: true,
        stockType: 'ORDER',
        stockTypeLabel: 'Sipariş',
        marginRatio: 0.4,
        isLowMargin: false,
        createdAt: '',
      },
    ]
    const merged = mergeCatalogIntoWizardProducts(base, products, null)
    expect(merged).toHaveLength(3)
    expect(merged.every((l) => l.productId && l.name.trim())).toBe(true)
    expect(merged.map((l) => l.productId)).toEqual(['p1', 'p2', 'p3'])
    expect(computeCatalogSelectionTotal(products)).toBe(117_500)
  })

  it('sihirbaz onConfirm akışı — seçilenler satırlara, modal kapanır simülasyonu', () => {
    const ui = { modalOpen: true }
    let formProducts = [{ id: 'l1', name: '', group: 'Diğer', qty: '1', unitPrice: '', note: '' }]
    const picked = [
      {
        id: 'p1',
        productCode: 'A',
        productName: 'Tek ürün',
        category: 'Sehpa',
        suiteType: null,
        defaultSalePrice: '12000',
        purchasePrice: '8000',
        defaultSupplierId: null,
        defaultSupplierName: null,
        minSalePrice: '10000',
        deliveryDays: 7,
        isActive: true,
        stockType: 'ORDER',
        stockTypeLabel: 'Sipariş',
        marginRatio: 0.4,
        isLowMargin: false,
        createdAt: '',
      },
    ]

    expect(isCatalogPickerConfirmEnabled(picked.length)).toBe(true)
    formProducts = mergeCatalogIntoWizardProducts(formProducts, picked, null)
    ui.modalOpen = false

    expect(ui.modalOpen).toBe(false)
    expect(formProducts).toHaveLength(1)
    expect(formProducts[0].productId).toBe('p1')
    expect(formProducts[0].name).toBe('Tek ürün')
  })

  it('CATALOG_NAV_CATEGORIES — tümü + 8 kategori', () => {
    expect(CATALOG_NAV_CATEGORIES[0].label).toBe('Tümü')
    expect(CATALOG_NAV_CATEGORIES.length).toBeGreaterThanOrEqual(9)
  })
})

describe('catalogPicker mock api', () => {
  beforeEach(() => {
    resetMockProductStore()
  })

  it('50+ ürün ve sayfalama 20', async () => {
    const page1 = await mockListProducts({ page: 1, pageSize: 20, activeOnly: true })
    expect(page1.items).toHaveLength(20)
    expect(page1.total).toBeGreaterThanOrEqual(50)

    const page2 = await mockListProducts({ page: 2, pageSize: 20, activeOnly: true })
    expect(page2.items.length).toBeGreaterThan(0)
  })

  it('kategori tıklanınca liste değişir', async () => {
    const oturma = await mockListProducts({ category: 'Oturma grubu', pageSize: 100 })
    const sehpa = await mockListProducts({ category: 'Sehpa', pageSize: 100 })
    expect(oturma.items.every((p) => p.category === 'Oturma grubu')).toBe(true)
    expect(sehpa.items.every((p) => p.category === 'Sehpa')).toBe(true)
    expect(oturma.total).not.toBe(sehpa.total)
  })

  it('arama — ad ve tedarikçi', async () => {
    const byName = await mockListProducts({ q: 'Zen', pageSize: 100 })
    expect(byName.items.some((p) => p.productName.includes('Zen'))).toBe(true)

    const items = filterProductCatalogItems(
      [
        {
          id: '1',
          productCode: 'X',
          productName: 'Test',
          category: 'Diğer',
          suiteType: null,
          defaultSalePrice: '1000',
          minSalePrice: '900',
          purchasePrice: '500',
          defaultSupplierId: 's1',
          defaultSupplierName: 'Özel Tedarik A.Ş.',
          deliveryDays: 7,
          isActive: true,
          stockType: 'ORDER',
          stockTypeLabel: 'Sipariş',
          marginRatio: 0.5,
          isLowMargin: false,
          createdAt: '',
        },
      ],
      'Özel Tedarik',
      { activeOnly: true },
    )
    expect(items).toHaveLength(1)
  })

  it('emptyCatalogPickerQuery varsayılanı', () => {
    expect(emptyCatalogPickerQuery()).toEqual({ q: '', category: '' })
  })
})
