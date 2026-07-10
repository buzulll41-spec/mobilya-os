import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { SUPPLIER_LEDGER_STATUS } from '../src/constants/supplierLedgerStatuses.js'
import type { FastifyInstance } from 'fastify'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('mail order supplier ledger integration', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  const orderId = 'S-DEMO-KUPASI'
  let paymentId = ''
  let supplierId = ''
  let salesToken = ''
  let adminToken = ''
  let paidBefore = 0
  let remainingBefore = 0

  beforeAll(async () => {
    process.env.AUTH_DISABLED = 'false'
    app = await buildApp()
    await app.ready()

    const order = await prisma.salesOrder.findUnique({ where: { id: orderId } })
    if (!order) return

    paidBefore = Number(order.paidAmount)
    remainingBefore = Number(order.remainingAmount)

    const supplier = await prisma.supplier.findFirst({
      where: { companyName: { contains: 'Mayer Mobilya' } },
    })
    expect(supplier).toBeTruthy()
    supplierId = supplier!.id

    const salesLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'sales@mobilya.local', password: 'sales123' },
    })
    expect(salesLogin.statusCode).toBe(200)
    salesToken = (salesLogin.json() as { token: string }).token

    const adminLogin = await app.inject({
      method: 'POST',
      url: '/v1/auth/login',
      payload: { email: 'admin@mobilya.local', password: 'admin123' },
    })
    expect(adminLogin.statusCode).toBe(200)
    adminToken = (adminLogin.json() as { token: string }).token
  })

  afterAll(async () => {
    if (paymentId) {
      await prisma.supplierLedgerEntry.deleteMany({ where: { paymentTransactionId: paymentId } })
      await prisma.domainEvent.deleteMany({
        where: { aggregateId: orderId, correlationId: { contains: paymentId } },
      })
      await prisma.paymentTransaction.delete({ where: { id: paymentId } }).catch(() => undefined)
      await prisma.salesOrder.update({
        where: { id: orderId },
        data: {
          paidAmount: paidBefore,
          remainingAmount: remainingBefore,
          isFullyPaid: remainingBefore <= 0.009,
        },
      })
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('sales mail order post → müşteri bakiyesi değişmez, tedarikçi cari PENDING', async () => {
    const order = await prisma.salesOrder.findUnique({ where: { id: orderId } })
    if (!order) return

    const remaining = Number(order.remainingAmount)
    const amount = Math.min(5_000, remaining)
    if (amount <= 0) return

    const res = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/payments`,
      headers: { authorization: `Bearer ${salesToken}` },
      payload: {
        amount,
        method: 'MAIL_ORDER',
        mailOrderSupplierId: supplierId,
        mailOrderCustomerId: 'DÜNYA KUPASI Organizasyon',
        note: 'Mayer POS',
      },
    })
    expect(res.statusCode, res.body).toBe(200)

    const after = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })
    expect(Number(after.paidAmount)).toBe(Number(order.paidAmount))
    expect(Number(after.remainingAmount)).toBe(remaining)

    const payment = await prisma.paymentTransaction.findFirst({
      where: { salesOrderId: orderId, kind: 'MAIL_ORDER', status: 'PENDING_APPROVAL' },
      orderBy: { occurredAt: 'desc' },
    })
    expect(payment).toBeTruthy()
    paymentId = payment!.id

    const ledger = await prisma.supplierLedgerEntry.findUnique({
      where: { paymentTransactionId: paymentId },
    })
    expect(ledger).toBeTruthy()
    expect(ledger!.status).toBe(SUPPLIER_LEDGER_STATUS.PENDING)
    expect(ledger!.supplierId).toBe(supplierId)
    expect(ledger!.customerNameSnapshot).toBe('DÜNYA KUPASI Organizasyon')
    expect(ledger!.description).toContain('Mail Order')
  })

  it('admin onay → müşteri bakiyesi düşer, tedarikçi cari APPROVED', async () => {
    if (!paymentId) return

    const before = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })
    const payment = await prisma.paymentTransaction.findUniqueOrThrow({ where: { id: paymentId } })
    const amount = Number(payment.amount)

    const res = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/payments/${paymentId}/approve`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { approvalNote: 'Onaylandı' },
    })
    expect(res.statusCode).toBe(200)

    const after = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })
    expect(Number(after.paidAmount)).toBe(Number(before.paidAmount) + amount)

    const ledger = await prisma.supplierLedgerEntry.findUnique({
      where: { paymentTransactionId: paymentId },
    })
    expect(ledger!.status).toBe(SUPPLIER_LEDGER_STATUS.APPROVED)
    expect(Number(ledger!.creditAmount)).toBe(amount)
  })
})
