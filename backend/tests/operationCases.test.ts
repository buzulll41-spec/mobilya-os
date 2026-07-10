import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { buildActions, type ActionCenterQuery } from '../src/services/getActionCenter.js'
import {
  buildCases,
  buildCaseCores,
  buildCaseTimeline,
} from '../src/services/getOperationCases.js'
import {
  resetCaseStore,
  updateOperationCase,
  getCaseOverrides,
} from '../src/services/updateOperationCase.js'
import { aggregateProfitability, type ProfitOrderInput } from '../src/services/getProfitabilityAnalytics.js'
import { evaluateDataQuality, type DataQualityRecordInput } from '../src/services/getDataQualityReport.js'
import { buildForecast } from '../src/services/getForecastEngine.js'
import { numberToMoney, type Money } from '../src/lib/money.js'
import type { SalesOrderListItemDto } from '../src/projection/salesOrderListItemProjection.js'
import type { ActionCenterResponseDto } from '../src/contracts/actionCenterDto.js'

const TODAY = '2026-05-15'
const MAY = { from: '2026-05-01', to: '2026-05-31' }

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
  query?: ActionCenterQuery
}

/** Faz 8 buildActions çıktısını (vaka motorunun girdisi) üretir. */
function actionsFrom(opts: SetupOpts = {}): ActionCenterResponseDto {
  const orders = opts.orders ?? []
  const supplierRes = aggregateProfitability(orders, { ...MAY, groupBy: 'supplier' })
  const forecast = buildForecast({
    today: TODAY,
    profitOrders: orders,
    shipmentWindows: { last30: 0, last60: 0, last90: 0 },
    dataQuality: { currentScore: 100, previousScore: 100 },
    query: { salesPerson: opts.query?.salesPerson, limitedView: opts.query?.limitedView },
  })
  return buildActions({
    today: TODAY,
    listItems: opts.listItems ?? [],
    dq: dqFrom(opts.records ?? []),
    forecast,
    supplierRes,
    overrides: new Map(),
    query: opts.query ?? {},
  })
}

type CaseQuery = { priority?: string; status?: string; q?: string }

/** Vaka motorunu (buildCases) çalıştırır — store override'larını uygular. */
function casesFrom(opts: SetupOpts = {}, caseQuery: CaseQuery = {}) {
  const actionResult = actionsFrom(opts)
  return buildCases({
    actionResult,
    overrides: getCaseOverrides(),
    orders: opts.listItems ?? [],
    query: caseQuery,
  })
}

const findCase = (res: ReturnType<typeof casesFrom>, caseNumber: string) =>
  res.cases.find((c) => c.caseNumber === caseNumber)

describe('buildCases — vaka motoru', () => {
  beforeEach(() => resetCaseStore())

  it('1. aynı siparişe ait görevler (order + orderLine) tek vakada gruplanır', () => {
    const items = [
      li({
        id: 'O1',
        displayStatus: 'Hazır', // shipment-ready (P2)
        totalAmount: m(20000),
        remainingAmount: m(15000),
        currentRiskSeverity: 'HIGH', // collection-call (P1)
      }),
    ]
    // Aynı siparişe (O1) ait orderLine veri kalitesi görevi
    const records = [dqRecord({ orderLineId: 'L1', orderId: 'O1', soldUnitCost: null })]
    const res = casesFrom({ listItems: items, records })
    const c = findCase(res, 'CASE-O1')
    expect(c).toBeTruthy()
    // collection-call + shipment-ready + dq-zero-cost → 3 görev tek vakada
    expect(c!.actionCount).toBe(3)
    expect(c!.orderIds).toEqual(['O1'])
  })

  it('2. vaka önceliği içindeki görevlerin en yükseğidir (P1)', () => {
    const items = [
      li({ id: 'O1', displayStatus: 'Hazır', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' }),
    ]
    const res = casesFrom({ listItems: items })
    const c = findCase(res, 'CASE-O1')
    expect(c!.priority).toBe('P1')
  })

  it('3. vaka sahibi atanır (updateOperationCase owner)', () => {
    const items = [li({ id: 'O1', openMissingItemsCount: 1 })]
    updateOperationCase('CASE-O1', { ownerUserId: 'u-1', ownerRole: 'OPERATION' })
    const res = casesFrom({ listItems: items })
    const c = findCase(res, 'CASE-O1')
    expect(c!.ownerUserId).toBe('u-1')
    expect(c!.ownerRole).toBe('OPERATION')
  })

  it('4. timeline oluşur (vaka oluşturuldu + her görev eklendi)', () => {
    const items = [li({ id: 'O1', displayStatus: 'Hazır', openMissingItemsCount: 1 })]
    const cores = buildCaseCores(actionsFrom({ listItems: items }).actions, new Map())
    const core = cores.find((c) => c.caseNumber === 'CASE-O1')!
    const timeline = buildCaseTimeline(core, undefined)
    expect(timeline.some((e) => e.type === 'CASE_CREATED')).toBe(true)
    const added = timeline.filter((e) => e.type === 'ACTION_ADDED')
    expect(added.length).toBe(core.actions.length)
  })

  it('5. vaka kapanır (CLOSED + closedAt)', () => {
    const items = [li({ id: 'O1', openMissingItemsCount: 1 })]
    const rec = updateOperationCase('CASE-O1', { status: 'CLOSED' })
    expect(rec.status).toBe('CLOSED')
    expect(rec.closedAt).toBeTruthy()
    const res = casesFrom({ listItems: items })
    const c = findCase(res, 'CASE-O1')
    expect(c!.status).toBe('CLOSED')
    expect(c!.closedAt).toBeTruthy()
  })

  it('6. durum değişikliği sonraki getOperationCases çıktısına yansır', () => {
    const items = [li({ id: 'O9', openMissingItemsCount: 1 })]
    const before = casesFrom({ listItems: items })
    expect(findCase(before, 'CASE-O9')!.status).toBe('OPEN')

    updateOperationCase('CASE-O9', { status: 'ASSIGNED' })
    const after = casesFrom({ listItems: items })
    expect(findCase(after, 'CASE-O9')!.status).toBe('ASSIGNED')
  })

  it('7. GET liste çalışır (saf buildCases birim) — özet alanları döner', () => {
    const items = [
      li({ id: 'O1', openMissingItemsCount: 1 }), // P1
      li({ id: 'O2', displayStatus: 'Hazır' }), // P2
    ]
    const res = casesFrom({ listItems: items })
    expect(Array.isArray(res.cases)).toBe(true)
    expect(res.cases.length).toBe(2)
    expect(res.summary.openCases).toBe(2)
    expect(res.summary.p1Cases).toBe(1)
    expect(res.summary.unassigned).toBe(2)
    expect(res.cases[0].priority).toBe('P1') // P1 üstte
  })

  it('8. GET detay çalışır — ilişkili görevler ve sipariş türetilir', () => {
    const items = [li({ id: 'O1', displayStatus: 'Hazır', openMissingItemsCount: 1 })]
    const cores = buildCaseCores(actionsFrom({ listItems: items }).actions, new Map())
    const core = cores.find((c) => c.caseNumber === 'CASE-O1')!
    expect(core.actions.length).toBeGreaterThan(0)
    expect(core.orderIds).toEqual(['O1'])
    expect(core.primaryOrderNumber).toBe('O1')
  })

  it('9. PATCH çalışır (updateOperationCase) + geçersiz değer/geçiş reddedilir', () => {
    const rec = updateOperationCase('CASE-Z', { status: 'ASSIGNED' })
    expect(rec.status).toBe('ASSIGNED')
    // geçersiz değer
    expect(() => updateOperationCase('CASE-Z2', { status: 'BOGUS' as never })).toThrow()
    // geçersiz geçiş: CLOSED → OPEN
    updateOperationCase('CASE-Z3', { status: 'CLOSED' })
    expect(() => updateOperationCase('CASE-Z3', { status: 'OPEN' })).toThrow()
  })

  it('10. filtre çalışır (priority / status / q)', () => {
    const items = [
      li({ id: 'O1', openMissingItemsCount: 1 }), // P1
      li({ id: 'O2', displayStatus: 'Hazır' }), // P2
    ]
    const onlyP1 = casesFrom({ listItems: items }, { priority: 'P1' })
    expect(onlyP1.cases.length).toBeGreaterThan(0)
    expect(onlyP1.cases.every((c) => c.priority === 'P1')).toBe(true)

    const onlyOpen = casesFrom({ listItems: items }, { status: 'OPEN' })
    expect(onlyOpen.cases.every((c) => c.status === 'OPEN')).toBe(true)

    const byQ = casesFrom({ listItems: items }, { q: 'O2' })
    expect(byQ.cases.every((c) => c.caseNumber.includes('O2'))).toBe(true)
  })

  it('11. boş veri kırılmaz', () => {
    const res = casesFrom({})
    expect(Array.isArray(res.cases)).toBe(true)
    expect(res.cases.length).toBe(0)
    expect(res.summary.openCases).toBe(0)
    expect(res.summary.avgResolutionHours).toBe(0)
  })

  it('12. Depo Katı / WAREHOUSE vaka üretmez', () => {
    const orders: ProfitOrderInput[] = [
      {
        id: 'M1', orderDate: '2026-05-10', salesPerson: 'Furkan', customerName: 'A', paidAmount: 0, remainingAmount: 30000, riskLevel: 'HIGH',
        lines: [{ lineTotal: 30000, qtyOrdered: 1, soldUnitCost: 18000, soldSalesSourceType: 'STOCK_ITEM', soldDisplayFloor: null, soldExternalSupplyType: null, supplierId: 'S1', supplierName: 'Tedarikçi A', category: null, brand: null, productId: null, productTitle: 'Ürün' }],
      },
    ]
    const items = [li({ id: 'M1', totalAmount: m(30000), remainingAmount: m(30000), currentRiskSeverity: 'HIGH' })]
    const res = casesFrom({ listItems: items, orders, records: [dqRecord({ orderLineId: 'L9', orderId: 'M1', soldUnitCost: null })] })
    expect(res.cases.length).toBeGreaterThan(0)
    expect(JSON.stringify(res.cases)).not.toContain('Depo Katı')
    expect(JSON.stringify(res.cases)).not.toContain('WAREHOUSE')
  })

  it('13. SALES limitedView yalnızca kendi vakalarını döndürür', () => {
    const items = [
      li({ id: 'O1', salesPerson: 'Furkan', openMissingItemsCount: 2 }),
      li({ id: 'O2', salesPerson: 'Aslı', openMissingItemsCount: 1 }),
    ]
    const all = casesFrom({ listItems: items })
    expect(findCase(all, 'CASE-O1')).toBeTruthy()
    expect(findCase(all, 'CASE-O2')).toBeTruthy()

    const limited = casesFrom({ listItems: items, query: { limitedView: true, salesPerson: 'Furkan' } })
    expect(findCase(limited, 'CASE-O1')).toBeTruthy()
    expect(findCase(limited, 'CASE-O2')).toBeFalsy()
    expect(limited.filters.limitedView).toBe(true)
  })
})

/* ── Canlı smoke (app.inject) ── */

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET/PATCH /v1/reports/operation-cases (canlı)', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })
  afterAll(async () => {
    await app.close()
  })
  beforeEach(() => {
    resetCaseStore()
  })

  it('14a. GET liste endpoint 200 ve beklenen şekil', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/operation-cases' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as any
    expect(body.summary).toBeTruthy()
    expect(Array.isArray(body.cases)).toBe(true)
    expect(typeof body.summary.openCases).toBe('number')
    expect(JSON.stringify(body.cases)).not.toContain('Depo Katı')
  })

  it('14b. GET detay + PATCH geçerli 200; geçersiz 400', async () => {
    const list = await app.inject({ method: 'GET', url: '/v1/reports/operation-cases' })
    const body = list.json() as any
    const first = body.cases[0]
    if (first) {
      const detail = await app.inject({
        method: 'GET',
        url: `/v1/reports/operation-cases/${encodeURIComponent(first.id)}`,
      })
      expect(detail.statusCode).toBe(200)
      expect((detail.json() as any).case.id).toBe(first.id)

      const ok = await app.inject({
        method: 'PATCH',
        url: `/v1/reports/operation-cases/${encodeURIComponent(first.id)}`,
        payload: { status: 'ASSIGNED' },
      })
      expect(ok.statusCode).toBe(200)
      expect((ok.json() as any).status).toBe('ASSIGNED')
    }
    const bad = await app.inject({
      method: 'PATCH',
      url: '/v1/reports/operation-cases/some-id',
      payload: { status: 'NOPE' },
    })
    expect(bad.statusCode).toBe(400)
  })
})
