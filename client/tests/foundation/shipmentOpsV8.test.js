import { describe, it, expect } from 'vitest'
import {
  buildDispatchAdvisorView,
  buildOccupancyAdvice,
  buildRiskAdvice,
  buildSavingsAdvice,
  buildWaitAdvice,
  computeOperationHealthScore,
  suggestGroupAssignment,
} from '../../src/mappers/shipment-ops/dispatchAdvisorEngine.js'
import {
  groupShipmentOpportunities,
  toOpportunityCandidate,
} from '../../src/mappers/shipment-ops/shipmentOpportunityEngine.js'
import { buildDailyVehiclePlan } from '../../src/mappers/shipment-ops/shipmentVehiclePlanModel.js'
import { TRIP_SAVINGS_TRY } from '../../src/mappers/shipment-ops/shipmentPlanConstants.js'

describe('dispatchAdvisorEngine v8', () => {
  const selectedDate = '2026-05-14'
  const tomorrow = '2026-05-15'

  it('tasarruf önerisi üretir', () => {
    const rows = [
      {
        id: 'S-1',
        customer: 'A',
        status: 'Hazır',
        shipmentDate: selectedDate,
        amount: 100000,
        paidAmount: 50000,
        notes: 'Adres: Kartepe',
      },
      {
        id: 'S-2',
        customer: 'B',
        status: 'Hazır',
        shipmentDate: selectedDate,
        amount: 80000,
        paidAmount: 20000,
        notes: 'Teslim: Kartepe',
      },
      {
        id: 'S-3',
        customer: 'C',
        status: 'Hazır',
        shipmentDate: selectedDate,
        amount: 60000,
        paidAmount: 10000,
        notes: 'Kartepe mah.',
      },
    ]

    const candidates = rows
      .map((r) => toOpportunityCandidate(r, selectedDate))
      .filter(Boolean)
    const groups = groupShipmentOpportunities(candidates, selectedDate)
    const savings = buildSavingsAdvice(groups, selectedDate, [])

    expect(savings.length).toBeGreaterThan(0)
    expect(savings[0].lines.some((l) => l.includes('Tahmini tasarruf'))).toBe(true)
    expect(savings[0].canAutoPlan).toBe(true)

    const assignment = suggestGroupAssignment(groups[0], selectedDate, [])
    expect(assignment.vehicle).toMatch(/^Araç \d$/)
    expect(assignment.crewLabel).toContain('+')
  })

  it('bekleme fırsatı üretir', () => {
    const rows = [
      {
        id: 'S-10',
        customer: 'Tek',
        status: 'Hazır',
        shipmentDate: selectedDate,
        amount: 50000,
        paidAmount: 10000,
        notes: 'Adres: İzmit',
      },
      {
        id: 'S-11',
        customer: 'Y1',
        status: 'Hazır',
        shipmentDate: tomorrow,
        amount: 40000,
        paidAmount: 5000,
        notes: 'Adres: İzmit merkez',
      },
      {
        id: 'S-12',
        customer: 'Y2',
        status: 'Hazır',
        shipmentDate: tomorrow,
        amount: 35000,
        paidAmount: 5000,
        notes: 'İzmit',
      },
    ]

    const wait = buildWaitAdvice(rows, selectedDate, new Map())
    expect(wait.length).toBe(1)
    expect(wait[0].title).toBe('İZMİT')
    expect(wait[0].lines.some((l) => l.includes('Yarın: 2 sipariş'))).toBe(true)
    expect(wait[0].lines.some((l) => l.includes(formatTry(2 * TRIP_SAVINGS_TRY)))).toBe(true)
  })

  it('risk tespiti — sevk tarihi geçmiş', () => {
    const rows = [
      {
        id: 'S-20',
        customer: 'Nihal Aydın',
        status: 'Hazır',
        shipmentDate: '2026-05-11',
        dueDate: '2026-05-11',
        amount: 90000,
        paidAmount: 45000,
        notes: 'Adres: İzmit',
      },
    ]

    const risks = buildRiskAdvice(rows, [], selectedDate, selectedDate)
    expect(risks.some((r) => r.riskType === 'shipment_overdue')).toBe(true)
    expect(risks.some((r) => r.title.toUpperCase().includes('NIHAL'))).toBe(true)
    expect(risks.some((r) => r.recommendation?.includes('Müşteri aranmalı'))).toBe(true)
  })

  it('araç doluluk önerisi üretir', () => {
    const vehiclePlan = buildDailyVehiclePlan([
      {
        id: '1',
        orderId: 'S-1',
        shipmentId: 'S-1',
        timeLabel: '09:00',
        hasScheduledTime: true,
        region: 'Kartepe',
        hasRegion: true,
        customer: 'A',
        product: 'Koltuk',
        vehicleLabel: 'Araç 3',
        hasVehicle: true,
        crewLabel: 'Muhammet',
        hasCrew: true,
        statusLabel: 'Hazır',
        statusTone: 'ok',
        amount: 1000,
        remaining: 100,
        riskLabel: 'Normal',
        dateIso: selectedDate,
        orderNumber: 'S-1',
      },
    ])

    const opportunities = [
      {
        id: 'opp-kartepe',
        region: 'Kartepe',
        orderCount: 3,
        totalAmount: 10000,
        totalRemaining: 1000,
        dateFrom: selectedDate,
        dateTo: selectedDate,
        score: 90,
        scoreTone: 'high',
        estimatedSavings: 2400,
        vehiclesNeeded: 1,
        orders: [],
      },
    ]

    const occ = buildOccupancyAdvice(vehiclePlan, opportunities)
    expect(occ.some((o) => o.title === 'Araç 3')).toBe(true)
    expect(occ[0].lines.some((l) => l.includes('%25'))).toBe(true)
  })

  it('operasyon skoru hesaplanır', () => {
    const rows = [
      {
        id: 'S-30',
        customer: 'X',
        status: 'Hazır',
        shipmentDate: '2026-05-10',
        amount: 10000,
        paidAmount: 1000,
        openMissingItemsCount: 1,
      },
    ]
    const risks = buildRiskAdvice(rows, [], selectedDate, selectedDate)
    const health = computeOperationHealthScore({
      rows,
      opportunities: [],
      vehiclePlan: buildDailyVehiclePlan([]),
      allPlans: [],
      risks,
      todayIso: selectedDate,
    })

    expect(health.score).toBeLessThan(100)
    expect(health.score).toBeGreaterThanOrEqual(0)
    expect(health.label).toMatch(/\/ 100$/)
  })

  it('buildDispatchAdvisorView birleşik görünüm döner', () => {
    const rows = [
      {
        id: 'S-1',
        customer: 'A',
        status: 'Hazır',
        shipmentDate: selectedDate,
        amount: 1000,
        notes: 'Kartepe',
      },
      {
        id: 'S-2',
        customer: 'B',
        status: 'Hazır',
        shipmentDate: selectedDate,
        amount: 2000,
        notes: 'Kartepe',
      },
    ]
    const candidates = rows.map((r) => toOpportunityCandidate(r, selectedDate)).filter(Boolean)
    const opportunities = groupShipmentOpportunities(candidates, selectedDate)

    const advisor = buildDispatchAdvisorView({
      rows,
      opportunities,
      vehiclePlan: buildDailyVehiclePlan([]),
      allPlans: [],
      plansByOrderId: new Map(),
      selectedDate,
      todayIso: selectedDate,
    })

    expect(advisor.health.score).toBeGreaterThan(0)
    expect(Array.isArray(advisor.savings)).toBe(true)
    expect(Array.isArray(advisor.wait)).toBe(true)
    expect(Array.isArray(advisor.risks)).toBe(true)
  })
})

function formatTry(amount) {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(amount)
}

describe('dispatch advisor audit labels', () => {
  it('audit event etiketleri Türkçe', async () => {
    const { domainEventTypeLabelTr } = await import(
      '../../src/mappers/timeline/domainEventTypeLabelTr.js'
    )
    expect(domainEventTypeLabelTr('dispatch.advice.generated')).toBe('Operasyon tavsiyesi üretildi')
    expect(domainEventTypeLabelTr('dispatch.auto_planned')).toBe('Otomatik sevk planlandı')
    expect(domainEventTypeLabelTr('dispatch.risk_detected')).toBe('Operasyon riski tespit edildi')
  })
})
