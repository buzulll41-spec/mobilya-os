import { formatTry } from '../data/index.js'
import { isTerminOverdue, remainingBalance } from '../utils/orderFinance.js'
import { formatShortDate } from '../utils/dates.js'
import { tableRowActivationProps } from '../utils/tableRowActivation.js'
import StatusBadge from './StatusBadge.jsx'

/** @typedef {import('../data/seedOrders.js').Order} Order */

/** @param {{ orders: Order[]; todayIso: string; onOrderSelect: (order: Order) => void }} props */
export default function ActiveOrdersTable({ orders, todayIso, onOrderSelect }) {
  if (!orders.length) {
    return <p className="mos-empty">Bu filtreye uygun aktif sipariş yok.</p>
  }

  return (
    <>
      <div className="mos-table-scroll mos-table-scroll--active">
        <div className="mos-table-wrap mos-table-wrap--active">
          <table className="mos-table mos-table--active mos-table--saas">
            <thead>
              <tr>
                <th>Müşteri</th>
                <th>Ürün</th>
                <th>Satış</th>
                <th>Termin</th>
                <th>Durum</th>
                <th className="mos-th-num">Kalan Ödeme</th>
                <th>Sevk Tarihi</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o) => {
                const overdue = isTerminOverdue(o, todayIso)
                return (
                  <tr key={o.id} {...tableRowActivationProps(o, onOrderSelect)}>
                    <td className="mos-td-strong">{o.customer}</td>
                    <td>{o.product}</td>
                    <td className="mos-td-muted">{o.salesPerson ?? '—'}</td>
                    <td
                      className={
                        overdue ? 'mos-td-muted mos-termin-overdue' : 'mos-td-muted'
                      }
                    >
                      {formatShortDate(o.dueDate)}
                      {overdue && (
                        <span className="mos-termin-flag" title="Termin gecikti">
                          {' '}
                          Gecikti
                        </span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={o.status} />
                    </td>
                    <td className="mos-td-num">{formatTry(remainingBalance(o))}</td>
                    <td className="mos-td-muted">{formatShortDate(o.shipmentDate)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ul className="mos-active-cards" aria-label="Aktif siparişler">
        {orders.map((o) => {
          const overdue = isTerminOverdue(o, todayIso)
          return (
            <li key={o.id}>
              <button
                type="button"
                className="mos-active-card mos-active-card--hit"
                onClick={() => onOrderSelect(o)}
              >
                <div className="mos-active-card-top">
                  <span className="mos-active-card-name">{o.customer}</span>
                  <StatusBadge status={o.status} />
                </div>
                <p className="mos-active-card-product">{o.product}</p>
                {o.salesPerson ? (
                  <p className="mos-active-card-sales">Satış: {o.salesPerson}</p>
                ) : null}
                <dl className="mos-active-card-rows">
                  <div>
                    <dt>Termin</dt>
                    <dd className={overdue ? 'mos-termin-overdue' : ''}>
                      {formatShortDate(o.dueDate)}
                      {overdue && <span className="mos-termin-flag"> Gecikti</span>}
                    </dd>
                  </div>
                  <div>
                    <dt>Sevk</dt>
                    <dd>{formatShortDate(o.shipmentDate)}</dd>
                  </div>
                  <div className="mos-active-card-rows--balance">
                    <dt>Kalan Ödeme</dt>
                    <dd>{formatTry(remainingBalance(o))}</dd>
                  </div>
                </dl>
              </button>
            </li>
          )
        })}
      </ul>
    </>
  )
}
