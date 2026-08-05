import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { buildActions, type ActionCenterQuery } from '../src/services/getActionCenter.js'
import { buildCases } from '../src/services/getOperationCases.js'
import { buildJobs, getJobOverrides, resetJobStore } from '../src/services/getAutomationJobs.js'
import {
  approveAutomationJob,
  bulkApproveAutomationJobs,
  bulkCancelAutomationJobs,
  cancelAutomationJob,
} from '../src/services/approveAutomationJob.js'
import { bulkRunAutomationJobs, runAutomationJob } from '../src/services/runAutomationJob.js'
import { aggregateProfitability, type ProfitOrderInput } from '../src/services/getProfitabilityAnalytics.js'
import { evaluateDataQuality, type DataQualityRecordInput } from '../src/services/getDataQualityReport.js'
import { buildForecast } from '../src/services/getForecastEngine.js'
import { numberToMoney, type Money } from '../src/lib/money.js'
import type { SalesOrderListItemDto } from '../src/projection/salesOrderListItemProjection.js'

const TODAY = '2026-05-15'
const MAY = { from: '2026-05-01', to: '2026-05-31' }
const APR = { from: '2026-04-01', to: '2026-04-30' }

function m(v: number): Money {
  return numberToMoney(v, 'TRY')
}

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

function jobsFrom(opts: SetupOpts = {}, jobQuery = {}) {
  const orders = opts.orders ?? []
  const supplierRes = aggregateProfitability(orders, { ...MAY, groupBy: 'supplier' })
  const forecast = buildForecast({
    today: TODAY,
    profitOrders: orders,
    shipmentWindows: { last30: 0, last60: 0, last90: 0 },
    dataQuality: { currentScore: 100, previousScore: 100 },
    query: { salesPerson: opts.query?.salesPerson, limitedView: opts.query?.limitedView },
  })
  const actionResult = buildActions({
    today: TODAY,
    listItems: opts.listItems ?? [],
    dq: evaluateDataQuality(opts.records ?? [], {}),
    forecast,
    supplierRes,
    overrides: new Map(),
    query: opts.query ?? {},
  })
  buildCases({
    actionResult,
    overrides: new Map(),
    orders: opts.listItems ?? [],
    query: opts.query ?? {},
  })
  const monthSrc = aggregateProfitability(orders, { ...MAY, groupBy: 'source' })
  const prevMonthSrc = aggregateProfitability(orders, { ...APR, groupBy: 'source' })
  return buildJobs({
    actionResult,
    monthSrc,
    prevMonthSrc,
    overrides: getJobOverrides(),
    orders: opts.listItems ?? [],
    query: jobQuery,
  })
}

const findJob = (res: ReturnType<typeof jobsFrom>, id: string) => res.jobs.find((j) => j.id === id)

describe('buildJobs — otomasyon motoru', () => {
  beforeEach(() => resetJobStore())

  it('1. tahsilat job oluşur (CREATE_COLLECTION_CASE)', () => {
    const items = [li({ id: 'O1', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' })]
    const res = jobsFrom({ listItems: items })
    const job = findJob(res, 'job:collection:O1')
    expect(job).toBeTruthy()
    expect(job!.jobType).toBe('CREATE_COLLECTION_CASE')
    expect(job!.requiresApproval).toBe(true)
    expect(job!.status).toBe('WAITING_APPROVAL')
  })

  it('2. sevk job oluşur (CREATE_SHIPMENT_CASE)', () => {
    const items = [li({ id: 'O2', plannedShipmentDate: '2026-05-01', displayStatus: 'Üretimde' })]
    const res = jobsFrom({ listItems: items })
    const job = findJob(res, 'job:shipment:O2')
    expect(job).toBeTruthy()
    expect(job!.jobType).toBe('CREATE_SHIPMENT_CASE')
  })

  it('3. ZERO_COST job oluşur (onaysız CREATED)', () => {
    const items = [li({ id: 'O3' })]
    const records = [dqRecord({ orderLineId: 'L3', orderId: 'O3', soldUnitCost: null })]
    const res = jobsFrom({ listItems: items, records })
    const job = findJob(res, 'job:dq-cost:L3')
    expect(job).toBeTruthy()
    expect(job!.jobType).toBe('CREATE_DATA_QUALITY_CASE')
    expect(job!.requiresApproval).toBe(false)
    expect(job!.status).toBe('CREATED')
  })

  it('4. UNKNOWN job oluşur (CREATE_SOURCE_REVIEW_CASE)', () => {
    const items = [li({ id: 'O4' })]
    const records = [dqRecord({ orderLineId: 'L4', orderId: 'O4', soldSalesSourceType: null })]
    const res = jobsFrom({ listItems: items, records })
    const job = findJob(res, 'job:dq-source:L4')
    expect(job).toBeTruthy()
    expect(job!.jobType).toBe('CREATE_SOURCE_REVIEW_CASE')
    expect(job!.priority).toBe('P2')
  })

  it('5. job önceliği doğru (P1 tahsilat üstte)', () => {
    const items = [
      li({ id: 'O1', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' }),
      li({ id: 'O4' }),
    ]
    const records = [dqRecord({ orderLineId: 'L4', orderId: 'O4', soldSalesSourceType: null })]
    const res = jobsFrom({ listItems: items, records })
    expect(res.jobs[0].priority).toBe('P1')
  })

  it('6. onay süreci çalışır', () => {
    const items = [li({ id: 'O1', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' })]
    const before = jobsFrom({ listItems: items })
    const job = findJob(before, 'job:collection:O1')!
    approveAutomationJob(job.id, { approvedBy: 'mgr-1' }, job.status)
    const after = jobsFrom({ listItems: items })
    expect(findJob(after, job.id)!.status).toBe('APPROVED')
    expect(findJob(after, job.id)!.approvedBy).toBe('mgr-1')
  })

  it('7. run çalışır (onaysız ZERO_COST)', () => {
    const items = [li({ id: 'O3' })]
    const records = [dqRecord({ orderLineId: 'L3', orderId: 'O3', soldUnitCost: null })]
    const before = jobsFrom({ listItems: items, records })
    const job = findJob(before, 'job:dq-cost:L3')!
    runAutomationJob(job.id, {
      requiresApproval: job.requiresApproval,
      relatedCaseId: job.relatedCaseId,
      jobType: job.jobType,
      currentStatus: job.status,
    })
    const after = jobsFrom({ listItems: items, records })
    expect(findJob(after, job.id)!.status).toBe('COMPLETED')
    expect(findJob(after, job.id)!.executedAt).toBeTruthy()
  })

  it('8. cancel çalışır', () => {
    const items = [li({ id: 'O1', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' })]
    const before = jobsFrom({ listItems: items })
    const job = findJob(before, 'job:collection:O1')!
    cancelAutomationJob(job.id, job.status)
    const after = jobsFrom({ listItems: items })
    expect(findJob(after, job.id)!.status).toBe('CANCELLED')
  })

  it('9. toplu onay', () => {
    const items = [
      li({ id: 'O1', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' }),
      li({ id: 'O2', plannedShipmentDate: '2026-05-01' }),
    ]
    const before = jobsFrom({ listItems: items })
    const ids = before.jobs.map((j) => j.id)
    const statusById = new Map(before.jobs.map((j) => [j.id, j.status]))
    const result = bulkApproveAutomationJobs(ids, { approvedBy: 'mgr' }, statusById)
    expect(result.approved.length).toBeGreaterThan(0)
    const after = jobsFrom({ listItems: items })
    for (const id of result.approved) {
      expect(findJob(after, id)!.status).toBe('APPROVED')
    }
  })

  it('10. toplu iptal', () => {
    const items = [li({ id: 'O1', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' })]
    const before = jobsFrom({ listItems: items })
    const ids = before.jobs.map((j) => j.id)
    const statusById = new Map(before.jobs.map((j) => [j.id, j.status]))
    const result = bulkCancelAutomationJobs(ids, statusById)
    expect(result.cancelled.length).toBeGreaterThan(0)
  })

  it('11. boş veri kırılmaz', () => {
    const res = jobsFrom({})
    expect(Array.isArray(res.jobs)).toBe(true)
    expect(res.jobs.length).toBe(0)
    expect(res.summary.totalJobs).toBe(0)
    expect(res.queue.pending.length).toBe(0)
  })

  it('12. Depo Katı / WAREHOUSE job üretmez', () => {
    const orders: ProfitOrderInput[] = [
      {
        id: 'M1',
        orderDate: '2026-05-10',
        salesPerson: 'Furkan',
        customerName: 'A',
        paidAmount: 0,
        remainingAmount: 30000,
        riskLevel: 'HIGH',
        lines: [
          {
            lineTotal: 30000,
            qtyOrdered: 1,
            soldUnitCost: 18000,
            soldSalesSourceType: 'STOCK_ITEM',
            soldDisplayFloor: null,
            soldExternalSupplyType: null,
            supplierId: 'S1',
            supplierName: 'Tedarikçi A',
            category: null,
            brand: null,
            productId: null,
            productTitle: 'Ürün',
          },
        ],
      },
    ]
    const items = [li({ id: 'M1', totalAmount: m(30000), remainingAmount: m(30000), currentRiskSeverity: 'HIGH' })]
    const res = jobsFrom({
      listItems: items,
      orders,
      records: [dqRecord({ orderLineId: 'L9', orderId: 'M1', soldUnitCost: null })],
    })
    expect(res.jobs.length).toBeGreaterThan(0)
    expect(JSON.stringify(res.jobs)).not.toContain('Depo Katı')
    expect(JSON.stringify(res.jobs)).not.toContain('WAREHOUSE')
  })

  it('13. SALES limitedView yalnızca kendi işlerini döndürür', () => {
    const items = [
      li({ id: 'O1', salesPerson: 'Furkan', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' }),
      li({ id: 'O2', salesPerson: 'Aslı', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' }),
    ]
    const all = jobsFrom({ listItems: items })
    expect(findJob(all, 'job:collection:O1')).toBeTruthy()
    expect(findJob(all, 'job:collection:O2')).toBeTruthy()

    const limited = jobsFrom({ listItems: items, query: { limitedView: true, salesPerson: 'Furkan' } })
    expect(findJob(limited, 'job:collection:O1')).toBeTruthy()
    expect(findJob(limited, 'job:collection:O2')).toBeFalsy()
  })

  it('14. kuyruk sıralaması doğru (P1 üstte)', () => {
    const items = [
      li({ id: 'O1', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' }),
      li({ id: 'O4' }),
    ]
    const records = [dqRecord({ orderLineId: 'L4', orderId: 'O4', soldSalesSourceType: null })]
    const res = jobsFrom({ listItems: items, records })
    const waiting = res.queue.waitingApproval
    if (waiting.length >= 2) {
      expect(waiting[0].priority).toBe('P1')
    }
    expect(res.jobs[0].priority).toBe('P1')
  })

  it('15. onaylı iş çalıştırılabilir', () => {
    const items = [li({ id: 'O1', totalAmount: m(20000), remainingAmount: m(15000), currentRiskSeverity: 'HIGH' })]
    const before = jobsFrom({ listItems: items })
    const job = findJob(before, 'job:collection:O1')!
    approveAutomationJob(job.id, { approvedBy: 'mgr' }, job.status)
    runAutomationJob(job.id, {
      requiresApproval: job.requiresApproval,
      relatedCaseId: job.relatedCaseId,
      jobType: job.jobType,
      currentStatus: 'APPROVED',
    })
    const after = jobsFrom({ listItems: items })
    expect(findJob(after, job.id)!.status).toBe('COMPLETED')
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET/PATCH /v1/reports/automation-jobs (canlı)', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })
  afterAll(async () => {
    await app.close()
  })
  beforeEach(() => {
    resetJobStore()
  })

  it('16a. GET liste endpoint 200 ve beklenen şekil', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/automation-jobs' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as any
    expect(body.summary).toBeTruthy()
    expect(body.queue).toBeTruthy()
    expect(Array.isArray(body.jobs)).toBe(true)
    expect(JSON.stringify(body.jobs)).not.toContain('Depo Katı')
  })

  it('16b. PATCH approve + run + cancel smoke', async () => {
    const list = await app.inject({ method: 'GET', url: '/v1/reports/automation-jobs' })
    const body = list.json() as any
    const waiting = body.jobs.find((j: any) => j.status === 'WAITING_APPROVAL')
    const created = body.jobs.find((j: any) => j.status === 'CREATED' && !j.requiresApproval)

    if (waiting) {
      const approve = await app.inject({
        method: 'PATCH',
        url: `/v1/reports/automation-jobs/${encodeURIComponent(waiting.id)}/approve`,
        payload: { approvedBy: 'smoke-mgr' },
      })
      expect(approve.statusCode).toBe(200)
    }
    if (created) {
      const run = await app.inject({
        method: 'PATCH',
        url: `/v1/reports/automation-jobs/${encodeURIComponent(created.id)}/run`,
      })
      expect(run.statusCode).toBe(200)
    }
    if (waiting) {
      const cancel = await app.inject({
        method: 'PATCH',
        url: `/v1/reports/automation-jobs/${encodeURIComponent(waiting.id)}/cancel`,
      })
      expect([200, 400]).toContain(cancel.statusCode)
    }
  })
})
