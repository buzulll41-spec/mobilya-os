import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'

describe('CORS preflight', () => {
  let app: FastifyInstance

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    await app.close()
  })

  it('OPTIONS POST /v1/orders → Access-Control-Allow-Methods içinde POST', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/v1/orders',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    })

    expect(res.statusCode).toBe(204)
    const allowMethods = res.headers['access-control-allow-methods'] ?? ''
    expect(String(allowMethods).toUpperCase()).toContain('POST')
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173')
  })

  it('OPTIONS POST /v1/auth/login origin 5174 → Access-Control-Allow-Origin', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/v1/auth/login',
      headers: {
        origin: 'http://localhost:5174',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type',
      },
    })

    expect(res.statusCode).toBe(204)
    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5174')
  })

  it('OPTIONS missing-items PATCH → Access-Control-Allow-Methods içinde PATCH', async () => {
    const res = await app.inject({
      method: 'OPTIONS',
      url: '/v1/missing-items/OMI-1/status',
      headers: {
        origin: 'http://localhost:5173',
        'access-control-request-method': 'PATCH',
        'access-control-request-headers': 'content-type',
      },
    })

    expect(res.statusCode).toBe(204)
    const allowMethods = res.headers['access-control-allow-methods'] ?? ''
    expect(String(allowMethods).toUpperCase()).toContain('PATCH')
  })
})
