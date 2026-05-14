import { formatTry } from '../data/index.js'
import { isTerminOverdue, remainingBalance } from '../utils/orderFinance.js'
import { formatShortDate } from '../utils/dates.js'
import { tableRowActivationProps } from '../utils/tableRowActivation.js'
import StatusBadge from './StatusBadge.jsx'

/** @typedef {import('../data/seedOrders.js').Order} Order */

/**
 * @param {{
 *   orders: Order[]
 *   variant?: 'default' | 'shipment' | 'collection'
 *   todayIso?: string
 *   onOrderSelect?: (order: Order) => void
 * }} props
 */
export default function OrdersTableFull({ orders, variant = 'default', todayIso, onOrderSelect }) {
  if (!orders.length) {
    return <p className="mos-empty">Bu görünümde kayıt yok.</p>
  }

  if (variant === 'shipment') {
    return (
      <div className="mos-table-wrap">
        <table className="mos-table mos-table--saas">
          <thead>
            <tr>
              <th>Müşteri</th>
              <th>Ürün</th>
              <th>Sevk</th>
              <th>Durum</th>
              <th className="mos-th-num">Kalan Ödeme</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} {...tableRowActivationProps(o, onOrderSelect)}>
                <td>{o.customer}</td>
                <td>{o.product}</td>
                <td>{formatShortDate(o.shipmentDate)}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td className="mos-td-num">{formatTry(remainingBalance(o))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  if (variant === 'collection') {
    return (
      <div className="mos-table-wrap">
        <table className="mos-table mos-table--saas">
          <thead>
            <tr>
              <th>Müşteri</th>
              <th>Ürün</th>
              <th>Durum</th>
              <th className="mos-th-num">Tutar</th>
              <th className="mos-th-num">Kalan Ödeme</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((o) => (
              <tr key={o.id} {...tableRowActivationProps(o, onOrderSelect)}>
                <td>{o.customer}</td>
                <td>{o.product}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td className="mos-td-num">{formatTry(o.amount)}</td>
                <td className="mos-td-num">{formatTry(remainingBalance(o))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className="mos-table-wrap">
      <table className="mos-table mos-table--saas">
        <thead>
          <tr>
            <th>Sipariş</th>
            <th>Müşteri</th>
            <th>Telefon</th>
            <th>Ürün</th>
            <th>Satış</th>
            <th>Termin</th>
            <th>Sevk</th>
            <th>Durum</th>
            <th className="mos-th-num">Tutar</th>
            <th className="mos-th-num">Kalan Ödeme</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => {
            const overdue = todayIso ? isTerminOverdue(o, todayIso) : false
            return (
              <tr key={o.id} {...tableRowActivationProps(o, onOrderSelect)}>
                <td>
                  <span className="mos-mono">{o.id}</span>
                </td>
                <td>{o.customer}</td>
                <td className="mos-td-muted mos-td-nowrap">{o.phone ?? '—'}</td>
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
                <td className="mos-td-muted">{formatShortDate(o.shipmentDate)}</td>
                <td>
                  <StatusBadge status={o.status} />
                </td>
                <td className="mos-td-num">{formatTry(o.amount)}</td>
                <td className="mos-td-num">{formatTry(remainingBalance(o))}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
