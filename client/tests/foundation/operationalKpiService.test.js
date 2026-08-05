import { describe, expect, it } from 'vitest'
import { computeOperationalKpis } from '../../src/domain/kpi/operationalKpiService.js'
import { computeDashboardKpis } from '../../src/data/dashboardHelpers.js'
import { remainingBalance } from '../../src/utils/orderFinance.js'
import {
  isCollectionCritical,
  isCollectionOverdue,
} from '../../src/mappers/collection/collectionCommandCenterModel.js'
import { countDelayedShipmentKpi } from '../../src/mappers/shipment/deliveryConfirmationQueue.js'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'

// P1: Tek KPI hesap katmanı — servis çıktısı, view-model'lerdeki eski satır-içi
// hesabın BİREBİR aynısı olmalı (davranış değişmez). Gerçek seed verisiyle doğrular.
describe('operationalKpiService — parite (eski satır-içi hesapla birebir)', () => {
  const orders = initialOrders
  const collectionRows = initialOrders
  const shipmentPlans = []
  const todayIso = DEMO_TODAY

  const result = computeOperationalKpis({
    orders,
    listItemDtos: [],
    collectionRows,
    shipmentPlans,
    todayIso,
  })

  it('dashKpis === computeDashboardKpis(...)', () => {
    expect(result.dashKpis).toEqual(computeDashboardKpis(orders, [], todayIso, shipmentPlans))
  })

  it('openCollections = remainingBalance > 0.009', () => {
    const expected = collectionRows.filter((r) => remainingBalance(r) > 0.009)
    expect(result.openCollections).toEqual(expected)
  })

  it('criticalCollections / overdueCollections aynı predikatlarla', () => {
    const open = collectionRows.filter((r) => remainingBalance(r) > 0.009)
    expect(result.criticalCollections).toEqual(open.filter((r) => isCollectionCritical(r, todayIso)))
    expect(result.overdueCollections).toEqual(open.filter((r) => isCollectionOverdue(r, todayIso)))
  })

  it('activeOrders / todayShipments / delayedShipmentKpi birebir', () => {
    const active = orders.filter((o) => o.status !== 'Teslim Edildi')
    expect(result.activeOrders).toEqual(active)
    expect(result.todayShipments).toEqual(active.filter((o) => o.shipmentDate === todayIso))
    expect(result.delayedShipmentKpi).toBe(countDelayedShipmentKpi(shipmentPlans))
  })
})
