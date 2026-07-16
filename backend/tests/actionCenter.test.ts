import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { buildActions, type ActionCenterQuery } from '../src/services/getActionCenter.js'
import {
  resetActionStatusStore,
  updateActionStatus,
  getActionStatusOverrides,
} from '../src/services/updateActionStatus.js'
import { aggregateProfitability, type ProfitOrderInput } from '../src/services/getProfitabilityAnalytics.js'
import { evaluateDataQuality, type DataQualityRecordInput } from '../src/services/getDataQualityReport.js'
import { buildForecast } from '../src/services/getForecastEngine.js'
import { numberToMoney, type Money } from '../src/lib/money.js'
import type { SalesOrderListItemDto } from '../src/projection/salesOrderListItemProjection.js'
import type { ActionStatusOverride } from '../src/services/updateActionStatus.js'

const TODAY = '2026-05-15'
const MAY = { from: '2026-05-01', to: '2026-05-31' }
const APR = { from: '2026-04-01', to: '2026-04-30' }

function m(v: number): Money {
  return numberToMoney(v, 'TRY')
}

/** Minimal SalesOrderListItemDto fabrikası (varsayılan: temiz, riski yok). */
function li(p: Partial<SalesOrderListItemDto> & { id: string }): SalesOrderListItemDto {
  return {
    id: p.id,
    orderNumber: p.orderNumber ?? p.id,
    customerId: p.customerId ?? `C-${p.id}`,
    customerDisplayName: p.customerDisplayName ?? 'Müşteri',
    customerPhone: p.customerPhone ?? null,
    channel: p.channel ?? 'STORE',
    currency: p.currency ?? 'TRY',
    placedAt: p.placedAt ?? '2026-05-01T10:00:00.000Z',
    lifecycleStatus: p.lifecycleStatus ?? 'IN_FULFILLMENT',
    version: p.version ?? 1,
    subtotalAmount: p.subtotalAmount ?? m(0),
    discountAmount: p.discountAmount ?? m(0),
    totalAmount: p.totalAmount ?? m(0),
    amountPaid: p.amountPaid ?? m(0),
    amountDue: p.amountDue ?? m(0),
    remainingAmount: p.remainingAmount ?? m(0),
    fulfillmentProgress: p.fulfillmentProgress ?? 0.3,
    currentRiskSeverity: p.currentRiskSeverity ?? 'NONE',
    earliestCommittedShipBy: p.earliestCommittedShipBy ?? null,
    latestCommittedShipBy: p.latestCommittedShipBy ?? null,
    lineSummaryTitle: p.lineSummaryTitle ?? 'Ürün',
    displayStatus: p.displayStatus ?? 'Üretimde',
    plannedShipmentDate: p.plannedShipmentDate ?? null,
    salesPerson: p.salesPerson ?? null,
    lineCostAmount: p.lineCostAmount ?? null,
    notesSnapshot: p.notesSnapshot ?? null,
    ...(p.hasOverdueBalance !== undefined ? { hasOverdueBalance: p.hasOverdueBalance } : {}),
    ...(p.openMissingItemsCount !== undefined ? { openMissingItemsCount: p.openMissingItemsCount } : {}),
  }
}

function dqFrom(records: DataQualityRecordInput[]) {
  return evaluateDataQuality(records, {})
}

function dqRecord(p: Partial<DataQualityRecordInput> & { orderLineId: string }): DataQualityRecordInput {
  return {
    orderLineId: p.orderLineId,
    orderId: p.orderId ?? `O-${p.orderLineId}`,
    orderDate: p.orderDate ?? '2026-05-10',
    customerName: p.customerName ?? 'Müşteri',
    productTitle: p.productTitle ?? 'Ürün',
    salesPerson: p.salesPerson ?? null,
    soldSalesSourceType: 'soldSalesSourceType' in p ? (p.soldSalesSourceType ?? null) : 'STOCK_ITEM',
    soldDisplayFloor: p.soldDisplayFloor ?? null,
    soldExternalSupplyType: p.soldExternalSupplyType ?? null,
    soldUnitCost: 'soldUnitCost' in p ? (p.soldUnitCost ?? null) : 1000,
  }
}

type SetupOpts = {
  listItems?: SalesOrderListItemDto[]
  records?: DataQualityRecordInput[]
  orders?: ProfitOrderInput[]
  overrides?: Map<string, ActionStatusOverride>
  query?: ActionCenterQuery
}

function setup(opts: SetupOpts = {}) {
  const orders = opts.orders ?? []
  const supplierRes = aggregateProfitability(orders, { ...MAY, groupBy: 'supplier' })
  const forecast = buildForecast({
    today: TODAY,
    profitOrders: orders,
    shipmentWindows: { last30: 0, last60: 0, last90: 0 },
    dataQuality: { currentScore: 100, previousScore: 100 },
    query: {},
  })
  return buildActions({
    today: TODAY,
    listItems: opts.listItems ?? [],
    dq: dqFrom(opts.records ?? []),
    forecast,
    supplierRes,
    overrides: opts.overrides ?? new Map(),
    query: opts.query ?? {},
  })
}

const find = (res: ReturnType<typeof setup>, id: string) => res.actions.find((a) => a.id === id)

describe('buildActions — görev motoru', () => {
  it('1. yüksek riskli açık bakiye → P1 tahsilat görüşmesi görevi', () => {
    const items = [
      li({
        id: 'O1',
        customerDisplayName: 'Açık Bakiye Ltd',
        totalAmount: m(20000),
        remainingAmount: m(15000),
        currentRiskSeverity: 'HIGH',
      }),
    ]
    const res = setup({ listItems: items })
    const a = find(res, 'collection-call:O1')
    expect(a).toBeTruthy()
    expect(a!.priority).toBe('P1')
    expect(a!.category).toBe('COLLECTION')
    expect(a!.relatedEntityType).toBe('order')
    expect(Number(a!.evidence.openPercent)).toBeGreaterThan(50)
  })

  it('2. planlanan sevk geçmiş + teslim edilmemiş → P1 sevk görevi', () => {
    const items = [
      li({ id: 'O2', displayStatus: 'Üretimde', plannedShipmentDate: '2026-05-01' }),
    ]
    const res = setup({ listItems: items })
    const a = find(res, 'shipment-overdue:O2')
    expect(a).toBeTruthy()
    expect(a!.priority).toBe('P1')
    expect(a!.category).toBe('SHIPMENT')
    expect(Number(a!.evidence.lateDays)).toBeGreaterThan(0)
  })

  it('3. ZERO_COST → P1 alış maliyetini düzelt görevi', () => {
    const res = setup({ records: [dqRecord({ orderLineId: 'L1', soldUnitCost: null })] })
    const a = find(res, 'dq-zero-cost:L1')
    expect(a).toBeTruthy()
    expect(a!.priority).toBe('P1')
    expect(a!.category).toBe('DATA_QUALITY')
    expect(a!.relatedEntityType).toBe('orderLine')
  })

  it('4. UNKNOWN_SOURCE → P2 satış kaynağını tamamla görevi', () => {
    const res = setup({ records: [dqRecord({ orderLineId: 'L2', soldSalesSourceType: null, soldUnitCost: 1000 })] })
    const a = find(res, 'dq-unknown:L2')
    expect(a).toBeTruthy()
    expect(a!.priority).toBe('P2')
    expect(a!.category).toBe('DATA_QUALITY')
  })

  it('5. öncelik sıralaması artan (P1 → P5)', () => {
    const items = [
      li({ id: 'O1', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' }),
      li({ id: 'O2', displayStatus: 'Hazır' }), // P2 shipment-ready
    ]
    const res = setup({ listItems: items, records: [dqRecord({ orderLineId: 'L3', soldDisplayFloor: null, soldSalesSourceType: 'IN_STORE_DISPLAY', soldUnitCost: 1000 })] })
    const ranks = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 } as const
    const seq = res.actions.map((a) => ranks[a.priority])
    const sorted = [...seq].sort((x, y) => x - y)
    expect(seq).toEqual(sorted)
  })

  it('6. durum değişikliği sonraki getActionCenter çıktısına yansır', () => {
    resetActionStatusStore()
    const items = [li({ id: 'O9', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' })]
    const before = setup({ listItems: items, overrides: getActionStatusOverrides() })
    expect(find(before, 'collection-call:O9')!.status).toBe('OPEN')

    const rec = updateActionStatus('collection-call:O9', 'ASSIGNED')
    expect(rec.status).toBe('ASSIGNED')

    const after = setup({ listItems: items, overrides: getActionStatusOverrides() })
    expect(find(after, 'collection-call:O9')!.status).toBe('ASSIGNED')
    resetActionStatusStore()
  })

  it('7. tamamlanan görev listede COMPLETED olarak görünür ve özete yansır', () => {
    resetActionStatusStore()
    const items = [li({ id: 'O7', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' })]
    updateActionStatus('collection-call:O7', 'COMPLETED')
    const res = setup({ listItems: items, overrides: getActionStatusOverrides() })
    const a = find(res, 'collection-call:O7')
    expect(a!.status).toBe('COMPLETED')
    expect(res.summary.completedCount).toBe(1)
    expect(res.summary.completionRate).toBe(100)
    resetActionStatusStore()
  })

  it('8. filtreler çalışır (priority + category)', () => {
    const items = [
      li({ id: 'O1', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' }), // P1 COLLECTION
      li({ id: 'O2', displayStatus: 'Hazır' }), // P2 SHIPMENT
    ]
    const onlyP1 = setup({ listItems: items, query: { priority: 'P1' } })
    expect(onlyP1.actions.length).toBeGreaterThan(0)
    expect(onlyP1.actions.every((a) => a.priority === 'P1')).toBe(true)

    const onlyShip = setup({ listItems: items, query: { category: 'SHIPMENT' } })
    expect(onlyShip.actions.every((a) => a.category === 'SHIPMENT')).toBe(true)
  })

  it('10. boş veri kırılmaz', () => {
    const res = setup({})
    expect(Array.isArray(res.actions)).toBe(true)
    expect(res.actions.length).toBe(0)
    expect(res.summary.totalOpen).toBe(0)
    expect(res.summary.completionRate).toBe(0)
  })

  it('11. Depo Katı / WAREHOUSE görev üretmez', () => {
    const orders: ProfitOrderInput[] = [
      {
        id: 'M1', orderDate: '2026-05-10', salesPerson: 'Furkan', customerName: 'A', paidAmount: 0, remainingAmount: 30000, riskLevel: 'HIGH',
        lines: [{ lineTotal: 30000, qtyOrdered: 1, soldUnitCost: 18000, soldSalesSourceType: 'STOCK_ITEM', soldDisplayFloor: null, soldExternalSupplyType: null, supplierId: 'S1', supplierName: 'Tedarikçi A', category: null, brand: null, productId: null, productTitle: 'Ürün' }],
      },
    ]
    const items = [li({ id: 'M1', totalAmount: m(30000), remainingAmount: m(30000), currentRiskSeverity: 'HIGH' })]
    const res = setup({ listItems: items, orders, records: [dqRecord({ orderLineId: 'L9', soldUnitCost: null })] })
    expect(res.actions.length).toBeGreaterThan(0)
    expect(JSON.stringify(res.actions)).not.toContain('Depo Katı')
    expect(JSON.stringify(res.actions)).not.toContain('WAREHOUSE')
  })

  it('12. P1 görevler önce gelir', () => {
    const items = [
      li({ id: 'O2', displayStatus: 'Hazır' }), // P2
      li({ id: 'O1', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' }), // P1
    ]
    const res = setup({ listItems: items })
    expect(res.actions[0].priority).toBe('P1')
  })

  it('13a. updateActionStatus geçersiz status reddedilir', () => {
    resetActionStatusStore()
    expect(() => updateActionStatus('x', 'BOGUS' as never)).toThrow()
  })

  it('13b. updateActionStatus geçerli geçişte kayıt döndürür', () => {
    resetActionStatusStore()
    const rec = updateActionStatus('collection-call:Z1', 'ASSIGNED')
    expect(rec.status).toBe('ASSIGNED')
    expect(typeof rec.lastActionAt).toBe('string')
    resetActionStatusStore()
  })

  it('14. eksik ürün → P1 tedarik görevi; SALES limitedView yalnızca kendi görevleri', () => {
    const items = [
      li({ id: 'O1', salesPerson: 'Furkan', openMissingItemsCount: 2 }),
      li({ id: 'O2', salesPerson: 'Aslı', openMissingItemsCount: 1 }),
    ]
    const all = setup({ listItems: items })
    expect(find(all, 'shipment-missing:O1')).toBeTruthy()
    expect(find(all, 'shipment-missing:O2')).toBeTruthy()

    const limited = setup({ listItems: items, query: { limitedView: true, salesPerson: 'Furkan' } })
    expect(find(limited, 'shipment-missing:O1')).toBeTruthy()
    expect(find(limited, 'shipment-missing:O2')).toBeFalsy()
    expect(limited.filters.limitedView).toBe(true)
  })

  it('15. shipment lifecycle statüleri ilgili SHIPMENT action üretir', () => {
    const items = [
      li({ id: 'SR1', displayStatus: 'Hazır' }),
      li({ id: 'SP1', displayStatus: 'Sevk Planlandı' }),
      li({ id: 'SS1', displayStatus: 'Yola Çıktı' }),
      li({ id: 'SD1', displayStatus: 'Teslim Edildi' }),
    ]

    const res = setup({ listItems: items })

    const ready = find(res, 'shipment-lifecycle-ready:SR1')
    const planned = find(res, 'shipment-lifecycle-planned:SP1')
    const started = find(res, 'shipment-lifecycle-started:SS1')
    const delivered = find(res, 'shipment-lifecycle-delivered:SD1')

    expect(ready?.category).toBe('SHIPMENT')
    expect(ready?.title).toBe('ShipmentReadyAction')

    expect(planned?.category).toBe('SHIPMENT')
    expect(planned?.title).toBe('ShipmentPlannedAction')

    expect(started?.category).toBe('SHIPMENT')
    expect(started?.title).toBe('ShipmentStartedAction')

    expect(delivered?.category).toBe('SHIPMENT')
    expect(delivered?.title).toBe('ShipmentDeliveredAction')
  })
})

/* ── Canlı smoke (app.inject) ── */

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET/PATCH /v1/reports/action-center (canlı)', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })
  afterAll(async () => {
    await app.close()
  })
  beforeEach(() => {
    resetActionStatusStore()
  })

  it('9. GET endpoint 200 ve beklenen şekil', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/action-center' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as any
    expect(body.summary).toBeTruthy()
    expect(Array.isArray(body.actions)).toBe(true)
    expect(typeof body.summary.totalOpen).toBe('number')
    expect(JSON.stringify(body.actions)).not.toContain('Depo Katı')
  })

  it('13c. PATCH geçerli durum 200; geçersiz 400', async () => {
    const list = await app.inject({ method: 'GET', url: '/v1/reports/action-center' })
    const body = list.json() as any
    const first = body.actions[0]
    if (first) {
      const ok = await app.inject({
        method: 'PATCH',
        url: `/v1/reports/action-center/${encodeURIComponent(first.id)}`,
        payload: { status: 'ASSIGNED' },
      })
      expect(ok.statusCode).toBe(200)
      expect((ok.json() as any).status).toBe('ASSIGNED')
    }
    const bad = await app.inject({
      method: 'PATCH',
      url: '/v1/reports/action-center/some-id',
      payload: { status: 'NOPE' },
    })
    expect(bad.statusCode).toBe(400)
  })
})
