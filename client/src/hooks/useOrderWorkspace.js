import { useMemo } from 'react'
import { computeDashboardKpis } from '../data/index.js'
import {
  getMissingProductOrders,
  getRiskyOrders,
  getTodayDeliveries,
} from '../utils/operationsSelectors.js'
import { filterOrdersBySearch } from '../utils/orderSearch.js'
import { remainingBalance } from '../utils/orderFinance.js'

/**
 * Arama + “bugün” tarihine göre tüm liste türevleri — tek useMemo ile yeniden hesap.
 * @param {import('../data/seedOrders.js').Order[]} orders
 * @param {string} globalSearch
 * @param {string} todayIso
 */
export function useOrderWorkspace(orders, globalSearch, todayIso) {
  return useMemo(() => {
    const searchedOrders = filterOrdersBySearch(orders, globalSearch)

    const activeOrders = searchedOrders
      .filter((o) => o.status !== 'Teslim Edildi')
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))

    const shipmentQueue = [...searchedOrders]
      .filter((o) => o.status !== 'Teslim Edildi' && o.shipmentDate)
      .sort((a, b) => (a.shipmentDate ?? '').localeCompare(b.shipmentDate ?? ''))

    const collectionRows = [...searchedOrders]
      .filter((o) => o.status !== 'Teslim Edildi' && remainingBalance(o) > 0)
      .sort((a, b) => remainingBalance(b) - remainingBalance(a))

    const overdueRisk = getRiskyOrders(searchedOrders, todayIso)
    const todayDeliveries = getTodayDeliveries(searchedOrders, todayIso)
    const missingOrders = getMissingProductOrders(searchedOrders)

    const underpaidRisk = [...searchedOrders]
      .filter((o) => o.status !== 'Teslim Edildi' && remainingBalance(o) > 0)
      .sort((a, b) => remainingBalance(b) - remainingBalance(a))

    const kpis = computeDashboardKpis(orders)

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
    }
  }, [orders, globalSearch, todayIso])
}
