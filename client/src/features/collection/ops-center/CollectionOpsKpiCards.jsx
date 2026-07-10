import { selectDeskKpis } from '../collectionDeskKpiUi.js'

/** @typedef {import('../../../mappers/collection/collectionCommandCenterModel.js').CollectionKpiCard} CollectionKpiCard */

/** @type {Record<string, { tone: string, hintKey?: string }>} */
const KPI_PRESENTATION = {
  'total-open': { tone: 'blue' },
  'critical-balance': { tone: 'rose', hintKey: 'hint' },
  'priority-call': { tone: 'amber' },
  overdue: { tone: 'violet' },
}

/**
 * @param {'wallet' | 'alert' | 'phone' | 'clock'} name
 */
function KpiIcon({ name }) {
  const paths = {
    wallet: (
      <path
        d="M4 7h12a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zm0 0V6a2 2 0 0 1 2-2h8m-4 7h.01"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    ),
    alert: (
      <path
        d="M10 4.5 16.5 15H3.5L10 4.5zm0 4.2v2.4M10 13.2h.01"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    ),
    phone: (
      <path
        d="M6.2 4.8c.4 2.1 1.8 4.2 3.9 5.5l1.6-1.6a1 1 0 0 1 1-.2c1.1.4 2.3.6 3.5.6a1 1 0 0 1 1 1v2.6a1 1 0 0 1-1 1A11.5 11.5 0 0 1 4.1 6.2a1 1 0 0 1 1-1H7.7a1 1 0 0 1 1 1c0 1.2.2 2.4.5 3.5a1 1 0 0 1-.2 1L6.2 4.8z"
        stroke="currentColor"
        strokeWidth="1.4"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    ),
    clock: (
      <path
        d="M10 5.5a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9zm0 2.2v2.5l1.6 1"
        stroke="currentColor"
        strokeWidth="1.6"
        fill="none"
        strokeLinecap="round"
      />
    ),
  }
  const iconName =
    name === 'wallet' ? 'wallet' : name === 'alert' ? 'alert' : name === 'phone' ? 'phone' : 'clock'
  return (
    <span className="coll-ops-kpi-card__icon" aria-hidden>
      <svg width="22" height="22" viewBox="0 0 20 20">
        {paths[iconName]}
      </svg>
    </span>
  )
}

/** @param {string} id */
function iconForKpi(id) {
  switch (id) {
    case 'total-open':
      return 'wallet'
    case 'critical-balance':
      return 'alert'
    case 'priority-call':
      return 'phone'
    case 'overdue':
      return 'clock'
    default:
      return 'wallet'
  }
}

/**
 * @param {{
 *   kpis: CollectionKpiCard[]
 *   activeFilter: string
 *   onFilterSelect?: (filterId: import('../../../mappers/collection/collectionCommandCenterModel.js').CollectionFilterId) => void
 * }} props
 */
export default function CollectionOpsKpiCards({ kpis, activeFilter, onFilterSelect }) {
  const deskKpis = selectDeskKpis(kpis)

  return (
    <div className="coll-ops-kpi-row" role="list" aria-label="Tahsilat özet göstergeleri">
      {deskKpis.map((kpi) => {
        const meta = KPI_PRESENTATION[kpi.id] ?? { tone: 'blue' }
        const isActive = kpi.filterTarget != null && kpi.filterTarget === activeFilter
        const clickable = Boolean(kpi.filterTarget && onFilterSelect)
        const Tag = clickable ? 'button' : 'div'
        const subline = meta.hintKey === 'hint' ? kpi.hint : kpi.hint

        return (
          <Tag
            key={kpi.id}
            type={clickable ? 'button' : undefined}
            role="listitem"
            className={`coll-ops-kpi-card coll-ops-kpi-card--${meta.tone}${isActive ? ' is-active' : ''}`}
            onClick={clickable ? () => onFilterSelect?.(kpi.filterTarget) : undefined}
            title={kpi.hint ?? undefined}
          >
            <KpiIcon name={iconForKpi(kpi.id)} />
            <div className="coll-ops-kpi-card__body">
              <span className="coll-ops-kpi-card__label">{kpi.label}</span>
              <strong className="coll-ops-kpi-card__value">{kpi.value}</strong>
              {subline ? <span className="coll-ops-kpi-card__hint">{subline}</span> : null}
            </div>
          </Tag>
        )
      })}
    </div>
  )
}
