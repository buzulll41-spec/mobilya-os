import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { PrismaClient } from '@prisma/client'
import { buildApp } from '../src/app.js'
import type { FastifyInstance } from 'fastify'
import { SHIPMENT_OPERATION_STATUS } from '../src/constants/shipmentStatuses.js'

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('shipment operations integration', () => {
  let app: FastifyInstance
  const prisma = new PrismaClient()
  let orderId = ''
  let lineId = ''
  let shipmentId = ''

  beforeAll(async () => {
    app = await buildApp()
    await app.ready()

    const createRes = await app.inject({
      method: 'POST',
      url: '/v1/orders',
      payload: {
        customerName: 'Sevk Test',
        paidAmount: 10_000,
        status: 'Hazır',
        lines: [{ title: 'Dolap seti', quantity: 3, unitPrice: 10_000, sortOrder: 0 }],
      },
    })
    orderId = (createRes.json() as { id: string }).id
    const lines = await prisma.orderLine.findMany({ where: { salesOrderId: orderId } })
    lineId = lines[0]?.id ?? ''

    const shipRes = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/shipments`,
      payload: {
        plannedDate: '2026-05-20',
        crewName: 'Ekip A',
        vehicleNote: 'Kamyon 12',
        note: 'İlk sevk',
        lines: [{ orderLineId: lineId, qty: 1 }],
        allowReceivingRisk: true,
      },
    })
    expect(shipRes.statusCode).toBe(201)
    shipmentId = (shipRes.json() as { shipment: { id: string } }).shipment.id
  })

  afterAll(async () => {
    if (orderId) {
      await prisma.domainEvent.deleteMany({ where: { aggregateId: orderId } })
      await prisma.shipmentLine.deleteMany({ where: { shipment: { salesOrderId: orderId } } })
      await prisma.shipment.deleteMany({ where: { salesOrderId: orderId } })
      await prisma.orderMissingItem.deleteMany({ where: { orderId } })
      await prisma.paymentTransaction.deleteMany({ where: { salesOrderId: orderId } })
      await prisma.orderLine.deleteMany({ where: { salesOrderId: orderId } })
      await prisma.salesOrder.delete({ where: { id: orderId } }).catch(() => undefined)
    }
    await app.close()
    await prisma.$disconnect()
  })

  it('POST shipment → PLANNED + shipment.planned event', async () => {
    const row = await prisma.shipment.findUniqueOrThrow({ where: { id: shipmentId } })
    expect(row.status).toBe(SHIPMENT_OPERATION_STATUS.PLANNED)
    expect(row.crewName).toBe('Ekip A')
    expect(row.plannedShipDate).not.toBeNull()
    if (row.plannedShipDate) {
      const iso = row.plannedShipDate.toISOString().slice(0, 10)
      expect(['2026-05-19', '2026-05-20']).toContain(iso)
    }

    const ev = await prisma.domainEvent.findMany({
      where: {
        aggregateId: orderId,
        type: { in: ['shipment.planned', 'shipment.partial'] },
      },
    })
    expect(ev.length).toBeGreaterThanOrEqual(1)

    const overrideEv = await prisma.domainEvent.findMany({
      where: { aggregateId: orderId, type: 'policy.override' },
    })
    expect(overrideEv.length).toBeGreaterThanOrEqual(1)
    const payload = overrideEv[0].payload as { code?: string; context?: string }
    expect(payload.code).toBe('allowReceivingRisk')
    expect(payload.context).toBe('shipment.create')
  })

  it('GET /v1/shipments returns planned queue row with plannedShipDate', async () => {
    const planRes = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/shipments`,
      payload: {
        plannedDate: '2026-05-13',
        crewName: 'May 13 crew',
        lines: [{ orderLineId: lineId, qty: 1 }],
        allowReceivingRisk: true,
      },
    })
    expect(planRes.statusCode).toBe(201)
    const may13Id = (planRes.json() as { shipment: { id: string } }).shipment.id

    const res = await app.inject({ method: 'GET', url: '/v1/shipments' })
    expect(res.statusCode).toBe(200)
    const rows = res.json() as { shipmentId: string; plannedShipDate: string | null }[]
    const may13 = rows.find((r) => r.shipmentId === may13Id)
    expect(may13).toBeDefined()
    expect(may13?.plannedShipDate).toBe('2026-05-13')
  })

  async function advanceTo(status: string, extra: Record<string, unknown> = {}) {
    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/shipments/${shipmentId}/status`,
      payload: { status, ...extra },
    })
    expect(res.statusCode).toBe(200)
    return res.json() as { shipment: { status: string }; order: Record<string, unknown> }
  }

  it('status PLANNED → LOADED → DISPATCHED → DELIVERED', async () => {
    let body = await advanceTo(SHIPMENT_OPERATION_STATUS.LOADED)
    expect(body.shipment.status).toBe(SHIPMENT_OPERATION_STATUS.LOADED)

    body = await advanceTo(SHIPMENT_OPERATION_STATUS.DISPATCHED)
    expect(body.shipment.status).toBe(SHIPMENT_OPERATION_STATUS.DISPATCHED)

    body = await advanceTo(SHIPMENT_OPERATION_STATUS.DELIVERED)
    expect(body.shipment.status).toBe(SHIPMENT_OPERATION_STATUS.DELIVERED)
    expect(body.order.displayStatus).toBe('Teslim Edildi')
    expect(body.order.installationPending).toBe(true)
  })

  it('DELIVERED sonrası INSTALLATION_DONE → installationState DONE', async () => {
    const body = await advanceTo(SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE)
    expect(body.shipment.status).toBe(SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE)
    expect(body.order.installationPending).toBe(false)

    const op = body.order.operationalState as { installationState: string }
    expect(op.installationState).toBe('DONE')
  })

  it('ISSUE shipment → risk HIGH', async () => {
    const create2 = await app.inject({
      method: 'POST',
      url: `/v1/orders/${orderId}/shipments`,
      payload: {
        plannedDate: '2026-05-22',
        crewName: 'Ekip B',
        lines: [{ orderLineId: lineId, qty: 1 }],
        allowReceivingRisk: true,
      },
    })
    const id2 = (create2.json() as { shipment: { id: string } }).shipment.id

    const res = await app.inject({
      method: 'PATCH',
      url: `/v1/shipments/${id2}/status`,
      payload: { status: SHIPMENT_OPERATION_STATUS.ISSUE, issueNote: 'Montaj aksesuar eksik' },
    })
    expect(res.statusCode).toBe(200)
    const order = (res.json() as { order: { currentRiskSeverity: string; hasShipmentIssue: boolean } }).order
    expect(order.hasShipmentIssue).toBe(true)
    expect(order.currentRiskSeverity).toBe('HIGH')

    const ev = await prisma.domainEvent.findMany({
      where: { aggregateId: orderId, type: 'installation.issue' },
    })
    expect(ev.length).toBeGreaterThanOrEqual(1)
  })
})
