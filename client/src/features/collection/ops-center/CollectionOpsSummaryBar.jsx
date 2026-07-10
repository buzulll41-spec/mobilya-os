import { selectDeskKpis } from '../collectionDeskKpiUi.js'

/**
 * @param {{
 *   kpis: import('../../../mappers/collection/collectionCommandCenterModel.js').CollectionKpiCard[]
 *   activeFilter: string
 *   onFilterSelect?: (filterId: import('../../../mappers/collection/collectionCommandCenterModel.js').CollectionFilterId) => void
 * }} props
 */
export default function CollectionOpsSummaryBar({ kpis, activeFilter, onFilterSelect }) {
  const deskKpis = selectDeskKpis(kpis)

  return (
    <div className="coll-ops-summary" role="list" aria-label="Tahsilat operasyon özeti">
      {deskKpis.map((kpi) => {
        const isActive = kpi.filterTarget != null && kpi.filterTarget === activeFilter
        const clickable = Boolean(kpi.filterTarget && onFilterSelect)
        const Tag = clickable ? 'button' : 'div'
        return (
          <Tag
            key={kpi.id}
            type={clickable ? 'button' : undefined}
            role="listitem"
            className={`coll-ops-summary__item${isActive ? ' is-active' : ''}`}
            onClick={clickable ? () => onFilterSelect?.(kpi.filterTarget) : undefined}
            title={kpi.hint ?? undefined}
          >
            <span className="coll-ops-summary__label">{kpi.label}</span>
            <span className="coll-ops-summary__value">{kpi.value}</span>
          </Tag>
        )
      })}
    </div>
  )
}
