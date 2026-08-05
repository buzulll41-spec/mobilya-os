import { useMemo, useState } from 'react'
import { ORDER_LIST_FULFILLMENT_STATUSES } from '../data/index.js'
import { applyOrderFilters, uniqueSalesPeople } from '../utils/orderFilters.js'
import ActiveOrdersTable from './ActiveOrdersTable.jsx'
import OrderFiltersToolbar from './orders/OrderFiltersToolbar.jsx'

/** @typedef {import('../data/seedOrders.js').Order} Order */

const ACTIVE_STATUS_OPTIONS = ORDER_LIST_FULFILLMENT_STATUSES.filter((s) => s !== 'Teslim Edildi')

/** @param {{ orders: Order[]; todayIso: string; onOrderSelect: (order: Order) => void }} props */
export default function ActiveOrdersSection({ orders, todayIso, onOrderSelect }) {
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

  return (
    <section className="mos-dash-active mos-full-bleed" aria-labelledby="mos-active-heading">
      <div className="mos-dash-active-inner">
        <div className="mos-card mos-card--panel mos-card--active-sheet mos-card--saas">
          <div className="mos-panel-head mos-active-toolbar">
            <div>
              <h2 id="mos-active-heading" className="mos-panel-title">
                Aktif siparişler
              </h2>
              <p className="mos-active-toolbar-hint">
                Üst çubuktaki arama tüm alanlarda müşteri, ürün ve sipariş no ile filtreler.
              </p>
            </div>
            <div className="mos-active-toolbar-right">
              <OrderFiltersToolbar
                className="mos-order-filters--end"
                status={statusFilter}
                delivery={deliveryFilter}
                sales={salesFilter}
                onStatusChange={setStatusFilter}
                onDeliveryChange={setDeliveryFilter}
                onSalesChange={setSalesFilter}
                statusOptions={ACTIVE_STATUS_OPTIONS}
                salesOptions={salesOptions}
                resultCount={filtered.length}
              />
            </div>
          </div>
          <ActiveOrdersTable orders={filtered} todayIso={todayIso} onOrderSelect={onOrderSelect} />
        </div>
      </div>
    </section>
  )
}
