import { useMemo, useState } from 'react'
import OrdersWorkspace from '../../pages/OrdersPage.jsx'
import { canCreateSalesOrder } from '../../constants/orderDrawerPermissions.js'
import { getOperationalToday } from '../../data/index.js'
import { buildDrawerQueue } from '../../application/orderDrawerOrchestration.js'
import { DEFAULT_ORDER_LIST_SORT } from '../../utils/orderListSort.js'
import { useAuth } from '../../state/AuthProvider.jsx'
import { useOrders } from '../../state/useOrders.js'

/**
 * @param {{
 *   onOpenOrderModal: () => void
 *   onOpenOrderById: (orderId: string, options?: import('../../contracts/orderDrawer.js').OpenOrderDrawerOptions) => void
 * }} props
 */
export default function OrdersPage({ onOpenOrderModal, onOpenOrderById }) {
  const { user } = useAuth()
  const { orders, orderListRows, salesOrderListItemDtos } = useOrders()
  const [globalSearch, setGlobalSearch] = useState('')

  const orderById = useMemo(() => new Map(orders.map((order) => [order.id, order])), [orders])

  const searchableRows = useMemo(() => {
    const q = globalSearch.trim().toLowerCase()
    if (!q) return orderListRows
    const digits = q.replace(/\D/g, '')
    return orderListRows.filter((row) => {
      const blob = [
        row.id,
        row.orderNumber,
        row.customer,
        row.phone,
        row.productSummary,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
      if (blob.includes(q)) return true
      if (digits.length >= 4) {
        const rowDigits = String(row.phone ?? '').replace(/\D/g, '')
        return rowDigits.includes(digits)
      }
      return false
    })
  }, [orderListRows, globalSearch])

  function handleOpenOrder(row, options) {
    const rowIds = searchableRows.map((item) => item.id)
    onOpenOrderById(row.id, {
      source: 'orders',
      queue: buildDrawerQueue({
        queueId: 'mobile:orders',
        filterSnapshot: { filter: 'all' },
        sort: DEFAULT_ORDER_LIST_SORT,
        rowIds,
        activeOrderId: row.id,
        source: 'orders',
      }),
      ...options,
    })
  }

  return (
    <OrdersWorkspace
      orderRows={searchableRows}
      orders={orders}
      listItemDtos={salesOrderListItemDtos}
      todayIso={getOperationalToday()}
      canCreateOrder={canCreateSalesOrder(user?.role)}
      onOpenOrderModal={onOpenOrderModal}
      onOrderSelect={handleOpenOrder}
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
    />
  )
}
