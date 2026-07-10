import { selectDeskKpis } from './collectionDeskKpiUi.js'

/**
 * @param {{
 *   kpis: import('../../mappers/collection/collectionCommandCenterModel.js').CollectionKpiCard[]
 *   activeFilter: string
 *   onFilterSelect?: (filterId: import('../../mappers/collection/collectionCommandCenterModel.js').CollectionFilterId) => void
 * }} props
 */
export default function CollectionKpiStrip({ kpis, activeFilter, onFilterSelect }) {
  const deskKpis = selectDeskKpis(kpis)

  return (
    <div className="coll-desk-kpi" role="list" aria-label="Tahsilat özet göstergeleri">
      {deskKpis.map((kpi) => {
        const isActive = kpi.filterTarget != null && kpi.filterTarget === activeFilter
        const clickable = Boolean(kpi.filterTarget && onFilterSelect)
        const Tag = clickable ? 'button' : 'div'
        return (
          <Tag
            key={kpi.id}
            type={clickable ? 'button' : undefined}
            role="listitem"
            className={`coll-desk-kpi__item coll-desk-kpi__item--${kpi.id}${isActive ? ' is-active' : ''}`}
            onClick={clickable ? () => onFilterSelect?.(kpi.filterTarget) : undefined}
            title={kpi.hint ?? undefined}
          >
            <span className="coll-desk-kpi__label">{kpi.label}</span>
            <strong className="coll-desk-kpi__value">{kpi.value}</strong>
          </Tag>
        )
      })}
    </div>
  )
}
