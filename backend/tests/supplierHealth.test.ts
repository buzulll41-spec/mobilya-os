import { describe, expect, it } from 'vitest'
import {
  SUPPLIER_HEALTH_STATUS,
  computeSupplierHealth,
  daysSinceIsoDate,
  formatLastActivityLabel,
} from '../src/lib/supplierHealth.js'

describe('supplierHealth', () => {
  it('yüksek bakiye → kritik', () => {
    const h = computeSupplierHealth({
      isActive: true,
      openBalance: 150_000,
      openProductCount: 0,
      pendingOrderCount: 0,
      missingQtyTotal: 0,
      pendingQtyTotal: 0,
      hasOverdueDelivery: false,
      daysSinceLastMovement: 1,
      daysSinceLastPayment: 1,
    })
    expect(h.status).toBe(SUPPLIER_HEALTH_STATUS.CRITICAL)
    expect(h.label).toBe('Kritik')
  })

  it('çok açık ürün → kritik', () => {
    const h = computeSupplierHealth({
      isActive: true,
      openBalance: 1000,
      openProductCount: 10,
      pendingOrderCount: 3,
      missingQtyTotal: 5,
      pendingQtyTotal: 10,
      hasOverdueDelivery: false,
      daysSinceLastMovement: 2,
      daysSinceLastPayment: 2,
    })
    expect(h.status).toBe(SUPPLIER_HEALTH_STATUS.CRITICAL)
  })

  it('90+ gün hareket yok → pasif', () => {
    const h = computeSupplierHealth({
      isActive: true,
      openBalance: 1000,
      openProductCount: 0,
      pendingOrderCount: 0,
      missingQtyTotal: 0,
      pendingQtyTotal: 0,
      hasOverdueDelivery: false,
      daysSinceLastMovement: 95,
      daysSinceLastPayment: 95,
    })
    expect(h.status).toBe(SUPPLIER_HEALTH_STATUS.PASSIVE)
  })

  it('pasif kart → pasif', () => {
    const h = computeSupplierHealth({
      isActive: false,
      openBalance: 0,
      openProductCount: 0,
      pendingOrderCount: 0,
      missingQtyTotal: 0,
      pendingQtyTotal: 0,
      hasOverdueDelivery: false,
      daysSinceLastMovement: null,
      daysSinceLastPayment: null,
    })
    expect(h.status).toBe(SUPPLIER_HEALTH_STATUS.PASSIVE)
  })

  it('uzun süre hareket yok → riskli', () => {
    const h = computeSupplierHealth({
      isActive: true,
      openBalance: 2000,
      openProductCount: 2,
      pendingOrderCount: 1,
      missingQtyTotal: 1,
      pendingQtyTotal: 4,
      hasOverdueDelivery: false,
      daysSinceLastMovement: 50,
      daysSinceLastPayment: 50,
    })
    expect(h.status).toBe(SUPPLIER_HEALTH_STATUS.RISKY)
  })

  it('formatLastActivityLabel', () => {
    expect(formatLastActivityLabel(0)).toBe('Bugün')
    expect(formatLastActivityLabel(2)).toBe('2 gün önce')
    expect(daysSinceIsoDate('2026-05-12', '2026-05-14')).toBe(2)
  })
})
