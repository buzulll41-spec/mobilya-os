import { useMemo } from 'react'
import { computeDashboardKpis } from '../data/index.js'
import {
  getMissingProductOrders,
  getRiskyOrders,
  getTodayDeliveries,
} from '../utils/operationsSelectors.js'
import { buildOperationalAlarms } from '../utils/operationalAlarms.js'
import { filterOrdersBySearch } from '../utils/orderSearch.js'
import { remainingBalance } from '../utils/orderFinance.js'

/**
 * Arama + “bugün” tarihine göre tüm liste türevleri — tek useMemo ile yeniden hesap.
 * @param {import('../data/seedOrders.js').Order[]} orders Legacy (KPI, risk, drawer uyumu)
 * @param {string} globalSearch
 * @param {string} todayIso
 * @param {import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM[] | undefined} shipmentRowVMs Sevk kuyruğu VM kaynağı
 * @param {import('../contracts/v1/collectionRowVm.js').CollectionRowVM[] | undefined} collectionRowVMs Tahsilat VM kaynağı
 * @param {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[] | undefined} listItemDtos Alarm / nabız için
 * @param {import('../state/shipmentPlanStore.js').ShipmentPlan[] | undefined} [shipmentPlans]
 */
export function useOrderWorkspace(orders, globalSearch, todayIso, shipmentRowVMs, collectionRowVMs, listItemDtos, shipmentPlans = []) {
  return useMemo(() => {
    const searchedOrders = filterOrdersBySearch(orders, globalSearch)

    const activeOrders = searchedOrders
      .filter((o) => o.status !== 'Teslim Edildi')
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))

    const shipmentSource =
      shipmentRowVMs && shipmentRowVMs.length > 0 ? shipmentRowVMs : orders
    const searchedShipmentRows = filterOrdersBySearch(shipmentSource, globalSearch)

    const shipmentQueue = [...searchedShipmentRows]
      .filter((o) => {
        if (o.status === 'Teslim Edildi') return true
        if ((o.inTransitShipmentCount ?? 0) > 0) return true
        if ((o.shipmentSummaryOpenCount ?? 0) > 0) return true
        if (o.installationPending) return true
        return Boolean(o.shipmentDate)
      })
      .sort((a, b) => (a.shipmentDate ?? '').localeCompare(b.shipmentDate ?? ''))

    const collectionSource =
      collectionRowVMs && collectionRowVMs.length > 0 ? collectionRowVMs : orders
    const searchedCollectionRows = filterOrdersBySearch(collectionSource, globalSearch)

    const collectionRows = [...searchedCollectionRows]
      .filter((o) => o.status !== 'Teslim Edildi' && remainingBalance(o) > 0)
      .sort((a, b) => remainingBalance(b) - remainingBalance(a))

    const overdueRisk = getRiskyOrders(searchedOrders, todayIso)
    const todayDeliveries = getTodayDeliveries(searchedOrders, todayIso)
    const missingOrders = getMissingProductOrders(searchedOrders)

    const underpaidRisk = [...searchedCollectionRows]
      .filter((o) => o.status !== 'Teslim Edildi' && remainingBalance(o) > 0)
      .sort((a, b) => remainingBalance(b) - remainingBalance(a))

    const kpis = computeDashboardKpis(orders, listItemDtos ?? [], todayIso, shipmentPlans)
    const operationalAlarms = buildOperationalAlarms(searchedOrders, listItemDtos ?? [], todayIso)
    return {
      searchedOrders,
      activeOrders,
      shipmentQueue,
      collectionRows,
      overdueRisk,
      underpaidRisk,
      todayDeliveries,
      missingOrders,
      kpis,
      operationalAlarms,
    }
  }, [orders, globalSearch, todayIso, shipmentRowVMs, collectionRowVMs, listItemDtos, shipmentPlans])
}
