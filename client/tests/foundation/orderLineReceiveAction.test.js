import { describe, expect, it } from 'vitest'
import {
  getLineReceiveAction,
  validateQuickLineReceive,
} from '../../src/mappers/receiving/orderLineReceiveAction.js'
import { PRODUCT_READINESS_STATUS } from '../../src/mappers/receiving/productReadiness.js'

/** @param {Partial<import('../../src/contracts/v1/incomingGoods.js').OrderLineReceivingDto>} overrides */
function line(overrides) {
  return {
    orderLineId: 'l1',
    title: 'MAYER KÖŞE',
    qtyOrdered: '6.00',
    qtyReceived: '0.00',
    qtyPending: '6.00',
    readinessStatus: PRODUCT_READINESS_STATUS.WAITING,
    readinessLabel: 'Bekleniyor',
    readinessTone: 'warn',
    badge: PRODUCT_READINESS_STATUS.WAITING,
    badgeLabel: 'Bekleniyor',
    ...overrides,
  }
}

describe('orderLineReceiveAction', () => {
  it('bekleyen satırda Depoya geldi işaretle aktif', () => {
    const a = getLineReceiveAction(line({}))
    expect(a.label).toBe('Depoya geldi işaretle')
    expect(a.disabled).toBe(false)
    expect(a.variant).toBe('receive')
  })

  it('kısmi satırda Gelen ekle aktif', () => {
    const a = getLineReceiveAction(
      line({
        qtyReceived: '2.00',
        qtyPending: '4.00',
        readinessStatus: PRODUCT_READINESS_STATUS.PARTIAL,
        readinessLabel: 'Kısmi geldi',
      }),
    )
    expect(a.label).toBe('Gelen ekle')
    expect(a.disabled).toBe(false)
    expect(a.variant).toBe('add')
  })

  it('hazır satırda Tamamlandı pasif', () => {
    const a = getLineReceiveAction(
      line({
        qtyReceived: '6.00',
        qtyPending: '0.00',
        readinessStatus: PRODUCT_READINESS_STATUS.READY,
        readinessLabel: 'Hazır',
        readinessTone: 'ok',
      }),
    )
    expect(a.label).toBe('Tamamlandı')
    expect(a.disabled).toBe(true)
    expect(a.variant).toBe('done')
  })

  it('tedarikçi zorunlu uyarısı', () => {
    expect(validateQuickLineReceive({ supplierId: '', qty: 2, maxPending: 6 })).toMatch(
      /Tedarikçi seçilmeden/,
    )
  })

  it('fazla adet engeli', () => {
    expect(validateQuickLineReceive({ supplierId: 's1', qty: 7, maxPending: 6 })).toMatch(/aşamaz/)
  })

  it('kalan adet 0 ise kullanıcı dostu mesaj', () => {
    expect(validateQuickLineReceive({ supplierId: 's1', qty: 1, maxPending: 0 })).toMatch(
      /tamamı daha önce depoya alınmış/,
    )
  })
})
