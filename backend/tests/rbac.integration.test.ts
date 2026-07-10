import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { hashPassword } from '../src/lib/password.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

async function login(
  app: FastifyInstance,
  email: string,
  password: string,
): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    payload: { email, password },
  })
  expect(res.statusCode).toBe(200)
  return (res.json() as { token: string }).token
}

describe.skipIf(!hasDb)('endpoint RBAC', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let schemaReady = false
  const inactiveEmail = `inactive-rbac-${Date.now()}@mobilya.local`
  let orderId = 'S-DEMO-PAYMENT'
  let supplierId = 'sup-seed-abc'

  beforeAll(async () => {
    delete process.env.AUTH_DISABLED
    try {
      await prisma.user.findFirst({ take: 1 })
      schemaReady = true
    } catch {
      schemaReady = false
      return
    }

    await prisma.user.create({
      data: {
        fullName: 'Inactive RBAC',
        email: inactiveEmail,
        passwordHash: hashPassword('inactive1'),
        role: USER_ROLE.SALES,
        isActive: false,
      },
    })

    app = await buildApp()
    await app.ready()

    const ordersRes = await app.inject({
      method: 'GET',
      url: '/v1/orders',
      headers: { Authorization: `Bearer ${await login(app, 'admin@mobilya.local', 'admin123')}` },
    })
    const orders = ordersRes.json() as { id: string }[]
    if (orders[0]?.id) orderId = orders[0].id

    const supRes = await app.inject({
      method: 'GET',
      url: '/v1/suppliers',
      headers: { Authorization: `Bearer ${await login(app, 'admin@mobilya.local', 'admin123')}` },
    })
    const suppliers = supRes.json() as { id: string }[]
    if (suppliers[0]?.id) supplierId = suppliers[0].id
  })

  afterAll(async () => {
    if (schemaReady) {
      await prisma.user.deleteMany({ where: { email: inactiveEmail } }).catch(() => undefined)
    }
    if (app) await app.close()
    await prisma.$disconnect()
    process.env.AUTH_DISABLED = 'true'
  })

  it.skipIf(() => !schemaReady)('inactive user cannot login', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: inactiveEmail, password: 'inactive1' },
    })
    expect(res.statusCode).toBe(401)
  })

  it.skipIf(() => !schemaReady)('unauthenticated GET /v1/orders returns 401 with message', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/orders' })
    expect(res.statusCode).toBe(401)
    expect((res.json() as { message: string }).message).toMatch(/oturum/i)
  })

  it.skipIf(() => !schemaReady)('SALES cannot create shipment (403)', async () => {
    const token = await login(app, 'sales@mobilya.local', 'sales123')
    const res = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/shipments`,
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        plannedShipDate: '2026-05-25',
        lines: [],
      },
    })
    expect(res.statusCode).toBe(403)
  })

  it.skipIf(() => !schemaReady)('OPERATION cannot post payment (403)', async () => {
    const token = await login(app, 'ops@mobilya.local', 'ops123')
    const res = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/payments`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 100, method: 'CASH' },
    })
    expect(res.statusCode).toBe(403)
  })

  it.skipIf(() => !schemaReady)('WAREHOUSE cannot create order (403)', async () => {
    const token = await login(app, 'warehouse@mobilya.local', 'warehouse123')
    const res = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        customerName: 'RBAC Test',
        productTitle: 'Test',
        totalAmount: 1000,
        paidAmount: 0,
        status: 'Bekleniyor',
        lines: [{ title: 'Ürün', qty: 1, unitPrice: 1000 }],
      },
    })
    expect(res.statusCode).toBe(403)
  })

  it.skipIf(() => !schemaReady)('SALES can create order (201)', async () => {
    const token = await login(app, 'sales@mobilya.local', 'sales123')
    const res = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        customerName: 'Sales RBAC Test',
        productTitle: 'Test Ürün',
        totalAmount: 5000,
        paidAmount: 1000,
        status: 'Bekleniyor',
        paymentMethod: 'CASH',
        lines: [{ title: 'Test Ürün', quantity: 1, unitPrice: 5000, sortOrder: 0 }],
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { id: string }
    expect(body.id).toBeTruthy()
    await prisma.salesOrder.delete({ where: { id: body.id } }).catch(() => undefined)
  })

  it.skipIf(() => !schemaReady)('OPERATION can create order (201)', async () => {
    const token = await login(app, 'ops@mobilya.local', 'ops123')
    const res = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        customerName: 'Ops RBAC Test',
        productTitle: 'Test Ürün',
        totalAmount: 8000,
        paidAmount: 2000,
        status: 'Bekleniyor',
        paymentMethod: 'CASH',
        lines: [{ title: 'Test Ürün', quantity: 1, unitPrice: 8000, sortOrder: 0 }],
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { id: string }
    expect(body.id).toBeTruthy()
    await prisma.salesOrder.delete({ where: { id: body.id } }).catch(() => undefined)
  })

  it.skipIf(() => !schemaReady)('ADMIN can list orders', async () => {
    const token = await login(app, 'admin@mobilya.local', 'admin123')
    const res = await app.inject({
      method: 'GET',
      url: '/v1/orders',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
  })

  it.skipIf(() => !schemaReady)('SALES cannot post supplier payment (403)', async () => {
    const token = await login(app, 'sales@mobilya.local', 'sales123')
    const res = await app.inject({
      method: 'POST',
      url: `/v1/suppliers/${supplierId}/payments`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { amount: 1, method: 'CASH' },
    })
    expect(res.statusCode).toBe(403)
  })

  it.skipIf(() => !schemaReady)('unauthenticated supply-order confirm returns 401', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/supply-order/confirm`,
      payload: { lineIds: ['line-1'], channel: 'MAIL' },
    })
    expect(res.statusCode).toBe(401)
  })

  it.skipIf(() => !schemaReady)('FINANCE cannot confirm supply order (403)', async () => {
    const token = await login(app, 'finance@mobilya.local', 'finance123')
    const res = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/supply-order/confirm`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { lineIds: ['line-1'], channel: 'MAIL' },
    })
    expect(res.statusCode).toBe(403)
  })

  it.skipIf(() => !schemaReady)('SALES can reach supply-order confirm (not 401/403)', async () => {
    const token = await login(app, 'sales@mobilya.local', 'sales123')
    const res = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/supply-order/confirm`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { lineIds: ['line-1'], channel: 'MAIL' },
    })
    expect(res.statusCode).not.toBe(401)
    expect(res.statusCode).not.toBe(403)
  })

  it.skipIf(() => !schemaReady)('task overlay is per user', async () => {
    const salesToken = await login(app, 'sales@mobilya.local', 'sales123')
    const opsToken = await login(app, 'ops@mobilya.local', 'ops123')
    const dedupeKey = `rbac-task-${Date.now()}`

    await app.inject({
      method: 'PUT',
      url: '/v1/task-states',
      headers: { Authorization: `Bearer ${salesToken}` },
      payload: { dedupeKey, state: 'dismissed' },
    })

    const opsList = await app.inject({
      method: 'GET',
      url: '/v1/task-states',
      headers: { Authorization: `Bearer ${opsToken}` },
    })
    const opsRows = opsList.json() as { dedupeKey: string }[]
    expect(opsRows.some((r) => r.dedupeKey === dedupeKey)).toBe(false)

    const salesList = await app.inject({
      method: 'GET',
      url: '/v1/task-states',
      headers: { Authorization: `Bearer ${salesToken}` },
    })
    const salesRows = salesList.json() as { dedupeKey: string; state: string }[]
    expect(salesRows.some((r) => r.dedupeKey === dedupeKey && r.state === 'dismissed')).toBe(true)
  })
})
