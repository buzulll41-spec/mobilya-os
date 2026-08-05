import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { DEMO_PRODUCTS } from '../prisma/demoProducts.js'
import { seedDemoCatalog } from '../prisma/seedProducts.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('demo product catalog seed', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    await prisma.$disconnect()
  })

  it('seedDemoCatalog idempotent — ikinci çalıştırmada duplicate oluşmaz', async () => {
    const first = await seedDemoCatalog(prisma)
    const second = await seedDemoCatalog(prisma)

    expect(first.productsCreated).toBeGreaterThanOrEqual(0)
    expect(second.productsCreated).toBe(0)
    expect(second.productsSkipped).toBe(DEMO_PRODUCTS.length)
    expect(second.productsSkipped).toBe(first.productsSkipped + first.productsCreated)
    expect(second.productCount).toBeGreaterThanOrEqual(30)
    expect(second.productCount).toBe(first.productCount)
  })

  it('GET /v1/products demo katalog döner', async () => {
    await seedDemoCatalog(prisma)

    const listRes = await app.inject({
      method: 'GET',
      url: '/v1/products?page=1&pageSize=50',
    })
    expect(listRes.statusCode).toBe(200)
    const body = listRes.json() as {
      items: { productCode: string; productName: string; category: string; defaultSalePrice: string }[]
      total: number
      kpis: { activeCount: number }
    }
    expect(body.total).toBeGreaterThanOrEqual(30)
    expect(body.kpis.activeCount).toBeGreaterThanOrEqual(25)

    const mayer = body.items.find((p) => p.productCode === 'PRD-MAYER-001')
    expect(mayer?.productName).toBe('MAYER KÖŞE TAKIMI')
    expect(mayer?.category).toBe('Oturma grubu')
    expect(Number.parseFloat(mayer?.defaultSalePrice ?? '0')).toBe(89_000)

    expect(mayer?.id).toBeTruthy()
    const detailRes = await app.inject({
      method: 'GET',
      url: `/v1/products/${mayer!.id}`,
    })
    expect(detailRes.statusCode).toBe(200)
    const detail = detailRes.json() as { defaultSupplierId: string | null; purchasePrice: string }
    expect(detail.defaultSupplierId).toBe('sup-seed-mayer')
    expect(Number.parseFloat(detail.purchasePrice)).toBe(52_000)
  })

  it('GET /v1/product-master demo master alanları döner', async () => {
    await seedDemoCatalog(prisma)

    const listRes = await app.inject({
      method: 'GET',
      url: '/v1/product-master?pageSize=100',
    })
    expect(listRes.statusCode).toBe(200)
    const body = listRes.json() as {
      items: {
        productCode: string
        barcode: string
        brand: string
        publishStatus: string
        slug: string
        productHealthScore: number
      }[]
      summaryMetrics: { id: string; value: string }[]
      total: number
    }
    expect(body.total).toBeGreaterThanOrEqual(48)

    const alfa = body.items.find((p) => p.productCode === 'PRD-ALFA-001')
    expect(alfa?.brand).toBe('ALFA')
    expect(alfa?.barcode).toMatch(/^869/)
    expect(alfa?.publishStatus).toBe('PUBLISHED')
    expect(alfa?.slug).toBeTruthy()
    expect(alfa?.productHealthScore).toBeGreaterThanOrEqual(50)

    const arte = body.items.find((p) => p.productCode === 'PRD-ARTE-001')
    expect(arte?.productCode).toBe('PRD-ARTE-001')

    expect(body.summaryMetrics.some((m) => m.id === 'total')).toBe(true)

    const alfaId = body.items.find((p) => p.productCode === 'PRD-ALFA-001')!.id
    const detailRes = await app.inject({
      method: 'GET',
      url: `/v1/product-master/${alfaId}`,
    })
    expect(detailRes.statusCode).toBe(200)
    const detail = detailRes.json() as {
      longDescription: string
      media: { mainImageUrl: string | null }
    }
    expect(detail.longDescription.length).toBeGreaterThan(10)
    expect(detail.media.mainImageUrl).toBeTruthy()
  })
})
