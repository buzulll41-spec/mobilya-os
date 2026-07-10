import OperationMapCard from './OperationMapCard.jsx'

/** @typedef {import('../../mappers/operation-map/operationMapModel.js').OperationMapColumnDef} OperationMapColumnDef */
/** @typedef {import('../../mappers/operation-map/operationMapModel.js').OperationMapCard} OperationMapCardType */

/**
 * @param {{
 *   title: string
 *   columns: OperationMapColumnDef[]
 *   grouped: Record<string, OperationMapCardType[]>
 *   onOpenOrder: (orderId: string) => void
 * }} props
 */
export default function OperationMapBoard({ title, columns, grouped, onOpenOrder }) {
  return (
    <section className="opmap-board" aria-label={title}>
      <header className="opmap-board__head">
        <h2 className="opmap-board__title">{title}</h2>
        <p className="opmap-board__hint">Kartlara tıklayarak mevcut sipariş detayını açın.</p>
      </header>
      <div className="opmap-board__columns" role="list">
        {columns.map((column) => {
          const cards = grouped[column.id] ?? []
          return (
            <article key={column.id} className="opmap-column" role="listitem">
              <header className="opmap-column__head">
                <h3 className="opmap-column__title">{column.label}</h3>
                <span className="opmap-column__count">{cards.length}</span>
              </header>
              <div className="opmap-column__body" data-droppable="true">
                {cards.length === 0 ? (
                  <p className="opmap-column__empty">Kayıt yok</p>
                ) : (
                  cards.map((card) => (
                    <OperationMapCard key={card.orderId} card={card} onOpen={onOpenOrder} />
                  ))
                )}
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
