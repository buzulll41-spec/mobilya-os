import OperationMapVirtualColumn from './OperationMapVirtualColumn.jsx'

/** @typedef {import('../../mappers/operation-map/operationMapKanbanModel.js').KanbanCard} KanbanCard */

/**
 * @param {{
 *   columns: { id: string, label: string }[]
 *   grouped: Record<string, KanbanCard[]>
 *   onOpenOrder: (orderId: string) => void
 * }} props
 */
export default function OperationMapKanbanBoard({ columns, grouped, onOpenOrder }) {
  return (
    <section className="opmap-kanban" aria-label="Operasyon kanban panosu">
      <div className="opmap-kanban__columns">
        {columns.map((column) => {
          const cards = grouped[column.id] ?? []
          return (
            <article key={column.id} className="opmap-column">
              <header className="opmap-column__head">
                <h2 className="opmap-column__title">{column.label}</h2>
                <span className="opmap-column__count">{cards.length}</span>
              </header>
              <OperationMapVirtualColumn cards={cards} onOpenOrder={onOpenOrder} />
            </article>
          )
        })}
      </div>
    </section>
  )
}
