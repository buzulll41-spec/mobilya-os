import { describe, expect, it } from 'vitest'
import {
  SUPPLY_STATUS,
  WAREHOUSE_ENTRY_STATUS,
} from '../../src/constants/supplyOrderStatus.js'
import {
  buildLineSupplySnapshot,
  canMarkShipmentReady,
  canRevertShipmentReady,
  canRevertSupplySent,
  canRevertWarehouseArrival,
  detectOrderLineStateInconsistency,
  isLineReadyForShipmentPlan,
  resolveEffectiveShipmentReady,
  resolveProductRowActionFlags,
  resolveProductRowReceiveAction,
  resolveStageLabelFromSupplyState,
} from '../../src/lib/orderLineSupplyState.js'

/** @param {Partial<import('../../src/lib/orderLineSupplyState.js').OrderLineSupplySnapshot>} o */
function snap(o) {
  return {
    supplyStatus: SUPPLY_STATUS.NOT_SENT,
    warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.NOT_SENT,
    qtyOrdered: 2,
    qtyReceived: 0,
    shipmentReady: false,
    ...o,
  }
}

describe('orderLineSupplyState', () => {
  it('yeni sipariş: tedarik verilmedi / depo verilmedi / sevke hazır hayır', () => {
    const s = snap({})
    expect(resolveEffectiveShipmentReady(s)).toBe(false)
    expect(resolveStageLabelFromSupplyState(s)).toBe('Bekleniyor')
    expect(detectOrderLineStateInconsistency(s)).toBe(false)
  })

  it('tedarik gönder: verildi / bekleniyor / sevke hazır hayır — tutarsız değil', () => {
    const s = snap({
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
    })
    expect(resolveEffectiveShipmentReady(s)).toBe(false)
    expect(resolveStageLabelFromSupplyState(s)).toBe('Tedarik verildi')
    expect(detectOrderLineStateInconsistency(s)).toBe(false)
  })

  it('depoya geldi: sipariş engelli değilse otomatik sevke hazır', () => {
    const s = snap({
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
      qtyReceived: 2,
      shipmentReady: false,
    })
    expect(resolveEffectiveShipmentReady(s, false)).toBe(false)
    expect(resolveEffectiveShipmentReady(s, true)).toBe(true)
    expect(canMarkShipmentReady(s)).toBe(false)
    expect(resolveStageLabelFromSupplyState(s, true)).toBe('Sevke hazır')
    expect(resolveStageLabelFromSupplyState(s, false)).toBe('Depoda')
  })

  it('sevke hazır plana uygun — sipariş otomatik hazır', () => {
    const s = snap({
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
      qtyReceived: 2,
      shipmentReady: false,
    })
    expect(isLineReadyForShipmentPlan(s, true)).toBe(true)
    expect(isLineReadyForShipmentPlan(s, false)).toBe(false)
    expect(canRevertShipmentReady(s)).toBe(false)
  })

  it('gelişi geri al: bekleniyor / sevke hazır hayır', () => {
    const s = snap({
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
      qtyReceived: 0,
      shipmentReady: false,
    })
    expect(canRevertWarehouseArrival(s)).toBe(false)
    expect(resolveEffectiveShipmentReady(s)).toBe(false)
  })

  it('tedarik geri al koşulu', () => {
    const s = snap({
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
      qtyReceived: 0,
    })
    expect(canRevertSupplySent(s)).toBe(true)
  })

  it('imkansız durum: tedarik verilmedi + sevke hazır evet', () => {
    const s = snap({ shipmentReady: true })
    expect(detectOrderLineStateInconsistency(s)).toBe(true)
  })

  it('pilot tutarsızlık senaryoları', () => {
    expect(
      detectOrderLineStateInconsistency(
        snap({
          supplyStatus: SUPPLY_STATUS.NOT_SENT,
          warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
        }),
      ),
    ).toBe(true)
    expect(
      detectOrderLineStateInconsistency(
        snap({
          warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
          shipmentReady: true,
        }),
      ),
    ).toBe(true)
    expect(
      detectOrderLineStateInconsistency(
        snap({
          warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.NOT_SENT,
          shipmentReady: true,
        }),
      ),
    ).toBe(true)
  })

  it('tedarik verildi + depo bekleniyor normal akış uyarı üretmez', () => {
    expect(
      detectOrderLineStateInconsistency(
        snap({
          supplyStatus: SUPPLY_STATUS.SENT,
          warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
          qtyReceived: 0,
          shipmentReady: false,
        }),
      ),
    ).toBe(false)
  })

  it('tedarik verildi + depo bekleniyor + kalan > 0 → depoya geldi işaretle', () => {
    const snapshot = snap({
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
      qtyOrdered: 2,
      qtyReceived: 0,
      shipmentReady: false,
    })
    const action = resolveProductRowReceiveAction(snapshot, null)
    expect(action.label).toBe('Depoya geldi işaretle')
    expect(action.disabled).toBe(false)
    expect(resolveProductRowActionFlags(snapshot, null).showReceive).toBe(true)
  })

  it('kalan 0 + depo bekleniyor → depoya geldi butonu kapalı', () => {
    const snapshot = snap({
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.WAITING,
      qtyOrdered: 1,
      qtyReceived: 1,
      shipmentReady: false,
    })
    const action = resolveProductRowReceiveAction(snapshot, {
      orderLineId: 'l1',
      title: 'Koltuk',
      qtyOrdered: '1',
      qtyReceived: '1',
      qtyPending: '0',
      readinessStatus: 'ready',
      readinessLabel: 'Hazır',
      readinessTone: 'ok',
      badge: 'ready',
      badgeLabel: 'Hazır',
    })
    expect(action.disabled).toBe(true)
    expect(resolveProductRowActionFlags(snapshot, null).showReceive).toBe(false)
  })

  it('depo geldi → manuel sevke hazır butonu yok', () => {
    const snapshot = snap({
      supplyStatus: SUPPLY_STATUS.SENT,
      warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
      qtyReceived: 2,
      shipmentReady: false,
    })
    const flags = resolveProductRowActionFlags(snapshot, null)
    expect(flags.showReceive).toBe(false)
    expect(flags.showRevertArrival).toBe(true)
    expect(flags.showMarkReady).toBe(false)
    expect(flags.showRevertReady).toBe(false)
  })

  it('buildLineSupplySnapshot dto ile uyumlu', () => {
    const snapshot = buildLineSupplySnapshot(
      {
        id: 'l1',
        title: 'Koltuk',
        qtyOrdered: '2',
        qtyReceived: '2',
        supplyStatus: SUPPLY_STATUS.SENT,
        warehouseEntryStatus: WAREHOUSE_ENTRY_STATUS.ARRIVED,
        shipmentReady: false,
      },
      2,
      2,
    )
    expect(snapshot.warehouseEntryStatus).toBe(WAREHOUSE_ENTRY_STATUS.ARRIVED)
    expect(resolveEffectiveShipmentReady(snapshot, false)).toBe(false)
  })
})
