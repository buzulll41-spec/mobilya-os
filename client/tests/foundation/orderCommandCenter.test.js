import { describe, expect, it } from 'vitest'
import { RISK_SEVERITY } from '../../src/contracts/v1/enums.js'
import { buildRiskDrawerModel } from '../../src/mappers/risk/riskDrawerUi.js'
import {
  buildCommandKpis,
  buildLifecycleFlowSteps,
  buildNextAction,
  buildOrderRichSummary,
  buildTodayChecklist,
} from '../../src/mappers/order/orderCommandCenterModel.js'

const baseOrder = {
  id: 'S-CC-1',
  customer: 'Demo Müşteri',
  product: 'Köşe koltuk takımı',
  status: 'Üretimde',
  amount: 120_000,
  paid: false,
  paidAmount: 20_000,
  orderDate: '2026-05-01',
  dueDate: '2026-06-15',
  salesPerson: 'Ayşe',
  notes: 'Adres: Karşıyaka, İzmir\nKumaş: Premium keten',
}

const baseDto = {
  openMissingItemsCount: 0,
  currentRiskSeverity: RISK_SEVERITY.MEDIUM,
  shipmentSummaryOpenCount: 0,
  inTransitShipmentCount: 0,
  installationPending: false,
  hasShipmentIssue: false,
}

describe('order command center model', () => {
  it('KPI kartları Türkçe ve boş siparişte crash etmez', () => {
    const cards = buildCommandKpis(baseOrder, baseDto, 100_000, '2026-05-14')
    expect(cards).toHaveLength(4)
    expect(cards.map((c) => c.label)).toEqual(['Teslimat', 'Kalan bakiye', 'Operasyon', 'Risk'])
    expect(buildCommandKpis(baseOrder, undefined, 0, '2026-05-14').every((c) => c.value)).toBe(true)
  })

  it('sonraki aksiyon eksik üründe SSH takibine yönlendirir', () => {
    const risk = buildRiskDrawerModel(baseDto, baseOrder, '2026-05-14')
    const action = buildNextAction(
      baseOrder,
      { ...baseDto, openMissingItemsCount: 2 },
      50_000,
      risk,
    )
    expect(action.title.toLowerCase()).toContain('eksik')
    expect(action.action).toBe('tab')
    expect(action.tabTarget).toBe('ssh')
    expect(action.ctaLabel).toMatch(/SSH/i)
  })

  it('lifecycle akışı SSH adımı içerir', () => {
    const steps = buildLifecycleFlowSteps(baseDto, baseOrder, 100_000)
    expect(steps.length).toBeGreaterThanOrEqual(6)
    expect(steps.some((s) => s.id === 'ssh')).toBe(true)
    expect(steps[0].state).toBe('done')
    expect(steps.some((s) => s.state === 'current' || s.state === 'pending')).toBe(true)
    expect(steps.map((s) => s.label).join(' ')).not.toMatch(/PLANNED|DISPATCHED/)
  })

  it('zengin özet ve bugün listesi boş DTO ile çalışır', () => {
    const rows = buildOrderRichSummary(baseOrder, undefined, baseOrder.notes)
    expect(rows.length).toBeGreaterThanOrEqual(8)
    expect(rows.find((r) => r.label === 'Kumaş')?.value).toBeTruthy()

    const risk = buildRiskDrawerModel(undefined, baseOrder, '2026-05-14')
    const checklist = buildTodayChecklist(baseOrder, undefined, 100_000, risk, [])
    expect(checklist.length).toBeGreaterThan(0)
    expect(checklist.every((i) => i.label && typeof i.done === 'boolean')).toBe(true)
  })
})
