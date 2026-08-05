import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('product variant CRUD', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let productId = ''
  let variantId = ''
  const variantCode = `VAR-${Date.now()}`

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    const product = await prisma.product.findUnique({
      where: { productCode: 'PRD-ATLAS-001' },
      select: { id: true },
    })
    if (!product) throw new Error('Seed product PRD-ATLAS-001 missing')
    productId = product.id
  })

  afterAll(async () => {
    if (variantId) {
      await prisma.productVariant.delete({ where: { id: variantId } }).catch(() => undefined)
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('GET detail returns seeded variants from DB', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/product-master/${productId}`,
    })
    expect(res.statusCode).toBe(200)
    const detail = res.json() as { variants: { variantCode: string; name: string }[] }
    expect(detail.variants.length).toBeGreaterThanOrEqual(2)
    expect(detail.variants.some((v) => v.variantCode === 'PRD-ATLAS-001-STD')).toBe(true)
    expect(detail.variants.some((v) => v.name === 'Büyük boy')).toBe(true)
  })

  it('POST → PATCH → passive variant', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: `/v1/product-master/${productId}/variants`,
      payload: {
        variantCode,
        name: 'Test Varyant',
        barcode: `8699${Date.now().toString().slice(-8)}`,
        salePrice: 35000,
        purchasePrice: 19000,
        stockQuantity: 5,
        stockStatus: 'IN_STOCK',
        color: 'Beyaz',
        isDefault: false,
      },
    })
    expect(createRes.statusCode).toBe(201)
    const created = createRes.json() as { id: string; variantCode: string; name: string }
    variantId = created.id
    expect(created.variantCode).toBe(variantCode)
    expect(created.name).toBe('Test Varyant')

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/v1/product-master/${productId}/variants/${variantId}`,
      payload: { name: 'Test Varyant Güncel', stockQuantity: 3 },
    })
    expect(patchRes.statusCode).toBe(200)
    const patched = patchRes.json() as { name: string; stockQuantity: number }
    expect(patched.name).toBe('Test Varyant Güncel')
    expect(patched.stockQuantity).toBe(3)

    const passiveRes = await app.inject({
      method: 'PATCH',
      url: `/v1/product-master/${productId}/variants/${variantId}`,
      payload: { isActive: false },
    })
    expect(passiveRes.statusCode).toBe(200)
    const passive = passiveRes.json() as { isActive: boolean }
    expect(passive.isActive).toBe(false)

    const detailRes = await app.inject({
      method: 'GET',
      url: `/v1/product-master/${productId}`,
    })
    const detail = detailRes.json() as { variants: { id: string }[] }
    expect(detail.variants.some((v) => v.id === variantId)).toBe(false)
  })
})
