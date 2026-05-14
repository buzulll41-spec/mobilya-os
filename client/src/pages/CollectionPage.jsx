import OrdersTableFull from '../components/OrdersTableFull.jsx'

/** @typedef {import('../data/seedOrders.js').Order} Order */

/** @param {{ collectionRows: Order[]; todayIso: string }} props */
export default function CollectionPage({ collectionRows, todayIso }) {
  return (
    <div className="mos-page">
      <header className="mos-page-head">
        <div>
          <h1 className="mos-page-title">Tahsilat</h1>
          <p className="mos-page-sub">Kalan bakiyesi olan siparişler.</p>
        </div>
      </header>
      <section className="mos-card mos-card--panel">
        <div className="mos-table-scroll mos-table-scroll--page">
          <OrdersTableFull orders={collectionRows} variant="collection" todayIso={todayIso} />
        </div>
      </section>
    </div>
  )
}
