import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { PRODUCT_STOCK_TYPE } from '../src/constants/productStockTypes.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('products integration', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let productId = ''
  let supplierId = ''

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
    const supRes = await app.inject({
      method: 'POST',
      url: '/v1/suppliers',
      payload: { companyName: 'Ürün Test Tedarik' },
    })
    supplierId = (supRes.json() as { id: string }).id
  })

  afterAll(async () => {
    if (productId) {
      await prisma.product.delete({ where: { id: productId } }).catch(() => undefined)
    }
    if (supplierId) {
      await prisma.supplierLedgerEntry.deleteMany({ where: { supplierId } })
      await prisma.supplier.delete({ where: { id: supplierId } }).catch(() => undefined)
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('POST product → GET list → duplicate', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/products',
      payload: {
        productCode: `TST-${Date.now()}`,
        productName: 'Test Koltuk 3+1',
        category: 'Oturma grubu',
        suiteType: 'Takım',
        defaultSalePrice: 45000,
        minSalePrice: 40000,
        purchasePrice: 28000,
        defaultSupplierId: supplierId,
        deliveryDays: 21,
        stockType: PRODUCT_STOCK_TYPE.ORDER,
        salesSourceType: 'IN_STORE_DISPLAY',
        displayFloor: 'GROUND_FLOOR',
      },
    })
    expect(createRes.statusCode).toBe(201)
    const created = createRes.json() as { id: string; productName: string; isActive: boolean }
    productId = created.id
    expect(created.productName).toBe('Test Koltuk 3+1')
    expect(created.isActive).toBe(true)

    const listRes = await app.inject({
      method: 'GET',
      url: `/v1/products?q=${encodeURIComponent('Test Koltuk')}`,
    })
    expect(listRes.statusCode).toBe(200)
    const list = listRes.json() as { items: { id: string }[]; kpis: { activeCount: number } }
    expect(list.items.some((p) => p.id === productId)).toBe(true)
    expect(list.kpis.activeCount).toBeGreaterThan(0)

    const dupRes = await app.inject({
      method: 'POST',
      url: `/v1/products/${productId}/duplicate`,
    })
    expect(dupRes.statusCode).toBe(201)
    const dup = dupRes.json() as { id: string; isActive: boolean }
    expect(dup.isActive).toBe(false)
    await prisma.product.delete({ where: { id: dup.id } }).catch(() => undefined)
  })
})
