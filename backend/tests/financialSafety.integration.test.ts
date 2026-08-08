import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { Prisma, PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import { SUPPLIER_LEDGER_ENTRY_TYPE } from '../src/constants/supplierLedgerEntryTypes.js'
import { postOrderPayment } from '../src/services/postOrderPayment.js'
import { postSupplierPayment } from '../src/services/postSupplierPayment.js'
import { appendSupplierLedgerCredit } from '../src/services/postSupplierPayment.js'
import { loadSupplierBalanceSnapshot } from '../src/services/supplierBalance.js'

const hasDb = Boolean(process.env.DATABASE_URL)
const ADMIN_EMAIL = 'admin@mobilya.local'
const ADMIN_PASSWORD = 'admin123'
const TEST_TODAY = '2026-05-14'

type AuthUser = {
  id: string
  fullName: string
  email: string
  role: typeof USER_ROLE.FINANCE
}

const financeUser: AuthUser = {
  id: 'user-finance-integration-test',
  fullName: 'Finance Integration Test',
  email: 'finance.integration@test.local',
  role: USER_ROLE.FINANCE,
}

function orderIdFor(tag: string) {
  return `SO-FIN-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function supplierIdFor(tag: string) {
  return `SUP-FIN-${tag}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

async function createOrder(prisma: PrismaClient, totalAmount: number) {
  const id = orderIdFor('ORDER')
  await prisma.salesOrder.create({
    data: {
      id,
      customerName: 'Finans Test Müşteri',
      productSummary: 'Finans Test Ürün',
      displayStatus: 'Bekleniyor',
      currency: 'TRY',
      subtotalAmount: new Prisma.Decimal(totalAmount),
      discountAmount: new Prisma.Decimal(0),
      totalAmount: new Prisma.Decimal(totalAmount),
      paidAmount: new Prisma.Decimal(0),
      remainingAmount: new Prisma.Decimal(totalAmount),
      isFullyPaid: false,
      orderDate: new Date(`${TEST_TODAY}T00:00:00.000Z`),
    },
  })
  return id
}

async function createSupplier(prisma: PrismaClient) {
  const id = supplierIdFor('SUPPLIER')
  await prisma.supplier.create({
    data: {
      id,
      companyName: 'Finans Test Tedarikçi',
      isActive: true,
    },
  })
  await appendSupplierLedgerCredit(prisma, id, {
    amount: 100_000,
    description: 'Açılış bakiyesi',
    occurredAt: new Date(`${TEST_TODAY}T00:00:00.000Z`),
  })
  return id
}

async function loginAdmin(app: FastifyInstance) {
  const res = await app.inject({
    method: 'POST',
    url: '/v1/auth/login',
    payload: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
  })
  expect(res.statusCode).toBe(200)
  return (res.json() as { token: string }).token
}

describe.skipIf(!hasDb)('financial safety integration', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  const createdOrderIds: string[] = []
  const createdSupplierIds: string[] = []
  const originalAuthDisabled = process.env.AUTH_DISABLED

  beforeAll(async () => {
    delete process.env.AUTH_DISABLED
    app = await buildApp()
    await app.ready()
  })

  afterAll(async () => {
    for (const orderId of createdOrderIds) {
      await prisma.domainEvent.deleteMany({ where: { aggregateId: orderId } }).catch(() => undefined)
      await prisma.paymentTransaction.deleteMany({ where: { salesOrderId: orderId } }).catch(() => undefined)
      await prisma.salesOrder.delete({ where: { id: orderId } }).catch(() => undefined)
    }
    for (const supplierId of createdSupplierIds) {
      await prisma.domainEvent.deleteMany({ where: { aggregateId: supplierId } }).catch(() => undefined)
      await prisma.supplierLedgerEntry.deleteMany({ where: { supplierId } }).catch(() => undefined)
      await prisma.supplier.delete({ where: { id: supplierId } }).catch(() => undefined)
    }
    if (app) await app.close()
    await prisma.$disconnect()
    if (originalAuthDisabled === undefined) delete process.env.AUTH_DISABLED
    else process.env.AUTH_DISABLED = originalAuthDisabled
  })

  it('customer payment duplicate + race is single-record and balance-safe', async () => {
    const orderId = await createOrder(prisma, 100_000)
    createdOrderIds.push(orderId)
    const idempotencyKey = `fin-cust-${Date.now()}-dup`

    const first = await postOrderPayment(
      prisma,
      orderId,
      { amount: 20_000, method: 'TRANSFER', idempotencyKey },
      { authUser: financeUser },
    )
    const second = await postOrderPayment(
      prisma,
      orderId,
      { amount: 20_000, method: 'TRANSFER', idempotencyKey },
      { authUser: financeUser },
    )

    expect(first.remainingAmount.amount).toBe('80000.00')
    expect(second.remainingAmount.amount).toBe('80000.00')

    const paymentCount = await prisma.paymentTransaction.count({
      where: { salesOrderId: orderId, idempotencyKey },
    })
    const postedEventCount = await prisma.domainEvent.count({
      where: { aggregateId: orderId, type: 'payment.posted' },
    })
    const row = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })

    expect(paymentCount).toBe(1)
    expect(postedEventCount).toBe(1)
    expect(Number(row.paidAmount)).toBe(20_000)
    expect(Number(row.remainingAmount)).toBe(80_000)

    const raceKey = `fin-cust-${Date.now()}-race`
    const raceResults = await Promise.allSettled([
      postOrderPayment(prisma, orderId, { amount: 10_000, method: 'TRANSFER', idempotencyKey: raceKey }, { authUser: financeUser }),
      postOrderPayment(prisma, orderId, { amount: 10_000, method: 'TRANSFER', idempotencyKey: raceKey }, { authUser: financeUser }),
    ])
    expect(raceResults.every((r) => r.status === 'fulfilled')).toBe(true)

    const racePaymentCount = await prisma.paymentTransaction.count({
      where: { salesOrderId: orderId, idempotencyKey: raceKey },
    })
    const afterRace = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })
    expect(racePaymentCount).toBe(1)
    expect(Number(afterRace.paidAmount)).toBe(30_000)
    expect(Number(afterRace.remainingAmount)).toBe(70_000)

    console.log(
      JSON.stringify({
        case: 'customer-payment',
        duplicateKey: idempotencyKey,
        raceKey,
        paymentCount,
        postedEventCount,
        balanceBefore: 100_000,
        balanceAfterDuplicate: 80_000,
        balanceAfterRace: 70_000,
      }),
    )
  })

  it('supplier payment duplicate + race is single-record and balance-safe', async () => {
    const supplierId = await createSupplier(prisma)
    createdSupplierIds.push(supplierId)
    const idempotencyKey = `fin-sup-${Date.now()}-dup`

    const first = await postSupplierPayment(
      prisma,
      supplierId,
      { amount: 15_000, method: 'CASH', idempotencyKey },
      { authUser: financeUser },
    )
    const second = await postSupplierPayment(
      prisma,
      supplierId,
      { amount: 15_000, method: 'CASH', idempotencyKey },
      { authUser: financeUser },
    )

    expect(first.entry.paymentTransactionId).toBeTruthy()
    expect(second.entry.paymentTransactionId).toBeTruthy()

    const paymentCount = await prisma.supplierLedgerEntry.count({
      where: { supplierId, idempotencyKey, entryType: SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT },
    })
    const ledgerCount = await prisma.supplierLedgerEntry.count({
      where: { supplierId, entryType: SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT },
    })
    const snap = await loadSupplierBalanceSnapshot(prisma, supplierId)

    expect(paymentCount).toBe(1)
    expect(ledgerCount).toBe(1)
    expect(Number(snap.openBalance)).toBe(85_000)

    const raceKey = `fin-sup-${Date.now()}-race`
    const raceResults = await Promise.allSettled([
      postSupplierPayment(prisma, supplierId, { amount: 5_000, method: 'CASH', idempotencyKey: raceKey }, { authUser: financeUser }),
      postSupplierPayment(prisma, supplierId, { amount: 5_000, method: 'CASH', idempotencyKey: raceKey }, { authUser: financeUser }),
    ])
    expect(raceResults.every((r) => r.status === 'fulfilled')).toBe(true)

    const racePaymentCount = await prisma.supplierLedgerEntry.count({
      where: { supplierId, idempotencyKey: raceKey, entryType: SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT },
    })
    const afterRace = await loadSupplierBalanceSnapshot(prisma, supplierId)
    expect(racePaymentCount).toBe(1)
    expect(Number(afterRace.openBalance)).toBe(80_000)

    console.log(
      JSON.stringify({
        case: 'supplier-payment',
        duplicateKey: idempotencyKey,
        raceKey,
        paymentCount,
        ledgerCount,
        balanceBefore: 100_000,
        balanceAfterDuplicate: 85_000,
        balanceAfterRace: 80_000,
      }),
    )
  })

  it('customer transaction atomicity rolls back partial state on failure', async () => {
    const orderId = await createOrder(prisma, 50_000)
    createdOrderIds.push(orderId)
    const paymentId = `PTX-${orderId}-atomic`
    const idempotencyKey = `fin-cust-${Date.now()}-atomic`

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.paymentTransaction.create({
          data: {
            id: paymentId,
            salesOrderId: orderId,
            kind: 'CAPTURE',
            status: 'POSTED',
            amount: new Prisma.Decimal(10_000),
            currency: 'TRY',
            occurredAt: new Date(`${TEST_TODAY}T00:00:00.000Z`),
            idempotencyKey,
          },
        })
        await tx.salesOrder.update({
          where: { id: orderId },
          data: {
            paidAmount: new Prisma.Decimal(10_000),
            remainingAmount: new Prisma.Decimal(40_000),
            isFullyPaid: false,
          },
        })
        await tx.domainEvent.create({
          data: {
            type: 'payment.posted',
            aggregateType: 'SalesOrder',
            aggregateId: orderId,
            occurredAt: new Date(`${TEST_TODAY}T00:00:00.000Z`),
            correlationId: `corr-${orderId}-atomic`,
            payloadSchemaVersion: '1',
            payload: { transactionId: paymentId },
          },
        })
        throw new Error('forced customer rollback')
      }),
    ).rejects.toThrow(/forced customer rollback/)

    const paymentCount = await prisma.paymentTransaction.count({ where: { salesOrderId: orderId, idempotencyKey } })
    const eventCount = await prisma.domainEvent.count({ where: { aggregateId: orderId, type: 'payment.posted' } })
    const row = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })

    expect(paymentCount).toBe(0)
    expect(eventCount).toBe(0)
    expect(Number(row.paidAmount)).toBe(0)
    expect(Number(row.remainingAmount)).toBe(50_000)

    console.log(
      JSON.stringify({
        case: 'customer-atomicity',
        key: idempotencyKey,
        paymentCount,
        eventCount,
        balanceBefore: 50_000,
        balanceAfter: 50_000,
      }),
    )
  })

  it('supplier transaction atomicity rolls back partial state on failure', async () => {
    const supplierId = await createSupplier(prisma)
    createdSupplierIds.push(supplierId)
    const paymentId = `SPAY-${supplierId}-atomic`
    const idempotencyKey = `fin-sup-${Date.now()}-atomic`

    await expect(
      prisma.$transaction(async (tx) => {
        await tx.supplierLedgerEntry.create({
          data: {
            supplierId,
            entryType: SUPPLIER_LEDGER_ENTRY_TYPE.PAYMENT,
            occurredAt: new Date(TEST_TODAY),
            description: 'Atomicity failure probe',
            debitAmount: new Prisma.Decimal(10_000),
            creditAmount: new Prisma.Decimal(0),
            balanceAfter: new Prisma.Decimal(90_000),
            currency: 'TRY',
            paymentMethod: 'CASH',
            paymentTransactionId: paymentId,
            idempotencyKey,
          },
        })
        await tx.domainEvent.create({
          data: {
            type: 'supplier.payment_posted',
            aggregateType: 'Supplier',
            aggregateId: supplierId,
            occurredAt: new Date(TEST_TODAY),
            correlationId: `corr-${supplierId}-atomic`,
            payloadSchemaVersion: '1',
            payload: { paymentTransactionId: paymentId },
          },
        })
        throw new Error('forced supplier rollback')
      }),
    ).rejects.toThrow(/forced supplier rollback/)

    const paymentCount = await prisma.supplierLedgerEntry.count({ where: { supplierId, idempotencyKey } })
    const eventCount = await prisma.domainEvent.count({ where: { aggregateId: supplierId, type: 'supplier.payment_posted' } })
    const snap = await loadSupplierBalanceSnapshot(prisma, supplierId)

    expect(paymentCount).toBe(0)
    expect(eventCount).toBe(0)
    expect(Number(snap.openBalance)).toBe(100_000)

    console.log(
      JSON.stringify({
        case: 'supplier-atomicity',
        key: idempotencyKey,
        paymentCount,
        eventCount,
        balanceBefore: 100_000,
        balanceAfter: 100_000,
      }),
    )
  })

  it('authorized reversal is idempotent and restores balance atomically', async () => {
    const orderId = await createOrder(prisma, 100_000)
    createdOrderIds.push(orderId)
    const paymentKey = `fin-rev-${Date.now()}-pay`
    await postOrderPayment(prisma, orderId, { amount: 20_000, method: 'TRANSFER', idempotencyKey: paymentKey }, { authUser: financeUser })
    const payment = await prisma.paymentTransaction.findFirstOrThrow({ where: { salesOrderId: orderId, idempotencyKey: paymentKey } })

    const token = await loginAdmin(app)
    const reversalKey = `fin-rev-${Date.now()}-rfx`
    const response = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/payments/${payment.id}/reverse`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { idempotencyKey: reversalKey, reversalNote: 'İade kontrolü' },
    })
    expect(response.statusCode).toBe(200)

    const reversed = await prisma.paymentTransaction.findFirstOrThrow({
      where: { salesOrderId: orderId, reversalSourcePaymentId: payment.id },
    })
    const afterReverse = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })

    expect(reversed.reversalSourcePaymentId).toBe(payment.id)
    expect(Number(afterReverse.paidAmount)).toBe(0)
    expect(Number(afterReverse.remainingAmount)).toBe(100_000)

    const duplicateResponse = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/payments/${payment.id}/reverse`,
      headers: { Authorization: `Bearer ${token}` },
      payload: { idempotencyKey: reversalKey, reversalNote: 'İade kontrolü' },
    })
    expect(duplicateResponse.statusCode).toBe(200)

    const paymentCount = await prisma.paymentTransaction.count({ where: { salesOrderId: orderId } })
    const reversalCount = await prisma.paymentTransaction.count({ where: { salesOrderId: orderId, reversalSourcePaymentId: payment.id } })
    const finalRow = await prisma.salesOrder.findUniqueOrThrow({ where: { id: orderId } })

    expect(paymentCount).toBe(2)
    expect(reversalCount).toBe(1)
    expect(Number(finalRow.paidAmount)).toBe(0)
    expect(Number(finalRow.remainingAmount)).toBe(100_000)

    console.log(
      JSON.stringify({
        case: 'reversal',
        paymentKey,
        reversalKey,
        originalPaymentId: payment.id,
        reversalPaymentId: reversed.id,
        paymentCount,
        reversalCount,
        balanceBeforePayment: 100_000,
        balanceAfterPayment: 80_000,
        balanceAfterReversal: 100_000,
      }),
    )
  })
})