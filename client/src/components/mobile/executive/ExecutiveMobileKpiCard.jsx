import { executiveTrendArrow } from '../../../mappers/mobile/executiveMobileModel.js'

/**
 * @param {'success' | 'warning' | 'critical' | 'neutral' | 'info'} tone
 */
function toneClass(tone) {
  if (tone === 'success') return 'is-success'
  if (tone === 'warning') return 'is-warning'
  if (tone === 'critical') return 'is-critical'
  if (tone === 'info') return 'is-info'
  return ''
}

/**
 * @param {{
 *   kpi: import('../../../mappers/mobile/executiveMobileModel.js').ExecutiveMobileKpi
 *   onOpen?: () => void
 * }} props
 */
export default function ExecutiveMobileKpiCard({ kpi, onOpen }) {
  const trendClass =
    kpi.trend === 'up' ? 'is-up' : kpi.trend === 'down' ? 'is-down' : 'is-flat'

  return (
    <button
      type="button"
      className={`exec-mobile-kpi ${toneClass(kpi.tone)}`}
      onClick={onOpen}
    >
      <span className="exec-mobile-kpi__label">{kpi.label}</span>
      <div className="exec-mobile-kpi__row">
        <strong className="exec-mobile-kpi__value">{kpi.value}</strong>
        <span className={`exec-mobile-kpi__trend ${trendClass}`} aria-label={`Trend ${kpi.trend}`}>
          {executiveTrendArrow(kpi.trend)}
        </span>
      </div>
    </button>
  )
}
