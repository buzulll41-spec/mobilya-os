import { COLLECTION_FILTERS } from '../../mappers/collection/collectionCommandCenterModel.js'

/**
 * @param {{
 *   activeFilter: import('../../mappers/collection/collectionCommandCenterModel.js').CollectionFilterId
 *   counts: Record<string, number>
 *   onChange: (filterId: import('../../mappers/collection/collectionCommandCenterModel.js').CollectionFilterId) => void
 *   variant?: 'bar' | 'sidebar'
 * }} props
 */
export default function CollectionFilterBar({ activeFilter, counts, onChange, variant = 'bar' }) {
  return (
    <div
      className={`coll-filter-bar${variant === 'sidebar' ? ' coll-filter-bar--sidebar' : ''}`}
      role="tablist"
      aria-label="Tahsilat filtreleri"
    >
      {COLLECTION_FILTERS.map((filter) => {
        const count = counts[filter.id] ?? 0
        const active = activeFilter === filter.id
        return (
          <button
            key={filter.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`coll-filter${active ? ' coll-filter--active' : ''}`}
            onClick={() => onChange(filter.id)}
          >
            {filter.label}
            <span className="coll-filter__count">{count}</span>
          </button>
        )
      })}
    </div>
  )
}
