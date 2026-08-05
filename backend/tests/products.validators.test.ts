import { describe, expect, it } from 'vitest'
import { assertValidCreateProductRequest } from '../src/services/createProduct.js'
import { PRODUCT_STOCK_TYPE } from '../src/constants/productStockTypes.js'

describe('product validators', () => {
  it('geçerli ürün kartı (mağaza sergi + kat)', () => {
    const body = assertValidCreateProductRequest({
      productCode: 'PRD-999',
      productName: 'Test Ürün',
      category: 'Oturma grubu',
      defaultSalePrice: 10000,
      minSalePrice: 9000,
      purchasePrice: 6000,
      stockType: PRODUCT_STOCK_TYPE.ORDER,
      salesSourceType: 'IN_STORE_DISPLAY',
      displayFloor: 'GROUND_FLOOR',
    })
    expect(body.productCode).toBe('PRD-999')
    expect(body.deliveryDays).toBe(14)
    expect(body.salesSourceType).toBe('IN_STORE_DISPLAY')
    expect(body.displayFloor).toBe('GROUND_FLOOR')
    expect(body.externalSupplyType).toBeNull()
    expect(body.physicalLocation).toBeNull()
  })

  it('stok ürünü alt alan istemez, fiziksel lokasyon bağımsız korunur', () => {
    const body = assertValidCreateProductRequest({
      productCode: 'PRD-STK',
      productName: 'Stok Ürünü',
      category: 'Diğer',
      defaultSalePrice: 5000,
      minSalePrice: 4000,
      purchasePrice: 3000,
      stockType: PRODUCT_STOCK_TYPE.STOCK,
      salesSourceType: 'STOCK_ITEM',
      physicalLocation: 'WAREHOUSE_FLOOR',
    })
    expect(body.salesSourceType).toBe('STOCK_ITEM')
    expect(body.displayFloor).toBeNull()
    expect(body.externalSupplyType).toBeNull()
    expect(body.physicalLocation).toBe('WAREHOUSE_FLOOR')
  })

  it('kaynak tipi olmadan reddeder', () => {
    expect(() =>
      assertValidCreateProductRequest({
        productCode: 'PRD-NS',
        productName: 'Kaynaksız',
        category: 'Diğer',
        defaultSalePrice: 10,
        minSalePrice: 10,
        purchasePrice: 5,
        stockType: PRODUCT_STOCK_TYPE.ORDER,
      }),
    ).toThrow(/Validation/)
  })

  it('depo (WAREHOUSE) artık geçerli satış kaynağı değildir', () => {
    expect(() =>
      assertValidCreateProductRequest({
        productCode: 'PRD-WH',
        productName: 'Depo Kaynak',
        category: 'Diğer',
        defaultSalePrice: 10,
        minSalePrice: 10,
        purchasePrice: 5,
        stockType: PRODUCT_STOCK_TYPE.STOCK,
        salesSourceType: 'WAREHOUSE',
      }),
    ).toThrow(/Validation/)
  })

  it('mağaza sergi ürünü sergi katı olmadan reddeder', () => {
    expect(() =>
      assertValidCreateProductRequest({
        productCode: 'PRD-NL',
        productName: 'Katsız Sergi',
        category: 'Diğer',
        defaultSalePrice: 10,
        minSalePrice: 10,
        purchasePrice: 5,
        stockType: PRODUCT_STOCK_TYPE.ORDER,
        salesSourceType: 'IN_STORE_DISPLAY',
      }),
    ).toThrow(/Validation/)
  })

  it('dış tedarik ürünü tip olmadan reddeder', () => {
    expect(() =>
      assertValidCreateProductRequest({
        productCode: 'PRD-EXT',
        productName: 'Dış Tedarik',
        category: 'Diğer',
        defaultSalePrice: 10,
        minSalePrice: 10,
        purchasePrice: 5,
        stockType: PRODUCT_STOCK_TYPE.ORDER,
        salesSourceType: 'EXTERNAL_SUPPLY',
      }),
    ).toThrow(/Validation/)
  })

  it('geçersiz fiziksel lokasyon reddeder', () => {
    expect(() =>
      assertValidCreateProductRequest({
        productCode: 'PRD-PL',
        productName: 'Geçersiz Lokasyon',
        category: 'Diğer',
        defaultSalePrice: 10,
        minSalePrice: 10,
        purchasePrice: 5,
        stockType: PRODUCT_STOCK_TYPE.STOCK,
        salesSourceType: 'STOCK_ITEM',
        physicalLocation: 'MARS',
      }),
    ).toThrow(/Validation/)
  })

  it('eksik kod reddeder', () => {
    expect(() =>
      assertValidCreateProductRequest({
        productCode: '',
        productName: 'X',
        category: 'Diğer',
        defaultSalePrice: 1,
        minSalePrice: 1,
        purchasePrice: 1,
        stockType: PRODUCT_STOCK_TYPE.STOCK,
        salesSourceType: 'STOCK_ITEM',
      }),
    ).toThrow(/Validation/)
  })
})
