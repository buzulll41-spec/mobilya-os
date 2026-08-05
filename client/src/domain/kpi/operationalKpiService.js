import { DEMO_TODAY } from '../../data/constants.js'
import { computeDashboardKpis } from '../../data/dashboardHelpers.js'
import { remainingBalance } from '../../utils/orderFinance.js'
import {
  isCollectionCritical,
  isCollectionOverdue,
} from '../../mappers/collection/collectionCommandCenterModel.js'
import { countDelayedShipmentKpi } from '../../mappers/shipment/deliveryConfirmationQueue.js'

/**
 * Tek KPI hesap katmanı. Desktop / tablet / telefon / executive view-model'leri
 * ortak türetilmiş operasyon metriklerini BURADAN alır; view yalnızca formatlar.
 *
 * Not: Bu servis mevcut satır-içi ifadelerin BİREBİR taşınmış halidir; iş kuralı,
 * eşik (0.009) ve "aktif sipariş" tanımı değişmez. View-özel bileşimler (criticalAlerts,
 * criticalRiskCount, todayDeliverableAmount vb.) ilgili view-model'de kalmaya devam eder.
 *
 * @typedef {import('../../data/seedOrders.js').Order} Order
 * @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto
 * @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM
 * @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan
 */

/**
 * @param {{
 *   orders?: Order[]
 *   listItemDtos?: SalesOrderListItemDto[]
 *   collectionRows?: CollectionRowVM[]
 *   shipmentPlans?: ShipmentPlan[]
 *   todayIso?: string
 * }} input
 */
export function computeOperationalKpis(input) {
  const {
    orders = [],
    listItemDtos = [],
    collectionRows = [],
    shipmentPlans = [],
    todayIso = DEMO_TODAY,
  } = input

  const dashKpis = computeDashboardKpis(orders, listItemDtos, todayIso, shipmentPlans)

  const openCollections = collectionRows.filter((r) => remainingBalance(r) > 0.009)
  const criticalCollections = openCollections.filter((r) => isCollectionCritical(r, todayIso))
  const overdueCollections = openCollections.filter((r) => isCollectionOverdue(r, todayIso))

  const activeOrders = orders.filter((o) => o.status !== 'Teslim Edildi')
  const todayShipments = activeOrders.filter((o) => o.shipmentDate === todayIso)
  const delayedShipmentKpi = countDelayedShipmentKpi(shipmentPlans)

  return {
    dashKpis,
    openCollections,
    criticalCollections,
    overdueCollections,
    activeOrders,
    todayShipments,
    delayedShipmentKpi,
  }
}
