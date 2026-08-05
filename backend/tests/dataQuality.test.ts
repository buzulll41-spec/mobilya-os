import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import {
  scoreDataQualityRecord,
  evaluateDataQuality,
  QUALITY_PENALTY,
  type DataQualityRecordInput,
} from '../src/services/getDataQualityReport.js'

function rec(partial: Partial<DataQualityRecordInput>): DataQualityRecordInput {
  return {
    orderLineId: partial.orderLineId ?? 'OL-1',
    orderId: partial.orderId ?? 'S-1',
    orderDate: partial.orderDate ?? '2026-05-14',
    customerName: partial.customerName ?? 'Müşteri',
    productTitle: partial.productTitle ?? 'Ürün',
    salesPerson: partial.salesPerson ?? null,
    soldSalesSourceType: partial.soldSalesSourceType ?? null,
    soldDisplayFloor: partial.soldDisplayFloor ?? null,
    soldExternalSupplyType: partial.soldExternalSupplyType ?? null,
    soldUnitCost: partial.soldUnitCost ?? null,
  }
}

describe('scoreDataQualityRecord', () => {
  it('1) UNKNOWN kaynak → UNKNOWN_SOURCE problemi', () => {
    const r = scoreDataQualityRecord({
      soldSalesSourceType: 'UNKNOWN',
      soldDisplayFloor: null,
      soldExternalSupplyType: null,
      soldUnitCost: 5000,
    })
    expect(r.issues.map((i) => i.code)).toContain('UNKNOWN_SOURCE')
    expect(r.status).toBe('PROBLEM')
    expect(r.qualityScore).toBe(100 - QUALITY_PENALTY.UNKNOWN_SOURCE) // 60
  })

  it('2) IN_STORE_DISPLAY + kat yok → MISSING_DISPLAY_FLOOR', () => {
    const r = scoreDataQualityRecord({
      soldSalesSourceType: 'IN_STORE_DISPLAY',
      soldDisplayFloor: null,
      soldExternalSupplyType: null,
      soldUnitCost: 5000,
    })
    expect(r.issues.map((i) => i.code)).toEqual(['MISSING_DISPLAY_FLOOR'])
    expect(r.qualityScore).toBe(80)
  })

  it('3) EXTERNAL_SUPPLY + tip yok → MISSING_EXTERNAL_SUPPLY_TYPE', () => {
    const r = scoreDataQualityRecord({
      soldSalesSourceType: 'EXTERNAL_SUPPLY',
      soldDisplayFloor: null,
      soldExternalSupplyType: null,
      soldUnitCost: 5000,
    })
    expect(r.issues.map((i) => i.code)).toEqual(['MISSING_EXTERNAL_SUPPLY_TYPE'])
    expect(r.qualityScore).toBe(80)
  })

  it('4) soldUnitCost <= 0 → ZERO_COST (kritik)', () => {
    const r = scoreDataQualityRecord({
      soldSalesSourceType: 'STOCK_ITEM',
      soldDisplayFloor: null,
      soldExternalSupplyType: null,
      soldUnitCost: 0,
    })
    const zero = r.issues.find((i) => i.code === 'ZERO_COST')
    expect(zero).toBeTruthy()
    expect(zero!.severity).toBe('critical')
    expect(r.qualityScore).toBe(70)
  })

  it('5) kalite skoru: çoklu ceza toplanır ve 0 altına inmez', () => {
    // UNKNOWN(-40) + ZERO_COST(-30) = -70 → 30
    const a = scoreDataQualityRecord({
      soldSalesSourceType: 'UNKNOWN',
      soldDisplayFloor: null,
      soldExternalSupplyType: null,
      soldUnitCost: 0,
    })
    expect(a.qualityScore).toBe(30)
    // SOURCE_CONFLICT(-30) + ZERO_COST(-30) + ... taban 0
    const b = scoreDataQualityRecord({
      soldSalesSourceType: 'WAREHOUSE',
      soldDisplayFloor: null,
      soldExternalSupplyType: null,
      soldUnitCost: 0,
    })
    expect(b.qualityScore).toBe(40)
  })

  it('6) WAREHOUSE gibi eski değer → SOURCE_CONFLICT (UNKNOWN değil)', () => {
    const r = scoreDataQualityRecord({
      soldSalesSourceType: 'WAREHOUSE',
      soldDisplayFloor: null,
      soldExternalSupplyType: null,
      soldUnitCost: 5000,
    })
    expect(r.issues.map((i) => i.code)).toEqual(['SOURCE_CONFLICT'])
    expect(r.issues[0].severity).toBe('critical')
  })

  it('7) tam temiz kayıt → 100, OK', () => {
    const r = scoreDataQualityRecord({
      soldSalesSourceType: 'IN_STORE_DISPLAY',
      soldDisplayFloor: 'GROUND_FLOOR',
      soldExternalSupplyType: null,
      soldUnitCost: 28000,
    })
    expect(r.issues).toHaveLength(0)
    expect(r.status).toBe('OK')
    expect(r.qualityScore).toBe(100)
  })
})

describe('evaluateDataQuality', () => {
  const records: DataQualityRecordInput[] = [
    rec({ orderLineId: 'OL-1', orderId: 'S-1', soldSalesSourceType: 'IN_STORE_DISPLAY', soldDisplayFloor: 'GROUND_FLOOR', soldUnitCost: 28000 }), // temiz
    rec({ orderLineId: 'OL-2', orderId: 'S-1', soldSalesSourceType: 'UNKNOWN', soldUnitCost: 5000 }), // unknown
    rec({ orderLineId: 'OL-3', orderId: 'S-2', soldSalesSourceType: 'EXTERNAL_SUPPLY', soldExternalSupplyType: null, soldUnitCost: 0 }), // eksik tip + 0 maliyet
    rec({ orderLineId: 'OL-4', orderId: 'S-3', soldSalesSourceType: 'WAREHOUSE', soldUnitCost: 100 }), // çelişki
  ]

  it('özet sayımları doğru hesaplanır', () => {
    const res = evaluateDataQuality(records)
    expect(res.totals.totalRecords).toBe(4)
    expect(res.totals.totalOrders).toBe(3)
    expect(res.totals.cleanRecords).toBe(1)
    expect(res.totals.problemRecords).toBe(3)
    expect(res.totals.unknownCount).toBe(1)
    expect(res.totals.missingCostCount).toBe(1)
    // skorlar: 100, 60, (100-20-30=50), 70 → ort = 70
    expect(res.totals.averageQualityScore).toBe(70)
  })

  it('issueCategories tüm kategorileri sayar', () => {
    const res = evaluateDataQuality(records)
    const byCode = Object.fromEntries(res.issueCategories.map((c) => [c.code, c.count]))
    expect(byCode.UNKNOWN_SOURCE).toBe(1)
    expect(byCode.MISSING_EXTERNAL_SUPPLY_TYPE).toBe(1)
    expect(byCode.ZERO_COST).toBe(1)
    expect(byCode.SOURCE_CONFLICT).toBe(1)
    expect(byCode.MISSING_DISPLAY_FLOOR).toBe(0)
  })

  it('status=problem filtresi yalnızca problemli kayıtları döndürür', () => {
    const res = evaluateDataQuality(records, { status: 'problem' })
    expect(res.rows).toHaveLength(3)
    expect(res.rows.every((r) => r.status === 'PROBLEM')).toBe(true)
  })

  it('issueCode filtresi tek kategoriyi süzer', () => {
    const res = evaluateDataQuality(records, { issueCode: 'ZERO_COST' })
    expect(res.rows).toHaveLength(1)
    expect(res.rows[0].orderLineId).toBe('OL-3')
  })

  it('problemli kayıtlar (düşük skor) tablo başında sıralanır', () => {
    const res = evaluateDataQuality(records)
    expect(res.rows[0].qualityScore).toBeLessThanOrEqual(res.rows[res.rows.length - 1].qualityScore)
    expect(res.rows[res.rows.length - 1].status).toBe('OK')
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET /v1/reports/data-quality (canlı)', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })
  afterAll(async () => {
    await app.close()
  })

  it('endpoint 200 döner ve beklenen şekli üretir', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/reports/data-quality' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as {
      rows: unknown[]
      totals: { totalRecords: number; averageQualityScore: number }
      issueCategories: { code: string }[]
    }
    expect(Array.isArray(body.rows)).toBe(true)
    expect(typeof body.totals.totalRecords).toBe('number')
    expect(typeof body.totals.averageQualityScore).toBe('number')
    // 5 kalite kategorisi her zaman echo edilir (sayım 0 olsa bile)
    expect(body.issueCategories).toHaveLength(5)
  })

  it('issueCode=ZERO_COST filtresi yalnızca 0 maliyetli kayıtları döndürür', async () => {
    const res = await app.inject({
      method: 'GET',
      url: '/v1/reports/data-quality?issueCode=ZERO_COST',
    })
    expect(res.statusCode).toBe(200)
    const body = res.json() as { rows: { issues: { code: string }[] }[] }
    for (const r of body.rows) {
      expect(r.issues.some((i) => i.code === 'ZERO_COST')).toBe(true)
    }
  })
})
