import CollectionOrderCard from './CollectionOrderCard.jsx'
import { PRIORITY_CALL_LIMIT } from '../../mappers/collection/collectionCommandCenterModel.js'
import { groupCollectionCardsByOperation } from './collectionOperationCategoryUi.js'

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
export default function CollectionOrderList({ cards, todayIso, onOpenOrder, onOpenPayment }) {
  if (cards.length === 0) {
    return (
      <div className="coll-empty">
        <p className="coll-empty__title">Bu filtrede operasyon kaydı yok</p>
        <p className="coll-empty__hint">Farklı bir filtre seçin veya açık tahsilat kalmadı.</p>
      </div>
    )
  }

  const groups = groupCollectionCardsByOperation(cards, todayIso)
  let globalIndex = 0

  return (
    <div className="coll-groups" aria-label="Tahsilat operasyon grupları">
      {groups.map((group) => (
        <section
          key={group.id}
          className={`coll-op-group coll-op-group--${group.id}`}
          aria-labelledby={`coll-group-${group.id}`}
        >
          <header className="coll-op-group__head" id={`coll-group-${group.id}`}>
            <h3 className="coll-op-group__title">
              <span aria-hidden>{group.emoji}</span> {group.sectionTitle}
            </h3>
            <span className="coll-op-group__count">{group.cards.length} müşteri</span>
          </header>

          <div className="coll-op-group__list" role="list">
            {group.cards.map((card) => {
              globalIndex += 1
              const priorityRank = globalIndex <= PRIORITY_CALL_LIMIT ? globalIndex : null
              return (
                <div key={card.row.id} role="listitem">
                  <CollectionOrderCard
                    card={card}
                    todayIso={todayIso}
                    priorityRank={priorityRank}
                    onOpenOrder={() => onOpenOrder?.(card.row)}
                    onOpenPayment={() => onOpenPayment?.(card.row)}
                  />
                </div>
              )
            })}
          </div>
        </section>
      ))}
    </div>
  )
}
