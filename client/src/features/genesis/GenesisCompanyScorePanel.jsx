import { memo } from 'react'

/**
 * @param {{ score: { totalScore: number, dimensions: { id: string, label: string, score: number }[] } }} props
 */
function GenesisCompanyScorePanel({ score }) {
  return (
    <section className="mos-erp-cockpit-section genesis-score" aria-label="AI Company Score">
      <h2 className="mos-erp-cockpit-section__title">
        AI COMPANY SCORE · <strong>{score.totalScore}</strong>/100
      </h2>
      <dl className="genesis-score__grid">
        {score.dimensions.map((d) => (
          <div key={d.id} className="genesis-score__item">
            <dt>{d.label}</dt>
            <dd>{d.score}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default memo(GenesisCompanyScorePanel)
