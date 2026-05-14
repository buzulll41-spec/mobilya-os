import { formatShortDate } from '../utils/dates.js'
import { formatTry } from '../data/index.js'
import { remainingBalance } from '../utils/orderFinance.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */

/**
 * @param {{
 *   overdue: Order[]
 *   underpaid: Order[]
 *   missing: Order[]
 *   onOrderClick?: (order: Order) => void
 * }} props
 */
export default function RiskMerkezi({ overdue, underpaid, missing, onOrderClick }) {
  return (
    <section className="mos-card mos-card--saas mos-risk-hub" aria-labelledby="mos-risk-hub-title">
      <div className="mos-risk-hub-head">
        <h2 id="mos-risk-hub-title" className="mos-panel-title">
          Risk merkezi
        </h2>
        <p className="mos-risk-hub-sub">Geciken termin · eksik ödeme · eksik ürün — tek bakış</p>
      </div>
      <div className="mos-risk-hub-grid">
        <RiskColumn
          title="Geciken terminler"
          empty="Geciken termin yok."
          rows={overdue}
          renderSub={(o) => `Termin ${formatShortDate(o.dueDate)}`}
          onOrderClick={onOrderClick}
        />
        <RiskColumn
          title="Eksik ödemeler"
          empty="Açık bakiye yok."
          rows={underpaid}
          renderSub={(o) => `Kalan ${formatTry(remainingBalance(o))}`}
          onOrderClick={onOrderClick}
        />
        <RiskColumn
          title="Eksik ürünler"
          empty="Eksik ürün kaydı yok."
          rows={missing}
          renderSub={() => 'Depo / tedarik takibi'}
          onOrderClick={onOrderClick}
        />
      </div>
    </section>
  )
}

/** @param {{ title: string; empty: string; rows: Order[]; renderSub: (o: Order) => string; onOrderClick?: (o: Order) => void }} props */
function RiskColumn({ title, empty, rows, renderSub, onOrderClick }) {
  return (
    <div className="mos-risk-hub-col">
      <h3 className="mos-risk-hub-col-title">{title}</h3>
      {rows.length === 0 ? (
        <p className="mos-risk-hub-empty">{empty}</p>
      ) : (
        <ul className="mos-risk-hub-list">
          {rows.slice(0, 5).map((o) => (
            <li key={o.id}>
              <button
                type="button"
                className="mos-risk-hub-row"
                onClick={() => onOrderClick?.(o)}
              >
                <span className="mos-risk-hub-id">{o.id}</span>
                <span className="mos-risk-hub-name">{o.customer}</span>
                <span className="mos-risk-hub-sub">{renderSub(o)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
