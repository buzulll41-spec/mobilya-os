import OrdersTableFull from '../components/OrdersTableFull.jsx'

/** @typedef {import('../data/seedOrders.js').Order} Order */

/** @param {{ shipmentQueue: Order[]; todayIso: string }} props */
export default function ShipmentPage({ shipmentQueue, todayIso }) {
  return (
    <div className="mos-page">
      <header className="mos-page-head">
        <div>
          <h1 className="mos-page-title">Sevk</h1>
          <p className="mos-page-sub">Aktif işlerin yükleme ve teslimat sırası.</p>
        </div>
      </header>
      <section className="mos-card mos-card--panel">
        <div className="mos-table-scroll mos-table-scroll--page">
          <OrdersTableFull orders={shipmentQueue} variant="shipment" todayIso={todayIso} />
        </div>
      </section>
    </div>
  )
}
