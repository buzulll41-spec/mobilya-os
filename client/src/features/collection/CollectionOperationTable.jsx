import { PRIORITY_CALL_LIMIT } from '../../mappers/collection/collectionCommandCenterModel.js'
import { buildDeskTableRows } from './collectionOperationTableUi.js'

/** @typedef {import('../../mappers/collection/collectionCommandCenterModel.js').CollectionCardModel} CollectionCardModel */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('./collectionOperationTableUi.js').CollectionDeskTableRow} CollectionDeskTableRow */

const TABLE_HEAD = (
  <thead>
    <tr>
      <th scope="col">Öncelik</th>
      <th scope="col">Müşteri</th>
      <th scope="col">Durum</th>
      <th scope="col" className="coll-desk-th--num">
        Kalan bakiye
      </th>
      <th scope="col" className="coll-desk-th--num">
        Tahsilat %
      </th>
      <th scope="col">Sonraki aksiyon</th>
      <th scope="col">İşlem</th>
    </tr>
  </thead>
)

/**
 * @param {{
 *   row: CollectionDeskTableRow
 *   onOpenOrder?: () => void
 *   onOpenPayment?: () => void
 * }} props
 */
function DeskTableRow({ row, onOpenOrder, onOpenPayment }) {
  const { card, priorityMark, priorityRank, rowTone, statusLabel, remainingLabel, paidPct, nextActionLabel, phone } =
    row
  const hasPhone = Boolean(phone)
  const telHref = hasPhone ? `tel:${phone.replace(/\s/g, '')}` : null

  const stop = (/** @type {import('react').MouseEvent} */ e) => {
    e.stopPropagation()
  }

  return (
    <tr
      className={`coll-desk-row coll-desk-row--${rowTone}${priorityRank != null ? ' coll-desk-row--top' : ''}`}
      onClick={() => onOpenOrder?.()}
      tabIndex={0}
      role="button"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenOrder?.()
        }
      }}
      aria-label={`${card.row.customer} tahsilat satırı`}
    >
      <td className="coll-desk-cell coll-desk-cell--prio">
        <span className="coll-desk-prio" aria-hidden>
          {priorityMark}
        </span>
        {priorityRank != null ? (
          <span className="coll-desk-rank">{priorityRank}</span>
        ) : (
          <span className="coll-desk-rank coll-desk-rank--empty">—</span>
        )}
      </td>
      <td className="coll-desk-cell coll-desk-cell--customer">
        <span className="coll-desk-customer">{card.row.customer}</span>
        <span className="coll-desk-order-no">{card.orderNo}</span>
      </td>
      <td className="coll-desk-cell coll-desk-cell--status">{statusLabel}</td>
      <td className="coll-desk-cell coll-desk-cell--amount">{remainingLabel}</td>
      <td className="coll-desk-cell coll-desk-cell--pct">%{paidPct}</td>
      <td className="coll-desk-cell coll-desk-cell--action">{nextActionLabel}</td>
      <td className="coll-desk-cell coll-desk-cell--ops">
        {hasPhone ? (
          <a className="coll-desk-link" href={telHref ?? undefined} onClick={stop}>
            Ara
          </a>
        ) : (
          <span className="coll-desk-muted">—</span>
        )}
        <button
          type="button"
          className="coll-desk-btn"
          onClick={(e) => {
            stop(e)
            onOpenPayment?.()
          }}
        >
          Ödeme al
        </button>
      </td>
    </tr>
  )
}

/**
 * @param {{
 *   rows: CollectionDeskTableRow[]
 *   onOpenOrder?: (row: CollectionRowVM) => void
 *   onOpenPayment?: (row: CollectionRowVM) => void
 * }} props
 */
function DeskTableBody({ rows, onOpenOrder, onOpenPayment }) {
  return (
    <tbody>
      {rows.map((row) => (
        <DeskTableRow
          key={row.card.row.id}
          row={row}
          onOpenOrder={() => onOpenOrder?.(row.card.row)}
          onOpenPayment={() => onOpenPayment?.(row.card.row)}
        />
      ))}
    </tbody>
  )
}

/**
 * @param {{
 *   cards: CollectionCardModel[]
 *   todayIso: string
 *   onOpenOrder?: (row: CollectionRowVM) => void
 *   onOpenPayment?: (row: CollectionRowVM) => void
 * }} props
 */
export default function CollectionOperationTable({ cards, todayIso, onOpenOrder, onOpenPayment }) {
  if (cards.length === 0) {
    return (
      <div className="coll-empty">
        <p className="coll-empty__title">Bu filtrede operasyon kaydı yok</p>
        <p className="coll-empty__hint">Farklı bir filtre seçin veya açık tahsilat kalmadı.</p>
      </div>
    )
  }

  const allRows = buildDeskTableRows(cards, todayIso, PRIORITY_CALL_LIMIT)
  const topRows = allRows.slice(0, PRIORITY_CALL_LIMIT)
  const restRows = allRows.slice(PRIORITY_CALL_LIMIT)

  return (
    <div className="coll-desk-tables">
      <section className="coll-desk-section" aria-labelledby="coll-desk-top10-title">
        <h3 id="coll-desk-top10-title" className="coll-desk-section__title">
          Öncelikli 10 — bugün müdahale
        </h3>
        <div className="coll-desk-table-scroll coll-desk-table-scroll--top">
          <table className="coll-desk-table">
            {TABLE_HEAD}
            <DeskTableBody rows={topRows} onOpenOrder={onOpenOrder} onOpenPayment={onOpenPayment} />
          </table>
        </div>
      </section>

      {restRows.length > 0 ? (
        <section className="coll-desk-section" aria-labelledby="coll-desk-rest-title">
          <h3 id="coll-desk-rest-title" className="coll-desk-section__title coll-desk-section__title--sub">
            Diğer açık tahsilatlar ({restRows.length})
          </h3>
          <div className="coll-desk-table-scroll">
            <table className="coll-desk-table">
              {TABLE_HEAD}
              <DeskTableBody rows={restRows} onOpenOrder={onOpenOrder} onOpenPayment={onOpenPayment} />
            </table>
          </div>
        </section>
      ) : null}
    </div>
  )
}
