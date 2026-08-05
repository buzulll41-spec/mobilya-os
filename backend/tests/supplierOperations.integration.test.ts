import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { INCOMING_GOODS_PURPOSE } from '../src/constants/incomingGoodsPurpose.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('supplier operations integration', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let supplierId = ''
  let orderLineId = ''

  beforeAll(async () => {
    process.env.DEMO_TODAY = '2026-05-17'
    app = await buildApp()
    await app.ready()

    const sup = await app.inject({
      method: 'POST',
      url: '/v1/suppliers',
      payload: { companyName: 'Ops Merkez Test', address: 'İstanbul' },
    })
    supplierId = (sup.json() as { id: string }).id

    const orderRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Ops Müşteri',
        productTitle: 'Test Ürün',
        totalAmount: 10_000,
        paidAmount: 0,
        status: 'Üretimde',
        lines: [{ title: 'Test Ürün', quantity: 4, unitPrice: 2500, sortOrder: 0 }],
      },
    })
    const orderId = (orderRes.json() as { id: string }).id
    const lines = await prisma.orderLine.findMany({ where: { salesOrderId: orderId } })
    orderLineId = lines[0].id

    // Depo girişi öncesi tedarik emri zorunlu (iş kuralı): önce supply-order confirm.
    await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/supply-order/confirm`,
      payload: { lineIds: [orderLineId], channel: 'MAIL' },
    })

    await app.inject({
      method: 'POST',
      url: '/v1/incoming-goods',
      payload: {
        supplierId,
        receivedAt: '2026-05-17',
        productTitle: 'Test Ürün',
        qty: 1,
        unitPurchasePrice: 500,
        purpose: INCOMING_GOODS_PURPOSE.CUSTOMER_ORDER,
        orderLineId,
      },
    })
  })

  afterAll(async () => {
    await prisma.$disconnect()
    await app.close()
  })

  it('GET operations-board KPI ve enriched liste', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/supply/operations-board' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      kpis: { criticalSupplierCount: number; openProductCount: number }
      suppliers: { id: string; healthStatus: string; openProductCount: number }[]
    }
    expect(body.kpis.openProductCount).toBeGreaterThanOrEqual(1)
    const row = body.suppliers.find((s) => s.id === supplierId)
    expect(row?.openProductCount).toBeGreaterThanOrEqual(1)
  })

  it('GET supplier operations detay', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/suppliers/${supplierId}/operations`,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      openProducts: { qtyMissing: string }[]
      commercial: { totalPurchases: string }
      incomingHistory: unknown[]
    }
    expect(body.openProducts.length).toBeGreaterThanOrEqual(1)
    expect(Number.parseFloat(body.commercial.totalPurchases)).toBeGreaterThan(0)
    expect(body.incomingHistory.length).toBeGreaterThanOrEqual(1)
  })
})
