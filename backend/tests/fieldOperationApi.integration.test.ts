import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'

const hasDb = Boolean(process.env.DATABASE_URL)
const PLANNED_DATE = '2026-05-20'

describe.skipIf(!hasDb)('field operation API integration', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  const createdIds: string[] = []
  const orderId = `API-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  let opId = ''

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    if (createdIds.length > 0) {
      await prisma.fieldOperation.deleteMany({ where: { id: { in: createdIds } } })
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('POST create → 201 + detay + CREATE timeline', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/field-operations',
      payload: {
        type: 'DELIVERY',
        title: 'API teslimat',
        orderId,
        plannedDate: PLANNED_DATE,
        priority: 'HIGH',
      },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as {
      id: string
      operationNumber: string
      status: string
      version: number
      plannedDate: string
      timeline: { eventType: string; toStatus: string }[]
    }
    opId = body.id
    createdIds.push(opId)
    expect(body.operationNumber).toMatch(/^FO-\d{6}$/)
    expect(body.status).toBe('PLANNED')
    expect(body.version).toBe(1)
    expect(body.plannedDate).toBe(PLANNED_DATE)
    expect(body.timeline).toHaveLength(1)
    expect(body.timeline[0]!.eventType).toBe('CREATE')
  })

  it('GET detay → 200', async () => {
    const res = await app.inject({ method: 'GET', url: `/v1/field-operations/${opId}` })
    expect(res.statusCode).toBe(200)
    expect((res.json() as { id: string }).id).toBe(opId)
  })

  it('GET liste → durum/tip/tarih filtreleri', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/field-operations?status=PLANNED&type=DELIVERY&dateFrom=${PLANNED_DATE}&dateTo=${PLANNED_DATE}`,
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { items: { id: string }[]; total: number }
    expect(body.items.some((i) => i.id === opId)).toBe(true)
  })

  it('POST transition zinciri → semantik timeline (ON_THE_WAY/ARRIVED/STARTED) + actualStartTime', async () => {
    for (const toStatus of ['ASSIGNED', 'ON_THE_WAY', 'ARRIVED', 'IN_PROGRESS']) {
      const res = await app.inject({
        method: 'POST',
        url: `/v1/field-operations/${opId}/transition`,
        payload: { toStatus },
      })
      expect(res.statusCode).toBe(200)
    }
    const detail = await app.inject({ method: 'GET', url: `/v1/field-operations/${opId}` })
    const body = detail.json() as {
      status: string
      actualStartTime: string | null
      timeline: { eventType: string }[]
    }
    expect(body.status).toBe('IN_PROGRESS')
    expect(body.actualStartTime).not.toBeNull()
    const events = body.timeline.map((t) => t.eventType)
    expect(events).toEqual(expect.arrayContaining(['CREATE', 'ON_THE_WAY', 'ARRIVED', 'STARTED']))
  })

  it('geçersiz geçiş → 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/field-operations/${opId}/transition`,
      payload: { toStatus: 'PLANNED' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('optimistic locking → eski expectedVersion 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/field-operations/${opId}/transition`,
      payload: { toStatus: 'COMPLETED', expectedVersion: 1 },
    })
    expect(res.statusCode).toBe(409)
  })

  it('POST atama → 201 + ASSIGN timeline + personel filtresi', async () => {
    const res = await app.inject({
      method: 'POST',
      url: `/v1/field-operations/${opId}/assignments`,
      payload: { userId: 'staff-1', role: 'DRIVER', isPrimary: true },
    })
    expect(res.statusCode).toBe(201)
    const body = res.json() as {
      assignments: { userId: string }[]
      timeline: { eventType: string }[]
    }
    expect(body.assignments.some((a) => a.userId === 'staff-1')).toBe(true)
    expect(body.timeline.some((t) => t.eventType === 'ASSIGN')).toBe(true)

    const list = await app.inject({
      method: 'GET',
      url: '/v1/field-operations?assigneeUserId=staff-1',
    })
    expect((list.json() as { items: { id: string }[] }).items.some((i) => i.id === opId)).toBe(true)
  })

  it('duplicate guard → aynı kaynak+tip için 409', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/v1/field-operations',
      payload: { type: 'DELIVERY', title: 'Kopya', orderId },
    })
    expect(res.statusCode).toBe(409)
  })

  it('GET bugünkü işler → verilen tarihe göre listeler', async () => {
    const res = await app.inject({
      method: 'GET',
      url: `/v1/field-operations/today?date=${PLANNED_DATE}`,
    })
    expect(res.statusCode).toBe(200)
    expect((res.json() as { items: { id: string }[] }).items.some((i) => i.id === opId)).toBe(true)
  })

  it('PATCH update → alan güncelleme + version artışı', async () => {
    const before = await app.inject({ method: 'GET', url: `/v1/field-operations/${opId}` })
    const beforeVersion = (before.json() as { version: number }).version
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/field-operations/${opId}`,
      payload: { title: 'Güncellenmiş başlık', priority: 'URGENT' },
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { title: string; priority: string; version: number }
    expect(body.title).toBe('Güncellenmiş başlık')
    expect(body.priority).toBe('URGENT')
    expect(body.version).toBe(beforeVersion + 1)
  })

  it('DELETE soft delete → 204 sonra detay 404', async () => {
    const del = await app.inject({ method: 'DELETE', url: `/v1/field-operations/${opId}` })
    expect(del.statusCode).toBe(204)
    const detail = await app.inject({ method: 'GET', url: `/v1/field-operations/${opId}` })
    expect(detail.statusCode).toBe(404)
  })
})
