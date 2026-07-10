import { describe, expect, it } from 'vitest'
import { RISK_SEVERITY } from '../../src/contracts/v1/enums.js'
import { buildOrderHealthBar } from '../../src/mappers/order/orderHealthBarModel.js'
import { buildShipmentReadinessScore } from '../../src/mappers/order/shipmentReadinessScore.js'
import { buildTodayOrderCommand } from '../../src/mappers/order/orderTodayCommandModel.js'
import { domainEventTypeLabelTr } from '../../src/mappers/timeline/domainEventTypeLabelTr.js'

const baseOrder = {
  id: 'S-V10',
  customer: 'Test',
  status: 'Hazır',
  amount: 100_000,
  paid: false,
  paidAmount: 40_000,
  orderDate: '2026-05-01',
  dueDate: '2026-06-01',
}

describe('V10 order health bar', () => {
  it('sağlıklı sipariş yeşil döner', () => {
    const model = buildOrderHealthBar(
      { ...baseOrder, status: 'Üretimde', paidAmount: 95_000, dueDate: '2026-08-01' },
      { openMissingItemsCount: 0, currentRiskSeverity: RISK_SEVERITY.NONE },
      { plannedDate: '2026-06-15', vehicle: 'KAM-1', crew1: 'Ali' },
      '2026-05-14',
    )
    expect(model.tone).toBe('healthy')
    expect(model.label).toBe('Sağlıklı Sipariş')
  })

  it('açık SSH sarı uyarı verir', () => {
    const model = buildOrderHealthBar(baseOrder, { openMissingItemsCount: 2 }, undefined, '2026-05-14')
    expect(model.tone).toBe('warning')
  })

  it('termin gecikmesi kırmızı döner', () => {
    const model = buildOrderHealthBar(
      { ...baseOrder, dueDate: '2026-05-01' },
      undefined,
      undefined,
      '2026-05-14',
    )
    expect(model.tone).toBe('critical')
    expect(model.label).toBe('Kritik Operasyon Riski')
  })
})

describe('V10 shipment readiness', () => {
  it('skor ve kontrol listesi üretir', () => {
    const model = buildShipmentReadinessScore(
      baseOrder,
      { openMissingItemsCount: 0, operationalState: { productionState: 'READY' } },
      { vehicle: 'KAM-1', crew1: 'Ali', region: 'Kadıköy' },
    )
    expect(model.score).toBeGreaterThan(70)
    expect(model.checks.some((c) => c.id === 'vehicle' && c.tone === 'ok')).toBe(true)
  })
})

describe('V10 today command', () => {
  it('yüksek bakiyede tahsilat mesajı', () => {
    const cmd = buildTodayOrderCommand(baseOrder, undefined, undefined, '2026-05-14')
    expect(cmd.message).toContain('tahsil')
    expect(cmd.tabTarget).toBe('payments')
  })

  it('temiz siparişte onay mesajı', () => {
    const cmd = buildTodayOrderCommand(
      { ...baseOrder, paidAmount: 100_000, status: 'Teslim Edildi' },
      { openMissingItemsCount: 0 },
      { plannedDate: '2026-05-10' },
      '2026-05-14',
    )
    expect(cmd.tone).toBe('ok')
    expect(cmd.message).toContain('Kritik konu bulunmuyor')
  })
})

describe('V10 audit labels', () => {
  it('wire event türlerini Türkçeleştirir', () => {
    expect(domainEventTypeLabelTr('incoming_goods.recorded')).toBe('Ürün depoya giriş yaptı')
    expect(domainEventTypeLabelTr('payment.posted')).toBe('Tahsilat alındı')
    expect(domainEventTypeLabelTr('shipment.plan.created')).toBe('Sevk planlandı')
    expect(domainEventTypeLabelTr('unknown.custom.event')).not.toContain('.')
  })
})
