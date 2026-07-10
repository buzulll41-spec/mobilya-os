import { describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { mapListItemToCollectionRowVM } from '../../src/mappers/payment/mapListItemToCollectionRowVM.js'
import {
  buildCollectionCommandCenterView,
  computeCollectionHealth,
  computeCollectionKpis,
  computeCollectionRiskScore,
  computeCollectionStripeTone,
  filterCollectionRows,
  formatCollectionProductSummary,
  isCollectionCritical,
  isDeliveredOpenBalance,
  matchesCollectionFilter,
  pickPriorityCallRows,
  PRIORITY_CALL_LIMIT,
  sortCollectionByRisk,
} from '../../src/mappers/collection/collectionCommandCenterModel.js'
import { remainingBalance } from '../../src/utils/orderFinance.js'

function seedCollectionRows() {
  return initialOrders
    .map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    .map((dto) => mapListItemToCollectionRowVM(dto))
    .filter((row) => remainingBalance(row) > 0.009)
}

describe('collection command center model', () => {
  it('KPI — kritik bakiye toplam açık bakiyeden küçük veya eşit', () => {
    const rows = seedCollectionRows()
    const kpis = computeCollectionKpis(rows, DEMO_TODAY)
    const total = kpis.find((k) => k.id === 'total-open')
    const critical = kpis.find((k) => k.id === 'critical-balance')
    expect(total).toBeTruthy()
    expect(critical).toBeTruthy()
    const totalNum = rows.reduce((s, r) => s + remainingBalance(r), 0)
    const criticalNum = rows
      .filter((r) => isCollectionCritical(r, DEMO_TODAY))
      .reduce((s, r) => s + remainingBalance(r), 0)
    expect(criticalNum).toBeLessThanOrEqual(totalNum)
  })

  it('şerit tonu — yüksek bakiye teslim edilmemiş amber', () => {
    /** @type {import('../../src/contracts/v1/collectionRowVm.js').CollectionRowVM} */
    const row = {
      id: 'S-W',
      customer: 'Warn',
      product: 'Koltuk',
      status: 'Hazır',
      amount: 100_000,
      paidAmount: 0,
      paid: false,
      paymentProgress: 0,
      hasOverdueBalance: false,
      lastPaymentAt: null,
      orderDate: DEMO_TODAY,
    }
    expect(computeCollectionStripeTone(row, DEMO_TODAY)).toBe('warning')
    expect(computeCollectionHealth(row, DEMO_TODAY).tone).toBe('warning')
  })

  it('ürün özeti — çoklu ürün +N daha', () => {
    const out = formatCollectionProductSummary('Koltuk · Sehpa · TV ünitesi')
    expect(out.display).toBe('Koltuk')
    expect(out.overflow).toBe('+2 ürün daha')
  })

  it('KPI — açık bakiye ve ortalama oran üretir', () => {
    const rows = seedCollectionRows()
    const kpis = computeCollectionKpis(rows, DEMO_TODAY)
    expect(kpis).toHaveLength(5)
    expect(kpis[0].id).toBe('total-open')
    expect(kpis[0].value).toMatch(/₺/)
    expect(kpis[4].value).toMatch(/^%/)
    const totalOpen = rows.reduce((s, r) => s + remainingBalance(r), 0)
    expect(kpis[0].value).toContain(String(Math.round(totalOpen)).slice(0, 3))
  })

  it('risk sıralaması — teslim + bakiye en üstte', () => {
    const rows = seedCollectionRows()
    const sorted = sortCollectionByRisk(rows, DEMO_TODAY)
    expect(sorted.length).toBeGreaterThan(1)
    const deliveredIdx = sorted.findIndex((c) => isDeliveredOpenBalance(c.row))
    if (deliveredIdx > 0) {
      expect(isDeliveredOpenBalance(sorted[0].row)).toBe(true)
    }
    for (let i = 1; i < sorted.length; i++) {
      const prevDelivered = isDeliveredOpenBalance(sorted[i - 1].row)
      const curDelivered = isDeliveredOpenBalance(sorted[i].row)
      if (prevDelivered && !curDelivered) {
        expect(sorted[i - 1].riskScore).toBeGreaterThanOrEqual(sorted[i].riskScore)
      }
    }
  })

  it('öncelikli aranacak — en fazla 10 müşteri', () => {
    const rows = seedCollectionRows()
    const priority = pickPriorityCallRows(rows, DEMO_TODAY)
    expect(priority.length).toBeLessThanOrEqual(PRIORITY_CALL_LIMIT)
    const kpis = computeCollectionKpis(rows, DEMO_TODAY)
    const priorityKpi = kpis.find((k) => k.id === 'priority-call')
    expect(priorityKpi?.label).toBe('Öncelikli aranacak')
    expect(Number(priorityKpi?.value)).toBe(priority.length)
  })

  it('sağlık skoru — teslim + bakiye kritik', () => {
    /** @type {import('../../src/contracts/v1/collectionRowVm.js').CollectionRowVM} */
    const row = {
      id: 'S-TEST',
      customer: 'Test',
      product: 'Koltuk',
      status: 'Teslim Edildi',
      amount: 100_000,
      paidAmount: 10_000,
      paid: false,
      paymentProgress: 10,
      hasOverdueBalance: false,
      lastPaymentAt: null,
      orderDate: DEMO_TODAY,
    }
    const health = computeCollectionHealth(row, DEMO_TODAY)
    expect(health.tone).toBe('critical')
  })

  it('filtreler — delivered-open yalnızca teslim edilmiş açık bakiyeler', () => {
    const rows = seedCollectionRows()
    const delivered = filterCollectionRows(rows, 'delivered-open', DEMO_TODAY)
    expect(delivered.every((r) => r.status === 'Teslim Edildi')).toBe(true)
    expect(delivered.every((r) => remainingBalance(r) > 0.009)).toBe(true)
  })

  it('filtreler — hiç ödeme yok', () => {
    const rows = seedCollectionRows()
    const none = filterCollectionRows(rows, 'none', DEMO_TODAY)
    expect(none.every((r) => (r.paidAmount ?? 0) <= 0.009)).toBe(true)
  })

  it('view — filtre + sıralı kart listesi', () => {
    const rows = seedCollectionRows()
    const view = buildCollectionCommandCenterView(rows, 'all', DEMO_TODAY)
    expect(view.cards.length).toBe(view.filteredCount)
    expect(view.openCount).toBeGreaterThan(0)
  })

  it('risk skoru — düşük tahsilat oranı skoru artırır', () => {
    /** @type {import('../../src/contracts/v1/collectionRowVm.js').CollectionRowVM} */
    const lowPay = {
      id: 'A',
      customer: 'A',
      product: 'X',
      status: 'Hazır',
      amount: 50_000,
      paidAmount: 0,
      paid: false,
      paymentProgress: 0,
      hasOverdueBalance: false,
      lastPaymentAt: null,
      orderDate: DEMO_TODAY,
    }
    /** @type {import('../../src/contracts/v1/collectionRowVm.js').CollectionRowVM} */
    const highPay = { ...lowPay, id: 'B', paidAmount: 40_000, paymentProgress: 80 }
    expect(computeCollectionRiskScore(lowPay, DEMO_TODAY)).toBeGreaterThan(
      computeCollectionRiskScore(highPay, DEMO_TODAY),
    )
  })

  it('matchesCollectionFilter — daraltılmış kritik tanım', () => {
    /** @type {import('../../src/contracts/v1/collectionRowVm.js').CollectionRowVM} */
    const delivered = {
      id: 'S-D',
      customer: 'Teslim',
      product: 'Takım',
      status: 'Teslim Edildi',
      amount: 30_000,
      paidAmount: 20_000,
      paid: false,
      paymentProgress: 66,
      hasOverdueBalance: false,
      lastPaymentAt: null,
      orderDate: DEMO_TODAY,
    }
    expect(matchesCollectionFilter(delivered, 'critical', DEMO_TODAY)).toBe(true)

    /** @type {import('../../src/contracts/v1/collectionRowVm.js').CollectionRowVM} */
    const highOnly = {
      id: 'S-H',
      customer: 'Yüksek',
      product: 'Masa',
      status: 'Hazır',
      amount: 100_000,
      paidAmount: 60_000,
      paid: false,
      paymentProgress: 60,
      hasOverdueBalance: false,
      lastPaymentAt: null,
      orderDate: DEMO_TODAY,
    }
    expect(isCollectionCritical(highOnly, DEMO_TODAY)).toBe(false)
  })
})
