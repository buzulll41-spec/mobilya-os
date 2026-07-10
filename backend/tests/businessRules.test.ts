import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'
import type { FastifyInstance } from 'fastify'
import { buildApp } from '../src/app.js'
import { getBusinessRules } from '../src/services/getBusinessRules.js'
import { updateBusinessRule } from '../src/services/updateBusinessRule.js'
import {
  getAllBusinessRules,
  resetBusinessRuleStore,
  ruleNumber,
  rulePercent,
  ruleBoolean,
} from '../src/services/businessRulesEngine.js'
import { buildAdvisories } from '../src/services/getOperationsAdvisor.js'
import { buildActions } from '../src/services/getActionCenter.js'
import { buildJobs } from '../src/services/getAutomationJobs.js'
import { aggregateProfitability } from '../src/services/getProfitabilityAnalytics.js'
import { evaluateDataQuality } from '../src/services/getDataQualityReport.js'
import { buildForecast } from '../src/services/getForecastEngine.js'
import { numberToMoney } from '../src/lib/money.js'
import type { SalesOrderListItemDto } from '../projection/salesOrderListItemProjection.js'
import { USER_ROLE } from '../src/constants/userRoles.js'
import { roleHasPermission, PERM } from '../src/middleware/rbac.js'

const TODAY = '2026-05-15'

function li(p: Partial<SalesOrderListItemDto> & { id: string }): SalesOrderListItemDto {
  const m = (v: number) => numberToMoney(v, 'TRY')
  return {
    id: p.id,
    orderNumber: p.orderNumber ?? p.id,
    customerId: p.customerId ?? `C-${p.id}`,
    customerDisplayName: p.customerDisplayName ?? 'Müşteri',
    customerPhone: null,
    channel: 'STORE',
    currency: 'TRY',
    placedAt: '2026-05-01T10:00:00.000Z',
    lifecycleStatus: 'IN_FULFILLMENT',
    version: 1,
    subtotalAmount: m(0),
    discountAmount: m(0),
    totalAmount: p.totalAmount ?? m(20000),
    amountPaid: m(0),
    amountDue: m(0),
    remainingAmount: p.remainingAmount ?? m(15000),
    fulfillmentProgress: 0.3,
    currentRiskSeverity: p.currentRiskSeverity ?? 'HIGH',
    earliestCommittedShipBy: null,
    latestCommittedShipBy: null,
    lineSummaryTitle: 'Ürün',
    displayStatus: p.displayStatus ?? 'Üretimde',
    plannedShipmentDate: p.plannedShipmentDate ?? null,
    salesPerson: p.salesPerson ?? null,
    lineCostAmount: null,
    notesSnapshot: null,
  }
}

describe('businessRulesEngine — kural motoru', () => {
  beforeEach(() => resetBusinessRuleStore())

  it('1. kural okunur', () => {
    const rules = getAllBusinessRules()
    expect(rules.length).toBe(17)
    const rule = rules.find((r) => r.code === 'DATA_QUALITY_CRITICAL')
    expect(rule?.value).toBe('80')
    expect(rule?.isEnabled).toBe(true)
  })

  it('2. kural güncellenir', () => {
    const updated = updateBusinessRule('DATA_QUALITY_CRITICAL', { value: '75' })
    expect(updated.value).toBe('75')
    expect(ruleNumber('DATA_QUALITY_CRITICAL', 80)).toBe(75)
  })

  it('3. rule engine eşikleri kullanır', () => {
    updateBusinessRule('COLLECTION_OVERDUE_DAYS', { value: '45' })
    expect(ruleNumber('COLLECTION_OVERDUE_DAYS', 30)).toBe(45)
    updateBusinessRule('SALES_TARGET_WARNING', { value: '85' })
    expect(rulePercent('SALES_TARGET_WARNING', 90)).toBe(85)
  })

  it('4. advisor yeni değeri kullanır', () => {
    updateBusinessRule('DATA_QUALITY_CRITICAL', { value: '95' })
    const dq = evaluateDataQuality([], {})
    dq.totals.averageQualityScore = 92
    const res = buildAdvisories({
      today: TODAY,
      monthSrc: aggregateProfitability([], { from: '2026-05-01', to: '2026-05-31', groupBy: 'source' }),
      prevMonthSrc: aggregateProfitability([], { from: '2026-04-01', to: '2026-04-30', groupBy: 'source' }),
      supplierRes: aggregateProfitability([], { from: '2026-05-01', to: '2026-05-31', groupBy: 'supplier' }),
      dq,
      forecast: buildForecast({
        today: TODAY,
        profitOrders: [],
        shipmentWindows: { last30: 0, last60: 0, last90: 0 },
        dataQuality: { currentScore: 92, previousScore: 92 },
        query: {},
      }),
      delayedShipments: 0,
      overdueCount: 0,
      query: {},
    })
    expect(res.advisories.some((a) => a.id === 'quality-score')).toBe(true)
  })

  it('5. automation yeni değeri kullanır', () => {
    updateBusinessRule('AUTO_CREATE_COLLECTION_CASE', { value: 'false' })
    const items = [li({ id: 'O1' })]
    const forecast = buildForecast({
      today: TODAY,
      profitOrders: [],
      shipmentWindows: { last30: 0, last60: 0, last90: 0 },
      dataQuality: { currentScore: 100, previousScore: 100 },
      query: {},
    })
    const actionResult = buildActions({
      today: TODAY,
      listItems: items,
      dq: evaluateDataQuality([], {}),
      forecast,
      supplierRes: aggregateProfitability([], { from: '2026-05-01', to: '2026-05-31', groupBy: 'supplier' }),
      overrides: new Map(),
      query: {},
    })
    const jobs = buildJobs({
      actionResult,
      monthSrc: aggregateProfitability([], { from: '2026-05-01', to: '2026-05-31', groupBy: 'source' }),
      prevMonthSrc: aggregateProfitability([], { from: '2026-04-01', to: '2026-04-30', groupBy: 'source' }),
      overrides: new Map(),
      orders: items,
      query: {},
    })
    expect(jobs.jobs.some((j) => j.jobType === 'CREATE_COLLECTION_CASE')).toBe(false)
  })

  it('6. rule tester simülasyon metrikleri üretir', async () => {
    const { testBusinessRule } = await import('../src/services/testBusinessRules.js')
    const { prisma } = await import('../src/prisma.js')
    const sim = await testBusinessRule(prisma, { code: 'AUTO_CREATE_ZERO_COST_CASE', value: 'false' })
    expect(sim.ruleCode).toBe('AUTO_CREATE_ZERO_COST_CASE')
    expect(sim.metrics.length).toBeGreaterThan(0)
    expect(sim.depoKatiMentioned).toBe(false)
  })

  it('7. simülasyon sonucu before/after döner', async () => {
    const { testBusinessRule } = await import('../src/services/testBusinessRules.js')
    const { prisma } = await import('../src/prisma.js')
    const sim = await testBusinessRule(prisma, { code: 'SALES_TARGET_WARNING', value: '50' })
    expect(typeof sim.actionsBefore).toBe('number')
    expect(typeof sim.actionsAfter).toBe('number')
  })

  it('8. boş veri kırılmaz', () => {
    const res = getBusinessRules({ q: 'NONEXISTENT_XYZ' })
    expect(res.rules.length).toBe(0)
    expect(res.summary.totalRules).toBe(17)
  })

  it('9. yetki kontrolü — SALES erişemez, OPERATION salt okunur', () => {
    expect(roleHasPermission(USER_ROLE.SALES, PERM.BUSINESS_RULES_READ)).toBe(false)
    expect(roleHasPermission(USER_ROLE.SALES, PERM.BUSINESS_RULES_WRITE)).toBe(false)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.BUSINESS_RULES_READ)).toBe(true)
    expect(roleHasPermission(USER_ROLE.OPERATION, PERM.BUSINESS_RULES_WRITE)).toBe(false)
    expect(roleHasPermission(USER_ROLE.ADMIN, PERM.BUSINESS_RULES_WRITE)).toBe(true)
  })

  it('10. varsayılan kurallar yüklenir', () => {
    const res = getBusinessRules()
    expect(res.rules.length).toBe(17)
    expect(res.summary.activeCount).toBe(17)
    expect(res.rules.find((r) => r.code === 'SHIPMENT_DELAY_WARNING')?.value).toBe('5')
  })

  it('11. Depo Katı etkilenmez', () => {
    const res = getBusinessRules()
    const raw = JSON.stringify(res.rules)
    expect(raw).not.toContain('Depo Katı')
    expect(raw).not.toContain('WAREHOUSE')
  })

  it('12. rule disable çalışır', () => {
    updateBusinessRule('ZERO_COST_CRITICAL', { isEnabled: false })
    expect(ruleBoolean('ZERO_COST_CRITICAL', true)).toBe(false)
  })

  it('13. rule enable çalışır', () => {
    updateBusinessRule('ZERO_COST_CRITICAL', { isEnabled: false })
    updateBusinessRule('ZERO_COST_CRITICAL', { isEnabled: true })
    expect(ruleBoolean('ZERO_COST_CRITICAL', false)).toBe(true)
  })

  it('14. action center kural eşiğini kullanır', () => {
    updateBusinessRule('COLLECTION_HIGH_RISK_RATIO', { value: '10' })
    const items = [li({ id: 'O1', totalAmount: numberToMoney(20000, 'TRY'), remainingAmount: numberToMoney(15000, 'TRY') })]
    const forecast = buildForecast({
      today: TODAY,
      profitOrders: [],
      shipmentWindows: { last30: 0, last60: 0, last90: 0 },
      dataQuality: { currentScore: 100, previousScore: 100 },
      query: {},
    })
    const actions = buildActions({
      today: TODAY,
      listItems: items,
      dq: evaluateDataQuality([], {}),
      forecast,
      supplierRes: aggregateProfitability([], { from: '2026-05-01', to: '2026-05-31', groupBy: 'supplier' }),
      overrides: new Map(),
      query: {},
    })
    expect(actions.actions.some((a) => a.id.startsWith('collection-call:'))).toBe(true)
  })

  it('15. build kırılmaz — motor import edilebilir', () => {
    expect(rulePercent('PROFITABILITY_DROP_WARNING', 15)).toBe(15)
    expect(ruleNumber('SHIPMENT_DELAY_CRITICAL', 10)).toBe(10)
  })
})

const hasDb = Boolean(process.env.DATABASE_URL)

describe.skipIf(!hasDb)('GET/PATCH/POST /v1/admin/business-rules (canlı)', () => {
  let app: FastifyInstance
  beforeAll(async () => {
    app = await buildApp()
    await app.ready()
  })
  afterAll(async () => {
    await app.close()
  })
  beforeEach(() => resetBusinessRuleStore())

  it('16a. GET liste 200', async () => {
    const res = await app.inject({ method: 'GET', url: '/v1/admin/business-rules' })
    expect(res.statusCode).toBe(200)
    const body = res.json() as any
    expect(body.summary.totalRules).toBe(17)
    expect(JSON.stringify(body.rules)).not.toContain('Depo Katı')
  })

  it('16b. PATCH + POST test smoke', async () => {
    const patch = await app.inject({
      method: 'PATCH',
      url: '/v1/admin/business-rules/COLLECTION_HIGH_RISK_RATIO',
      payload: { value: '40' },
    })
    expect(patch.statusCode).toBe(200)
    expect((patch.json() as any).value).toBe('40')

    const test = await app.inject({
      method: 'POST',
      url: '/v1/admin/business-rules/test',
      payload: { code: 'COLLECTION_HIGH_RISK_RATIO', value: '40' },
    })
    expect(test.statusCode).toBe(200)
    expect((test.json() as any).depoKatiMentioned).toBe(false)
  })
})
