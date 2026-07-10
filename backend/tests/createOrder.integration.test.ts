import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { assertValidCreateOrderRequest } from '../src/services/createSalesOrder.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe('assertValidCreateOrderRequest', () => {
  it('geçerli legacy gövdeyi tek satıra normalize eder', () => {
    const normalized = assertValidCreateOrderRequest({
      customerName: 'Test A.Ş.',
      productTitle: 'Mutfak dolabı',
      totalAmount: 1000,
      paidAmount: 250,
      status: 'Bekleniyor',
    })
    expect(normalized.customerName).toBe('Test A.Ş.')
    expect(normalized.totalAmount).toBe(1000)
    expect(normalized.lines).toHaveLength(1)
    expect(normalized.lines[0].title).toBe('Mutfak dolabı')
    expect(normalized.lines[0].quantity).toBe(1)
  })

  it('çok satırlı gövdede subtotal ve totalAmount satır toplamı ile uyumludur', () => {
    const normalized = assertValidCreateOrderRequest({
      customerName: 'Multi',
      paidAmount: 0,
      status: 'Bekleniyor',
      lines: [
        { title: 'A', quantity: 2, unitPrice: 1000, sortOrder: 0 },
        { title: 'B', quantity: 1, unitPrice: 500, sortOrder: 1 },
      ],
    })
    expect(normalized.subtotalAmount).toBe(2500)
    expect(normalized.discountAmount).toBe(0)
    expect(normalized.totalAmount).toBe(2500)
    expect(normalized.remainingAmount).toBe(2500)
    expect(normalized.lines).toHaveLength(2)
    expect(normalized.lines[0].lineTotal).toBe(2000)
  })

  it('yüzde iskontolu sipariş — totalAmount = subtotal - discount', () => {
    const normalized = assertValidCreateOrderRequest({
      customerName: 'İskonto',
      paidAmount: 0,
      status: 'Bekleniyor',
      subtotalAmount: 10_000,
      discountPercent: 10,
      lines: [{ title: 'A', quantity: 1, unitPrice: 10_000, sortOrder: 0 }],
    })
    expect(normalized.subtotalAmount).toBe(10_000)
    expect(normalized.discountAmount).toBe(1000)
    expect(normalized.totalAmount).toBe(9000)
  })

  it('totalAmount subtotal-discount ile uyumsuzsa reddeder', () => {
    expect(() =>
      assertValidCreateOrderRequest({
        customerName: 'Bad',
        paidAmount: 0,
        status: 'Bekleniyor',
        subtotalAmount: 1000,
        totalAmount: 800,
        lines: [{ title: 'A', quantity: 1, unitPrice: 1000, sortOrder: 0 }],
      }),
    ).toThrowError(/Validation|uyumsuz/)
  })

  it('mail order — kısmi paidAmount kabul edilir', () => {
    const normalized = assertValidCreateOrderRequest({
      customerName: 'MO',
      paidAmount: 40_000,
      status: 'Bekleniyor',
      productTitle: 'Ürün',
      totalAmount: 120_000,
      paymentMethod: 'MAIL_ORDER',
      mailOrderCustomerId: 'Ali',
      mailOrderSupplierId: 'sup-x',
      mailOrderAmount: 40_000,
    })
    expect(normalized.paidAmount).toBe(40_000)
    expect(normalized.totalAmount).toBe(120_000)
  })

  it('mail order — paidAmount toplamdan büyükse 400', () => {
    expect(() =>
      assertValidCreateOrderRequest({
        customerName: 'MO',
        paidAmount: 130_000,
        status: 'Bekleniyor',
        productTitle: 'Ürün',
        totalAmount: 120_000,
        paymentMethod: 'MAIL_ORDER',
        mailOrderCustomerId: 'Ali',
        mailOrderSupplierId: 'sup-x',
      }),
    ).toThrowError(/paidAmount|Validation/)
  })

  it('mail order — geçerli ticari alanları kabul eder', () => {
    const normalized = assertValidCreateOrderRequest({
      customerName: 'MO',
      paidAmount: 1000,
      status: 'Bekleniyor',
      lines: [{ title: 'A', quantity: 1, unitPrice: 1000, sortOrder: 0 }],
      paymentMethod: 'MAIL_ORDER',
      paymentNote: 'Taksit',
      mailOrderCustomerId: 'Ayşe Kaya',
      mailOrderSupplierId: 'sup-seed-abc',
      mailOrderCommissionRate: 3,
    })
    expect(normalized.paymentMethod).toBe('MAIL_ORDER')
    expect(normalized.mailOrderCustomerId).toBe('Ayşe Kaya')
    expect(normalized.paidAmount).toBe(1000)
    expect(normalized.totalAmount).toBe(1000)
  })

  it('paidAmount > totalAmount ise 400 fırlatır', () => {
    expect(() =>
      assertValidCreateOrderRequest({
        customerName: 'X',
        productTitle: 'Y',
        totalAmount: 100,
        paidAmount: 200,
        status: 'Bekleniyor',
      }),
    ).toThrowError(/paidAmount|Validation/)
  })
})

describe.skipIf(!hasDb)('POST /v1/orders integration', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let createdOrderId = ''

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    if (createdOrderId) {
      await prisma.domainEvent.deleteMany({ where: { aggregateId: createdOrderId } })
      await prisma.salesOrder.delete({ where: { id: createdOrderId } }).catch(() => undefined)
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('201 ile sipariş + satır + ödeme + domain event oluşturur', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Integration Test',
        productTitle: 'Test ürün',
        totalAmount: 12_500,
        paidAmount: 5_000,
        status: 'Üretimde',
      },
    })

    expect(createRes.statusCode).toBe(201)
    const body = createRes.json() as {
      id: string
      customerDisplayName: string
      lineSummaryTitle: string
      amountPaid: { amount: string }
      totalAmount: { amount: string }
    }
    createdOrderId = body.id
    expect(body.id).toMatch(/^S-/)
    expect(body.customerDisplayName).toBe('Integration Test')
    expect(body.lineSummaryTitle).toBe('Test ürün')
    expect(body.amountPaid.amount).toBe('5000.00')
    expect(body.totalAmount.amount).toBe('12500.00')
    expect(createRes.headers['x-created-at']).toBeTruthy()

    const events = await prisma.domainEvent.findMany({ where: { aggregateId: createdOrderId } })
    expect(events.some((e) => e.type === 'order.placed')).toBe(true)

    const dbLines = await prisma.orderLine.findMany({ where: { salesOrderId: createdOrderId } })
    expect(dbLines).toHaveLength(1)
    expect(dbLines[0].id).toBe(`OL-${createdOrderId}-1`)

    const listRes = await app.inject({ method: 'GET', url: '/v1/orders' })
    const list = listRes.json() as { id: string }[]
    expect(list.some((o) => o.id === createdOrderId)).toBe(true)
  })

  it('geçersiz şema 400 döner', async () => {
    const bad = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: '',
        productTitle: '',
        totalAmount: -1,
        paidAmount: -1,
        status: 'Yok',
      },
    })
    expect(bad.statusCode).toBe(400)
  })

  it('çok satırlı create order_lines + shipment-plan-lines döner', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Multi Line Test',
        paidAmount: 0,
        status: 'Bekleniyor',
        lines: [
          { title: 'Dolap', quantity: 2, unitPrice: 5000, sortOrder: 0 },
          { title: 'Komodin', quantity: 1, unitPrice: 3000, sortOrder: 1 },
        ],
      },
    })
    expect(createRes.statusCode).toBe(201)
    const body = createRes.json() as { id: string; totalAmount: { amount: string }; lineSummaryTitle: string }
    const multiId = body.id
    expect(body.totalAmount.amount).toBe('13000.00')
    expect(body.lineSummaryTitle).toContain('Dolap')

    const dbLines = await prisma.orderLine.findMany({
      where: { salesOrderId: multiId },
      orderBy: { id: 'asc' },
    })
    expect(dbLines).toHaveLength(2)
    expect(dbLines[0].id).toBe(`OL-${multiId}-1`)
    expect(dbLines[1].id).toBe(`OL-${multiId}-2`)
    expect(Number(dbLines[0].qtyOrdered.toString())).toBe(2)

    const planRes = await app.inject({
      method: 'GET',
      url: `/v1/orders/${multiId}/shipment-plan-lines`,
    })
    expect(planRes.statusCode).toBe(200)
    const plan = planRes.json() as { orderLineId: string; qtyOrdered: string }[]
    expect(plan).toHaveLength(2)
    expect(plan.some((p) => p.orderLineId === `OL-${multiId}-1`)).toBe(true)

    await prisma.domainEvent.deleteMany({ where: { aggregateId: multiId } })
    await prisma.salesOrder.delete({ where: { id: multiId } }).catch(() => undefined)
  })

  it('ürün konfigürasyonu order_lines ve order-lines API ile persist edilir', async () => {
    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Config Test',
        paidAmount: 0,
        status: 'Bekleniyor',
        lines: [
          {
            title: 'Roma köşe takımı',
            quantity: 1,
            unitPrice: 45000,
            sortOrder: 0,
            productGroup: 'Oturma grubu',
            configuration: {
              fabricBrand: 'Yünsa',
              bodyFabric: 'Antrasit nubuk',
              cornerDirection: 'Sağ köşe',
            },
          },
        ],
      },
    })
    expect(createRes.statusCode).toBe(201)
    const body = createRes.json() as { id: string }
    const orderId = body.id

    const dbLine = await prisma.orderLine.findFirst({ where: { salesOrderId: orderId } })
    expect(dbLine).toBeTruthy()
    const cfg = dbLine!.configuration as Record<string, string>
    expect(cfg.bodyFabric).toBe('Antrasit nubuk')
    expect(cfg.cornerDirection).toBe('Sağ köşe')

    const linesRes = await app.inject({
      method: 'GET',
      url: `/v1/orders/${orderId}/order-lines`,
    })
    expect(linesRes.statusCode).toBe(200)
    const rows = linesRes.json() as { configuration: Record<string, string> | null }[]
    expect(rows[0].configuration?.cornerDirection).toBe('Sağ köşe')

    await prisma.domainEvent.deleteMany({ where: { aggregateId: orderId } })
    await prisma.salesOrder.delete({ where: { id: orderId } }).catch(() => undefined)
  })

  it('köşe koltuk yönü eksikse 400', async () => {
    const bad = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Bad Config',
        paidAmount: 0,
        status: 'Bekleniyor',
        lines: [
          {
            title: 'L koltuk takımı',
            quantity: 1,
            unitPrice: 1000,
            sortOrder: 0,
            productGroup: 'Oturma grubu',
            configuration: { bodyFabric: 'Gri' },
          },
        ],
      },
    })
    expect(bad.statusCode).toBe(400)
  })

  it('katalog koltuk + yatak odası — tedarikçi connect ile 201', async () => {
    const koltuk = await prisma.product.findFirst({ where: { productCode: 'PRD-FLEX-001' } })
    const yatak = await prisma.product.findFirst({ where: { productCode: 'PRD-DEFNE-001' } })
    expect(koltuk).toBeTruthy()
    expect(yatak).toBeTruthy()

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Koltuk Yatak Odası Test',
        paidAmount: 0,
        status: 'Bekleniyor',
        lines: [
          {
            title: koltuk!.productName,
            productId: koltuk!.id,
            quantity: 1,
            unitPrice: 67000,
            sortOrder: 0,
            productGroup: 'Oturma grubu',
            configuration: {
              fabricBrand: 'MOZZE TEKSTİL',
              bodyFabric: 'COMO01',
              cornerDirection: 'Sağ köşe',
            },
          },
          {
            title: yatak!.productName,
            productId: yatak!.id,
            quantity: 1,
            unitPrice: 145000,
            sortOrder: 1,
            productGroup: 'Yatak odası',
          },
        ],
      },
    })
    expect(createRes.statusCode).toBe(201)
    const body = createRes.json() as { id: string }
    expect(body.id).toMatch(/^S-/)

    const dbLines = await prisma.orderLine.findMany({
      where: { salesOrderId: body.id },
      orderBy: { id: 'asc' },
    })
    expect(dbLines).toHaveLength(2)
    expect(dbLines.some((l) => l.supplierId === koltuk!.defaultSupplierId)).toBe(true)

    await prisma.domainEvent.deleteMany({ where: { aggregateId: body.id } })
    await prisma.salesOrder.delete({ where: { id: body.id } }).catch(() => undefined)
  })

  it('mail order — ödeme MAIL_ORDER ve tedarikçi cari kaydı oluşturur', async () => {
    const supplier = await prisma.supplier.findFirst({ where: { isActive: true } })
    expect(supplier).toBeTruthy()

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Mail Order Integration',
        paidAmount: 8000,
        status: 'Bekleniyor',
        lines: [{ title: 'Sandalye', quantity: 2, unitPrice: 4000, sortOrder: 0 }],
        paymentMethod: 'MAIL_ORDER',
        paymentNote: 'Kart tahsilatı',
        mailOrderCustomerId: 'Kart Sahibi Test',
        mailOrderSupplierId: supplier!.id,
        mailOrderCommissionRate: 1.5,
      },
    })
    expect(createRes.statusCode).toBe(201)
    const body = createRes.json() as { id: string }
    const orderId = body.id

    const payments = await prisma.paymentTransaction.findMany({ where: { salesOrderId: orderId } })
    expect(payments).toHaveLength(1)
    expect(payments[0].kind).toBe('MAIL_ORDER')
    expect(Number(payments[0].amount.toString())).toBe(8000)

    const ledger = await prisma.supplierLedgerEntry.findMany({
      where: { supplierId: supplier!.id, documentNo: orderId },
    })
    expect(ledger.length).toBeGreaterThan(0)
    expect(ledger[0].entryType).toBe('MAIL_ORDER')
    expect(ledger[0].description).toContain('Kart Sahibi Test')

    await prisma.supplierLedgerEntry.deleteMany({ where: { documentNo: orderId } })
    await prisma.domainEvent.deleteMany({ where: { aggregateId: orderId } })
    await prisma.salesOrder.delete({ where: { id: orderId } }).catch(() => undefined)
  })
})
