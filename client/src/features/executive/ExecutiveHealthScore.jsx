import { memo } from 'react'

/**
 * @param {{
 *   health: { score: number, label: string, tone: string, explanation: string }
 * }} props
 */
function ExecutiveHealthScore({ health }) {
  return (
    <section className="ecc-health" aria-label="Şirket sağlığı">
      <div className="ecc-health__ring" style={{ '--ecc-health-pct': `${health.score}%` }}>
        <span className="ecc-health__score">{health.score}</span>
      </div>
      <div className="ecc-health__copy">
        <h2 className="ecc-health__title">Şirket Sağlığı</h2>
        <p className={`ecc-health__label ecc-health__label--${health.tone}`}>{health.label}</p>
        <p className="ecc-health__expl">{health.explanation}</p>
      </div>
    </section>
  )
}

export default memo(ExecutiveHealthScore)
