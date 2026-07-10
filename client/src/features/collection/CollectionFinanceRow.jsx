import { buildCollectionSuggestedAction } from './collectionSuggestedActionUi.js'

/** @typedef {import('./collectionOperationTableUi.js').CollectionDeskTableRow} CollectionDeskTableRow */

/**
 * @param {{
 *   row: CollectionDeskTableRow
 *   todayIso: string
 *   onOpenOrder?: () => void
 *   onOpenPayment?: () => void
 * }} props
 */
export default function CollectionFinanceRow({ row, todayIso, onOpenOrder, onOpenPayment }) {
  const { card, rowTone, statusLabel, remainingLabel, paidPct } = row
  const suggested = buildCollectionSuggestedAction(card, todayIso)
  const isCritical = rowTone === 'critical'
  const progressPct = paidPct

  const stop = (/** @type {import('react').MouseEvent} */ e) => {
    e.stopPropagation()
  }

  return (
    <article
      className={`coll-finance-row coll-finance-row--${rowTone}${row.priorityRank != null ? ' coll-finance-row--priority' : ''}`}
      onClick={() => onOpenOrder?.()}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onOpenOrder?.()
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${card.row.customer} tahsilat kaydı`}
    >
      {isCritical ? (
        <span className="coll-finance-row__badge">Kritik</span>
      ) : null}

      <div className="coll-finance-row__identity">
        <div className="coll-finance-row__customer-block">
          {row.priorityRank != null ? (
            <span className="coll-finance-row__rank">#{row.priorityRank}</span>
          ) : null}
          <h3 className="coll-finance-row__customer">{card.row.customer}</h3>
          <span className="coll-finance-row__order">{card.orderNo}</span>
        </div>
        <div className="coll-finance-row__context">
          <span className="coll-finance-row__status">{statusLabel}</span>
          <span className="coll-finance-row__next">
            <span className="coll-finance-row__next-label">Sonraki aksiyon:</span> {suggested.title}
          </span>
        </div>
      </div>

      <div className="coll-finance-row__finance">
        <p className="coll-finance-row__amount">{remainingLabel}</p>
        <div className="coll-finance-row__progress" aria-label={`Tahsilat yüzde ${progressPct}`}>
          <div className="coll-finance-row__progress-track">
            <div className="coll-finance-row__progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
          <span className="coll-finance-row__progress-label">%{progressPct} tahsil</span>
        </div>
      </div>

      <div className="coll-finance-row__actions">
        <button
          type="button"
          className="coll-finance-row__pay"
          onClick={(e) => {
            stop(e)
            onOpenPayment?.()
          }}
        >
          Ödeme al
        </button>
      </div>
    </article>
  )
}
