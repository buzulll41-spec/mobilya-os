import { KANBAN_FILTERS } from '../../mappers/operation-map/operationMapKanbanModel.js'

/**
 * @param {{
 *   activeFilter: string
 *   onFilterChange: (id: string) => void
 *   searchQuery: string
 *   onSearchChange: (value: string) => void
 *   totalCards: number
 * }} props
 */
export default function OperationMapToolbar({
  activeFilter,
  onFilterChange,
  searchQuery,
  onSearchChange,
  totalCards,
}) {
  return (
    <header className="opmap-toolbar">
      <div className="opmap-toolbar__row">
        <div className="opmap-toolbar__filters" role="group" aria-label="Kanban filtreleri">
          {KANBAN_FILTERS.map((filter) => (
            <button
              key={filter.id}
              type="button"
              className={`opmap-toolbar__chip${activeFilter === filter.id ? ' is-active' : ''}`}
              onClick={() => onFilterChange(filter.id)}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <p className="opmap-toolbar__count">{totalCards} kart</p>
      </div>
      <div className="opmap-toolbar__search-row">
        <label className="opmap-toolbar__search">
          <span className="opmap-toolbar__search-label">Arama</span>
          <input
            type="search"
            className="opmap-toolbar__search-input"
            placeholder="Müşteri, sipariş no veya telefon"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            aria-label="Müşteri, sipariş no veya telefon ile ara"
          />
        </label>
      </div>
    </header>
  )
}
