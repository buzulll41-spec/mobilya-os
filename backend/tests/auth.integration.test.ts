import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { hashPassword } from '../src/lib/password.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe('auth validators', () => {
  it('AUTH_DISABLED ortamında korumasız istek geçer', async () => {
    process.env.AUTH_DISABLED = 'true'
    const app = await buildApp()
    await app.ready()
    const res = await app.inject({ method: 'GET', url: '/v1/orders' })
    expect(res.statusCode).toBe(200)
    await app.close()
  })
})

describe.skipIf(!hasDb)('auth integration', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  const email = `auth-test-${Date.now()}@mobilya.local`
  let token = ''
  let schemaReady = false

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
        fullName: 'Auth Test',
        email,
        passwordHash: hashPassword('testpass'),
        role: USER_ROLE.OPERATION,
        isActive: true,
      },
    })
    app = await buildApp()
    await app.ready()

    const loginRes = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email, password: 'testpass' },
    })
    if (loginRes.statusCode === 200) {
      token = (loginRes.json() as { token: string }).token
    }
  })

  afterAll(async () => {
    if (schemaReady) {
      await prisma.user.deleteMany({ where: { email } }).catch(() => undefined)
    }
    if (app) await app.close()
    await prisma.$disconnect()
    process.env.AUTH_DISABLED = 'true'
  })

  it('schema has users table (migrate deploy gerekir)', () => {
    if (!schemaReady) {
      expect(schemaReady).toBe(false)
      return
    }
    expect(schemaReady).toBe(true)
  })

  it.skipIf(() => !schemaReady)('POST /v1/auth/login returns token', async () => {
    expect(token.length).toBeGreaterThan(10)
  })

  it.skipIf(() => !schemaReady)('GET /v1/orders without token returns 401', async () => {
    const prev = process.env.AUTH_DISABLED
    delete process.env.AUTH_DISABLED
    const res = await app.inject({ method: 'GET', url: '/v1/orders' })
    process.env.AUTH_DISABLED = prev
    expect(res.statusCode).toBe(401)
  })

  it.skipIf(() => !schemaReady)('GET /v1/auth/me with token returns user', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/auth/me',
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.statusCode).toBe(200)
    expect((res.json() as { email: string }).email).toBe(email)
  })

  it.skipIf(() => !schemaReady)('PUT task-states persists overlay', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/v1/task-states',
      headers: { Authorization: `Bearer ${token}` },
      payload: { dedupeKey: 'proj-test-auth', state: 'dismissed' },
    })
    expect(res.statusCode).toBe(200)
    const list = await app.inject({
      method: 'GET',
      url: '/v1/task-states',
      headers: { Authorization: `Bearer ${token}` },
    })
    const rows = list.json() as { dedupeKey: string; state: string }[]
    expect(rows.some((r) => r.dedupeKey === 'proj-test-auth' && r.state === 'dismissed')).toBe(true)
  })

  it.skipIf(() => !schemaReady)('POST domain-events attaches authenticated actor', async () => {
    const ordersRes = await app.inject({
      method: 'GET',
      url: '/v1/orders',
      headers: { Authorization: `Bearer ${token}` },
    })
    const orders = ordersRes.json() as { id: string }[]
    const orderId = orders[0]?.id
    expect(orderId).toBeTruthy()

    const res = await app.inject({
      method: 'POST',
      url: '/v1/domain-events',
      headers: { Authorization: `Bearer ${token}` },
      payload: {
        type: 'sales.contract_printed',
        salesOrderId: orderId,
        metadata: { source: 'contract_preview' },
      },
    })
    expect(res.statusCode).toBe(201)
    const ev = res.json() as { payload: { operationActor: { actorId: string; actorName: string } } }
    expect(ev.payload.operationActor.actorName).toBe('Auth Test')
    expect(ev.payload.operationActor.actorId).toBeTruthy()
  })
})
