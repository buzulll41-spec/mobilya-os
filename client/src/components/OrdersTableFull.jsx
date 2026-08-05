import { formatTry } from '../data/index.js'

import { isTerminOverdue, remainingBalance } from '../utils/orderFinance.js'

import { formatShortDate } from '../utils/dates.js'

import { tableRowActivationProps } from '../utils/tableRowActivation.js'

import { ORDER_LIST_SORTABLE_COLUMNS } from '../utils/orderListSort.js'

import StatusBadge from './StatusBadge.jsx'



/**

 * @param {{

 *   label: string

 *   uiColumn: string

 *   sortColumn?: string

 *   sortDirection?: 'asc' | 'desc'

 *   onSortColumn?: (uiColumn: string) => void

 *   className?: string

 * }} props

 */

function SortableTh({

  label,

  uiColumn,

  sortColumn,

  sortDirection,

  onSortColumn,

  className = '',

}) {

  const field = ORDER_LIST_SORTABLE_COLUMNS[uiColumn] ?? uiColumn

  const active = sortColumn === field

  const ariaSort = active ? (sortDirection === 'asc' ? 'ascending' : 'descending') : 'none'



  if (!onSortColumn) {

    return <th className={className}>{label}</th>

  }



  return (

    <th

      className={`mos-th-sortable${active ? ' mos-th-sortable--active' : ''}${className ? ` ${className}` : ''}`}

      aria-sort={ariaSort}

    >

      <button type="button" className="mos-th-sort-btn" onClick={() => onSortColumn(uiColumn)}>

        <span>{label}</span>

        {active ? (

          <span className="mos-th-sort-icon" aria-hidden>

            {sortDirection === 'asc' ? '↑' : '↓'}

          </span>

        ) : null}

      </button>

    </th>

  )

}



/**

 * @param {{

 *   orders: (import('../data/seedOrders.js').Order | import('../contracts/v1/orderListRowVm.js').OrderListRowVM | import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM | import('../contracts/v1/collectionRowVm.js').CollectionRowVM)[]

 *   variant?: 'default' | 'shipment' | 'collection'

 *   todayIso?: string

 *   onOrderSelect?: (order: import('../data/seedOrders.js').Order | import('../contracts/v1/orderListRowVm.js').OrderListRowVM | import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM | import('../contracts/v1/collectionRowVm.js').CollectionRowVM) => void

 *   sortColumn?: string

 *   sortDirection?: 'asc' | 'desc'

 *   onSortColumn?: (uiColumn: string) => void

 * }} props

 */

export default function OrdersTableFull({

  orders,

  variant = 'default',

  todayIso,

  onOrderSelect,

  sortColumn,

  sortDirection,

  onSortColumn,

}) {

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

              <tr

                key={'shipmentId' in o && o.shipmentId ? `${o.id}-${o.shipmentId}` : o.id}

                {...tableRowActivationProps(o, onOrderSelect)}

              >

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

            <SortableTh

              label="Sipariş"

              uiColumn="order"

              sortColumn={sortColumn}

              sortDirection={sortDirection}

              onSortColumn={onSortColumn}

            />

            <SortableTh

              label="Müşteri"

              uiColumn="customer"

              sortColumn={sortColumn}

              sortDirection={sortDirection}

              onSortColumn={onSortColumn}

            />

            <th>Telefon</th>

            <SortableTh

              label="Ürün"

              uiColumn="product"

              sortColumn={sortColumn}

              sortDirection={sortDirection}

              onSortColumn={onSortColumn}

            />

            <SortableTh

              label="Satış"

              uiColumn="salesPerson"

              sortColumn={sortColumn}

              sortDirection={sortDirection}

              onSortColumn={onSortColumn}

            />

            <SortableTh

              label="Termin"

              uiColumn="dueDate"

              sortColumn={sortColumn}

              sortDirection={sortDirection}

              onSortColumn={onSortColumn}

            />

            <SortableTh

              label="Sevk"

              uiColumn="shipmentDate"

              sortColumn={sortColumn}

              sortDirection={sortDirection}

              onSortColumn={onSortColumn}

            />

            <SortableTh

              label="Durum"

              uiColumn="status"

              sortColumn={sortColumn}

              sortDirection={sortDirection}

              onSortColumn={onSortColumn}

            />

            <SortableTh

              label="Tutar"

              uiColumn="amount"

              sortColumn={sortColumn}

              sortDirection={sortDirection}

              onSortColumn={onSortColumn}

              className="mos-th-num"

            />

            <SortableTh

              label="Kalan Ödeme"

              uiColumn="remaining"

              sortColumn={sortColumn}

              sortDirection={sortDirection}

              onSortColumn={onSortColumn}

              className="mos-th-num"

            />

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

