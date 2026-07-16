import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)
let fixtureOrderId = ''

async function login(app: FastifyInstance): Promise<string> {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    payload: { email: 'ops@mobilya.local', password: 'ops123' },
  })
  expect(res.statusCode).toBe(200)
  return (res.json() as { token: string }).token
}

describe.skipIf(!hasDb)('shipment plans & groups API', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let token = ''
  let orderIdA = ''
  let orderIdB = ''
  let planId = ''
  let groupId = ''

  beforeAll(async () => {
    process.env.AUTH_DISABLED = 'true'
    app = await buildApp()
    await app.ready()
    token = await login(app)

    const ordersRes = await app.inject({
      method: 'GET',
      url: '/v1/orders',
      headers: { Authorization: `Bearer ${token}` },
    })
    const orders = ordersRes.json() as { id: string }[]
    orderIdA = orders[0]?.id ?? ''
    orderIdB = orders[1]?.id ?? orderIdA
    fixtureOrderId = orderIdA
  })

  afterAll(async () => {
    if (orderIdA) {
      await prisma.domainEvent.deleteMany({
        where: { aggregateId: { in: [orderIdA, orderIdB].filter(Boolean) } },
      })
      await prisma.shipmentPlan.deleteMany({
        where: { salesOrderId: { in: [orderIdA, orderIdB].filter(Boolean) } },
      })
    }
    if (groupId) {
      await prisma.shipmentGroup.deleteMany({ where: { id: groupId } })
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('creates shipment plan with domain event', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/shipment-plans',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        salesOrderId: orderIdA,
        plannedDate: '2026-05-20',
        plannedTime: '09:30',
        region: 'İzmit',
        vehicleName: 'Araç 1',
        crewPrimary: 'Muhammet',
        crewSecondary: 'Cihan',
        note: 'Test plan',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { id: string; salesOrderId: string; region: string }
    planId = body.id
    expect(body.salesOrderId).toBe(orderIdA)
    expect(body.region).toBe('İzmit')

    const events = await prisma.domainEvent.findMany({
      where: { aggregateId: orderIdA, type: 'shipment.plan.created' },
    })
    expect(events.length).toBeGreaterThan(0)
  })

  it('updates shipment plan', async () => {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/shipment-plans/${planId}`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { plannedTime: '11:00', note: 'Güncellendi' },
    })
    expect(res.statusCode).toBe(200)
    expect((res.json() as { plannedTime: string }).plannedTime).toBe('11:00')

    const events = await prisma.domainEvent.findMany({
      where: { aggregateId: orderIdA, type: 'shipment.plan.updated' },
    })
    expect(events.length).toBeGreaterThan(0)
  })

  it('lists shipment plans by date', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/shipment-plans?plannedDate=2026-05-20',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    const rows = res.json() as unknown[]
    expect(rows.length).toBeGreaterThan(0)
  })

  it('creates shipment group and applies plans', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/shipment-groups',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        region: 'İzmit',
        plannedDate: '2026-05-21',
        vehicleName: 'Araç 2',
        crewPrimary: 'Muhammet',
        crewSecondary: 'Cihan',
        estimatedSaving: 2400,
        orders: [
          { salesOrderId: orderIdA, plannedTime: '09:00' },
          { salesOrderId: orderIdB, plannedTime: '11:00' },
        ],
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as { id: string; groupNo: string; orderIds: string[] }
    groupId = body.id
    expect(body.groupNo).toMatch(/^SG-/)
    expect(body.orderIds.length).toBe(2)

    const groupEvents = await prisma.domainEvent.findMany({
      where: { type: 'shipment.group.created' },
    })
    expect(groupEvents.some((e) => e.aggregateId === groupId)).toBe(true)

    const applied = await prisma.domainEvent.findMany({
      where: { type: 'shipment.group.applied', aggregateId: orderIdA },
    })
    expect(applied.length).toBeGreaterThan(0)
  })
})

describe.skipIf(!hasDb)('shipment plans RBAC', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    delete process.env.AUTH_DISABLED
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
    process.env.AUTH_DISABLED = 'true'
  })

  it('SALES can create shipment plan', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'sales@mobilya.local', password: 'sales123' },
    })
    const token = (loginRes.json() as { token: string }).token
    const res = await app.inject({
      method: 'POST',
      url: '/v1/shipment-plans',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        salesOrderId: fixtureOrderId,
        plannedDate: '2026-05-20',
      },
    })
    expect(res.statusCode).toBe(201)
  })

  it('WAREHOUSE can read but not write plans', async () => {
    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'warehouse@mobilya.local', password: 'warehouse123' },
    })
    const token = (loginRes.json() as { token: string }).token

    const read = await app.inject({
      method: 'GET',
      url: '/v1/shipment-plans',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(read.statusCode).toBe(200)

    const write = await app.inject({
      method: 'POST',
      url: '/v1/shipment-plans',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        salesOrderId: 'S-TEST',
        plannedDate: '2026-05-20',
      },
    })
    expect(write.statusCode).toBe(403)
  })
})
