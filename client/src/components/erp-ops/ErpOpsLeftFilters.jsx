/**
 * @typedef {Object} ErpFilterGroup
 * @property {string} title
 * @property {readonly { id: string, label: string }[]} options
 */

/**
 * @param {{
 *   groups: ErpFilterGroup[]
 *   activeFilter: string
 *   filterCounts: Record<string, number>
 *   onFilterChange: (id: string) => void
 *   ariaLabel?: string
 *   embedded?: boolean
 * }} props
 */
export default function ErpOpsLeftFilters({
  groups,
  activeFilter,
  filterCounts,
  onFilterChange,
  ariaLabel = 'Filtreler',
  embedded = false,
}) {
  const body = (
    <>
      {groups.map((group) => (
        <section key={group.title} className="mos-erp-filters__group">
          <h2 className="mos-erp-filters__title">{group.title}</h2>
          <ul className="mos-erp-filters__list">
            {group.options.map((f) => (
              <li key={f.id}>
                <button
                  type="button"
                  className={`mos-erp-filters__btn${activeFilter === f.id ? ' is-active' : ''}`}
                  onClick={() => onFilterChange(f.id)}
                >
                  <span>{f.label}</span>
                  <span className="mos-erp-filters__count">{filterCounts[f.id] ?? 0}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </>
  )

  if (embedded) return body

  return (
    <aside className="mos-erp-filters" aria-label={ariaLabel}>
      {body}
    </aside>
  )
}
