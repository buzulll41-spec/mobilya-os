import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { PRODUCT_PUBLISH_STATUS } from '../src/constants/productPublishStatus.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('product master CRUD', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let productId = ''
  const productCode = `PMC-${Date.now()}`

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    if (productId) {
      await prisma.product.delete({ where: { id: productId } }).catch(() => undefined)
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('POST → PATCH publishStatus PASSIVE → GET detail', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/product-master',
      payload: {
        name: 'CRUD Test Ürün',
        code: productCode,
        category: 'Aksesuar',
        brand: 'TestMarka',
        costPrice: 1000,
        listPrice: 2500,
        salePrice: 2200,
        vatRate: 20,
        shortDescription: 'Kısa test açıklama',
        longDescription: 'Uzun test açıklama metni Product Master CRUD',
        width: 100,
        depth: 50,
        height: 80,
        material: 'MDF',
        deliveryTimeDays: 10,
        publishStatus: PRODUCT_PUBLISH_STATUS.DRAFT,
        productType: 'SIMPLE',
        collectionCode: 'COL-TEST',
        seasonCode: '2026-SS',
        weightKg: 42.5,
        packageWidthCm: 110,
        packageDepthCm: 58,
        packageHeightCm: 48,
        packageCount: 2,
        assemblyType: 'Flat-pack',
        coating: 'Melamin',
        mechanism: 'Sabit',
        technicalAttributes: [{ label: 'Malzeme', value: 'MDF' }],
        colorOptions: ['Beyaz', 'Gri'],
        fabricOptions: [],
        tags: ['test', 'ssot'],
        stockType: 'ORDER',
        webEnabled: true,
        mobileEnabled: true,
        marketplaceEnabled: false,
      },
    })
    expect(createRes.statusCode).toBe(201)
    const created = createRes.json() as {
      id: string
      productCode: string
      name: string
      publishStatus: string
      productHealthScore: number
      productType: string
      collectionCode: string | null
      colorOptions: string[]
      stockType: string
      webEnabled: boolean
    }
    productId = created.id
    expect(created.productCode).toBe(productCode)
    expect(created.name).toBe('CRUD Test Ürün')
    expect(created.publishStatus).toBe(PRODUCT_PUBLISH_STATUS.DRAFT)
    expect(created.productHealthScore).toBeGreaterThanOrEqual(0)
    expect(created.productType).toBe('SIMPLE')
    expect(created.collectionCode).toBe('COL-TEST')
    expect(created.colorOptions).toEqual(['Beyaz', 'Gri'])
    expect(created.stockType).toBe('ORDER')
    expect(created.webEnabled).toBe(true)

    const listRes = await app.inject({
      method: 'GET',
      url: `/v1/product-master?q=${encodeURIComponent(productCode)}&pageSize=20`,
    })
    expect(listRes.statusCode).toBe(200)
    const list = listRes.json() as { items: { id: string; productType: string }[] }
    expect(list.items.some((i) => i.id === productId)).toBe(true)

    const detailAfterCreate = await app.inject({
      method: 'GET',
      url: `/v1/product-master/${productId}`,
    })
    expect(detailAfterCreate.statusCode).toBe(200)
    const listed = detailAfterCreate.json() as { id: string; productType: string }
    expect(listed.id).toBe(productId)
    expect(listed.productType).toBe('SIMPLE')

    const patchRes = await app.inject({
      method: 'PATCH',
      url: `/v1/product-master/${productId}`,
      payload: {
        name: 'CRUD Test Ürün Güncel',
        listPrice: 2800,
        publishStatus: PRODUCT_PUBLISH_STATUS.PUBLISHED,
        mainImageUrl: 'https://example.com/test.jpg',
        productType: 'VARIABLE',
        marketplaceEnabled: true,
      },
    })
    expect(patchRes.statusCode).toBe(200)
    const patched = patchRes.json() as {
      name: string
      publishStatus: string
      productType: string
      marketplaceEnabled: boolean
      media: { mainImageUrl: string }
    }
    expect(patched.name).toBe('CRUD Test Ürün Güncel')
    expect(patched.publishStatus).toBe(PRODUCT_PUBLISH_STATUS.PUBLISHED)
    expect(patched.productType).toBe('VARIABLE')
    expect(patched.marketplaceEnabled).toBe(true)
    expect(patched.media.mainImageUrl).toBe('https://example.com/test.jpg')

    const passiveRes = await app.inject({
      method: 'PATCH',
      url: `/v1/product-master/${productId}`,
      payload: { publishStatus: PRODUCT_PUBLISH_STATUS.PASSIVE },
    })
    expect(passiveRes.statusCode).toBe(200)
    const passive = passiveRes.json() as { publishStatus: string; isActive: boolean }
    expect(passive.publishStatus).toBe(PRODUCT_PUBLISH_STATUS.PASSIVE)
    expect(passive.isActive).toBe(false)

    const detailRes = await app.inject({
      method: 'GET',
      url: `/v1/product-master/${productId}`,
    })
    expect(detailRes.statusCode).toBe(200)
    const detail = detailRes.json() as { publishStatus: string; productType: string }
    expect(detail.publishStatus).toBe(PRODUCT_PUBLISH_STATUS.PASSIVE)
    expect(detail.productType).toBe('VARIABLE')
  })

  it('validation rejects empty code', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/product-master',
      payload: { name: 'X', code: '', category: 'Aksesuar' },
    })
    expect(res.statusCode).toBe(400)
  })
})
