import { PRIORITY_CALL_LIMIT } from '../../mappers/collection/collectionCommandCenterModel.js'
import CollectionFinanceRow from './CollectionFinanceRow.jsx'
import { buildDeskTableRows } from './collectionOperationTableUi.js'

/** @typedef {import('../../mappers/collection/collectionCommandCenterModel.js').CollectionCardModel} CollectionCardModel */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */

/**
 * @param {{
 *   cards: CollectionCardModel[]
 *   todayIso: string
 *   onOpenOrder?: (row: CollectionRowVM) => void
 *   onOpenPayment?: (row: CollectionRowVM) => void
 * }} props
 */
export default function CollectionFinanceRowList({ cards, todayIso, onOpenOrder, onOpenPayment }) {
  if (cards.length === 0) {
    return (
      <div className="coll-empty">
        <p className="coll-empty__title">Bu filtrede kayıt yok</p>
        <p className="coll-empty__hint">Farklı bir filtre seçin.</p>
      </div>
    )
  }

  const rows = buildDeskTableRows(cards, todayIso, PRIORITY_CALL_LIMIT)
  const topRows = rows.slice(0, PRIORITY_CALL_LIMIT)
  const restRows = rows.slice(PRIORITY_CALL_LIMIT)

  return (
    <div className="coll-hybrid-list">
      <div className="coll-hybrid-list__top">
        <p className="coll-hybrid-list__lead">Öncelikli müdahale</p>
        <div className="coll-hybrid-list__rows coll-hybrid-list__rows--top">
          {topRows.map((row) => (
            <CollectionFinanceRow
              key={row.card.row.id}
              row={row}
              todayIso={todayIso}
              onOpenOrder={() => onOpenOrder?.(row.card.row)}
              onOpenPayment={() => onOpenPayment?.(row.card.row)}
            />
          ))}
        </div>
      </div>

      {restRows.length > 0 ? (
        <div className="coll-hybrid-list__rest">
          <p className="coll-hybrid-list__lead coll-hybrid-list__lead--sub">
            Diğer açık tahsilatlar ({restRows.length})
          </p>
          <div className="coll-hybrid-list__rows">
            {restRows.map((row) => (
              <CollectionFinanceRow
                key={row.card.row.id}
                row={row}
                todayIso={todayIso}
                onOpenOrder={() => onOpenOrder?.(row.card.row)}
                onOpenPayment={() => onOpenPayment?.(row.card.row)}
              />
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
