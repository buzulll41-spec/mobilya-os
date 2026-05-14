import { useMemo, useState } from 'react'
import OrdersTableFull from '../components/OrdersTableFull.jsx'
import { IconPlus } from '../components/Icons.jsx'
import { ORDER_STATUSES } from '../data/index.js'
import { applyOrderFilters, uniqueSalesPeople } from '../utils/orderFilters.js'
import OrderFiltersToolbar from '../components/orders/OrderFiltersToolbar.jsx'

/** @typedef {import('../data/seedOrders.js').Order} Order */

/**
 * @param {{
 *   orders: Order[]
 *   todayIso: string
 *   onOpenOrderModal: () => void
 *   onOrderSelect: (order: Order) => void
 * }} props
 */
export default function OrdersPage({ orders, todayIso, onOpenOrderModal, onOrderSelect }) {
  const [statusFilter, setStatusFilter] = useState('all')
  const [deliveryFilter, setDeliveryFilter] = useState('all')
  const [salesFilter, setSalesFilter] = useState('all')

  const salesOptions = useMemo(() => uniqueSalesPeople(orders), [orders])

  const filtered = useMemo(
    () =>
      applyOrderFilters(
        orders,
        {
          status: statusFilter,
          delivery: deliveryFilter,
          salesPerson: salesFilter,
        },
        todayIso,
      ),
    [orders, statusFilter, deliveryFilter, salesFilter, todayIso],
  )

  const sorted = useMemo(
    () => [...filtered].sort((a, b) => b.orderDate.localeCompare(a.orderDate)),
    [filtered],
  )

  return (
    <div className="mos-page">
      <header className="mos-page-head">
        <div>
          <h1 className="mos-page-title">Siparişler</h1>
          <p className="mos-page-sub">Durumlar: {ORDER_STATUSES.join(' · ')}.</p>
        </div>
        <button type="button" className="mos-btn mos-btn-primary" onClick={onOpenOrderModal}>
          <IconPlus />
          Sipariş ekle
        </button>
      </header>
      <section className="mos-card mos-card--panel">
        <div className="mos-panel-head mos-orders-toolbar">
          <h2 className="mos-panel-title">Tüm siparişler</h2>
          <OrderFiltersToolbar
            status={statusFilter}
            delivery={deliveryFilter}
            sales={salesFilter}
            onStatusChange={setStatusFilter}
            onDeliveryChange={setDeliveryFilter}
            onSalesChange={setSalesFilter}
            statusOptions={ORDER_STATUSES}
            salesOptions={salesOptions}
            resultCount={sorted.length}
          />
        </div>
        <div className="mos-table-scroll mos-table-scroll--page">
          <OrdersTableFull orders={sorted} todayIso={todayIso} onOrderSelect={onOrderSelect} />
        </div>
      </section>
    </div>
  )
}
