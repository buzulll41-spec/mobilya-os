import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { assertValidCreateSupplierRequest } from '../src/services/createSupplier.js'
import { assertValidPostSupplierPaymentRequest } from '../src/services/postSupplierPayment.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe('supplier validators', () => {
  it('create supplier — geçerli gövde', () => {
    expect(assertValidCreateSupplierRequest({ companyName: 'ABC Mobilya' })).toEqual({
      companyName: 'ABC Mobilya',
    })
  })

  it('create supplier — firma adı zorunlu', () => {
    expect(() => assertValidCreateSupplierRequest({ companyName: '  ' })).toThrow(/Validation/)
  })

  it('post payment — geçerli gövde', () => {
    expect(assertValidPostSupplierPaymentRequest({ amount: 1000, method: 'TRANSFER' })).toEqual({
      amount: 1000,
      method: 'TRANSFER',
    })
  })
})

describe.skipIf(!hasDb)('suppliers integration', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let supplierId = ''

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    if (supplierId) {
      await prisma.supplierLedgerEntry.deleteMany({ where: { supplierId } })
      await prisma.supplier.delete({ where: { id: supplierId } }).catch(() => undefined)
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('POST supplier → GET list → açık bakiye 0', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/suppliers',
      payload: {
        companyName: 'Test Tedarik A.Ş.',
        code: 'TTA',
        phone: '0555 000 00 00',
      },
    })
    expect(createRes.statusCode).toBe(201)
    const created = createRes.json() as { id: string; openBalance: string; companyName: string }
    supplierId = created.id
    expect(created.openBalance).toBe('0.00')
    expect(created.companyName).toBe('Test Tedarik A.Ş.')

    const listRes = await app.inject({ method: 'GET', url: '/v1/suppliers?q=Test+Tedarik' })
    expect(listRes.statusCode).toBe(200)
    const list = listRes.json() as { id: string }[]
    expect(list.some((s) => s.id === supplierId)).toBe(true)
  })

  it('GOODS_RECEIPT seed benzeri credit → bakiye artar', async () => {
    const { appendSupplierLedgerCredit } = await import('../src/services/postSupplierPayment.js')
    await appendSupplierLedgerCredit(prisma, supplierId, {
      amount: 45_000,
      description: 'Mayer Köşe — demo mal girişi',
    })

    const detail = await app.inject({ method: 'GET', url: `/v1/suppliers/${supplierId}` })
    const body = detail.json() as { openBalance: string }
    expect(body.openBalance).toBe('45000.00')
  })

  it('POST payment → bakiye düşer', async () => {
    const payRes = await app.inject({
      method: 'POST',
      url: `/v1/suppliers/${supplierId}/payments`,
      payload: { amount: 20_000, method: 'TRANSFER', description: 'Havale ödeme' },
    })
    expect(payRes.statusCode).toBe(201)
    const result = payRes.json() as {
      entry: { entryType: string; debitAmount: string; balanceAfter: string }
      supplier: { openBalance: string }
    }
    expect(result.entry.entryType).toBe('PAYMENT')
    expect(result.entry.debitAmount).toBe('20000.00')
    expect(result.entry.balanceAfter).toBe('25000.00')
    expect(result.supplier.openBalance).toBe('25000.00')

    const ledgerRes = await app.inject({
      method: 'GET',
      url: `/v1/suppliers/${supplierId}/ledger`,
    })
    const ledger = ledgerRes.json() as { entryType: string }[]
    expect(ledger.length).toBeGreaterThanOrEqual(2)
    expect(ledger.some((e) => e.entryType === 'PAYMENT')).toBe(true)
  })

  it('pasif tedarikçiye ödeme reddedilir', async () => {
    await app.inject({
      method: 'PATCH',
      url: `/v1/suppliers/${supplierId}`,
      payload: { isActive: false },
    })

    const payRes = await app.inject({
      method: 'POST',
      url: `/v1/suppliers/${supplierId}/payments`,
      payload: { amount: 100, method: 'CASH' },
    })
    expect(payRes.statusCode).toBe(409)

    await app.inject({
      method: 'PATCH',
      url: `/v1/suppliers/${supplierId}`,
      payload: { isActive: true },
    })
  })

  it('ödeme açık bakiyeyi aşamaz', async () => {
    const payRes = await app.inject({
      method: 'POST',
      url: `/v1/suppliers/${supplierId}/payments`,
      payload: { amount: 999_999, method: 'CASH' },
    })
    expect(payRes.statusCode).toBe(400)
  })
})
