import Fastify from 'fastify'
import { afterAll, describe, expect, it } from 'vitest'
import { createOrderBodySchema } from '../src/schemas/createOrderSchema.js'

describe('createOrderBodySchema', () => {
  const app = Fastify()
  app.post('/_schema-test', { schema: { body: createOrderBodySchema } }, async () => ({ ok: true }))

  afterAll(async () => {
    await app.close()
  })

  it('configuration.pillows ve lumbarPillows dizi kabul eder', async () => {
    await app.ready()
    const res = await app.inject({
      method: 'POST',
      url: '/_schema-test',
      payload: {
        customerName: 'Test Müşteri',
        paidAmount: 0,
        status: 'Bekleniyor',
        lines: [
          {
            title: 'Flex köşe kanepe',
            quantity: 1,
            unitPrice: 50_000,
            configuration: {
              fabricBrand: 'MOZZE TEKSTİL',
              fabricCode: 'COMO01',
              bodyFabric: 'COMO 01',
              cornerDirection: 'Sağ köşe',
              pillows: [{ fabric: 'COMO01', qty: 4 }],
              lumbarPillows: [{ fabric: 'COMO02', qty: 2 }],
            },
          },
        ],
      },
    })
    expect(res.statusCode).toBe(200)
    expect(res.body).not.toMatch(/must be string/)
  })

  it('eski string pillowFabric alanını kabul eder', async () => {
    await app.ready()
    const res = await app.inject({
      method: 'POST',
      url: '/_schema-test',
      payload: {
        customerName: 'Legacy',
        paidAmount: 0,
        status: 'Bekleniyor',
        lines: [
          {
            title: 'Berjer',
            quantity: 1,
            unitPrice: 1000,
            configuration: {
              fabricBrand: 'Yünsa',
              fabricCode: '217',
              pillowFabric: '217 Antrasit',
              lumbarPillow: '217',
            },
          },
        ],
      },
    })
    expect(res.statusCode).toBe(200)
  })
})
