import { describe, expect, it } from 'vitest'
import {
  ORDER_PANEL_TABS,
  resolveOrderPanelTab,
  buildCompactHorizontalStatusFlowSteps,
  buildOrderStatusFlowSteps,
  buildPanelHeaderKpis,
  paymentStatusLabelTr,
} from '../../src/mappers/order/orderOperationPanelModel.js'

const baseOrder = {
  id: 'S-TEST',
  customer: 'Test Müşteri',
  product: 'Dolap',
  status: 'Üretimde',
  amount: 100_000,
  paid: false,
  paidAmount: 40_000,
  orderDate: '2026-05-01',
  dueDate: '2026-06-01',
}

describe('order operation panel model', () => {
  it('sekme yapısı tanımlı', () => {
    const ids = ORDER_PANEL_TABS.map((t) => t.id)
    expect(ids).toContain('overview')
    expect(ids).toContain('timeline')
    expect(ids).toContain('products')
    expect(ids).toContain('payments')
    expect(ids).toContain('shipment')
    expect(ids).toContain('ssh')
    expect(ids).toContain('history')
    expect(ids).toHaveLength(7)
  })

  it('initialTab çözümlemesi', () => {
    expect(resolveOrderPanelTab(undefined, undefined)).toBe('overview')
    expect(resolveOrderPanelTab('payments', undefined)).toBe('payments')
    expect(resolveOrderPanelTab('ssh', undefined)).toBe('ssh')
    expect(resolveOrderPanelTab(undefined, 'notes')).toBe('products')
  })

  it('üst KPI şeridi 4 sade kart üretir', () => {
    const kpis = buildPanelHeaderKpis(baseOrder, 60_000, '2026-05-14')
    expect(kpis).toHaveLength(4)
    expect(kpis.map((k) => k.label)).toEqual([
      'Toplam tutar',
      'Kalan ödeme',
      'Teslim tarihi',
      'Sipariş durumu',
    ])
    expect(kpis[1].sub).toBeUndefined()
    expect(kpis[2].sub).toBe('(+18 gün)')
    expect(kpis[3].showAsBadge).toBe(true)
    expect(kpis[3].badgeTone).toBe('wait')
    expect(kpis.every((k) => k.icon === '')).toBe(true)
  })

  it('ödeme durumu teknik enum göstermez', () => {
    expect(paymentStatusLabelTr(baseOrder, 60_000)).toBe('Kısmi ödeme')
    expect(paymentStatusLabelTr({ ...baseOrder, paid: true }, 0)).toBe('Ödendi')
  })

  it('durum akışı Türkçe adımlar üretir', () => {
    const steps = buildOrderStatusFlowSteps(
      { openMissingItemsCount: 1, operationalState: undefined },
      baseOrder,
    )
    const labels = steps.map((s) => s.label)
    expect(labels).toContain('Sipariş oluşturuldu')
    expect(labels.some((l) => l.includes('Eksik ürün'))).toBe(true)
    expect(labels.join(' ')).not.toMatch(/PLANNED|HIGH|DISPATCHED/)
  })

  it('yatay durum akışı 5 adım üretir', () => {
    const unpaid = { ...baseOrder, paid: false, paidAmount: 0 }
    const steps = buildCompactHorizontalStatusFlowSteps(undefined, unpaid)
    expect(steps).toHaveLength(5)
    expect(steps[0].label).toBe('Sipariş oluşturuldu')
    expect(steps.map((s) => s.label)).toContain('Ödeme bekleniyor')
    expect(steps.map((s) => s.label)).toContain('Montaj bekleniyor')
  })
})
