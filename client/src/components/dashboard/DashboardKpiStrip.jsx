/**
 * @param {{
 *   cards: import('../../mappers/dashboard/computeDashboardControlTower.js').DashboardKpiCard[]
 *   onNavigate?: (target: import('../../mappers/dashboard/computeDashboardControlTower.js').DashboardNavTarget) => void
 * }} props
 */

/** @type {Record<string, { icon: string, fallback: string }>} */
const KPI_META = {
  sales: { icon: '◆', fallback: 'Günlük ciro' },
  collect: { icon: '₺', fallback: 'Açık bakiye' },
  ship: { icon: '↗', fallback: 'Bugün / yarın' },
  risk: { icon: '!', fallback: 'Acil müdahale' },
  service: { icon: '◎', fallback: 'Servis takibi' },
}

export default function DashboardKpiStrip({ cards, onNavigate }) {
  return (
    <div className="dct-kpi-strip" role="list" aria-label="Günün göstergeleri">
      {cards.map((card) => {
        const meta = KPI_META[card.id] ?? { icon: '•', fallback: '—' }
        const secondary = card.hint?.trim() ? card.hint : meta.fallback
        return (
          <button
            key={card.id}
            type="button"
            role="listitem"
            className={`dct-kpi dct-kpi--${card.id}${card.tone === 'risk' ? ' dct-kpi--alert' : ''}`}
            onClick={() => onNavigate?.(card.navTarget)}
          >
            <span className="dct-kpi__head">
              <span className="dct-kpi__icon" aria-hidden>
                {meta.icon}
              </span>
              <span className="dct-kpi__label">{card.label}</span>
            </span>
            <strong className="dct-kpi__value">{card.value}</strong>
            <span className="dct-kpi__secondary">{secondary}</span>
          </button>
        )
      })}
    </div>
  )
}
