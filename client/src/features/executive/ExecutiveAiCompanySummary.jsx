import { memo } from 'react'

/**
 * @param {{ summary: { headline: string, items: { id: string, label: string, value: string }[] } }} props
 */
function ExecutiveAiCompanySummary({ summary }) {
  return (
    <section className="ecc-section ecc-section--company-summary" aria-label="AI Company Summary">
      <h2 className="ecc-section__title">{summary.headline}</h2>
      {summary.scenarioLabel ? (
        <p className="ecc-company-summary__scenario">
          Senaryo: <strong>{summary.scenarioLabel}</strong>
          {summary.dominantDomain ? ` · Odak: ${summary.dominantDomain}` : null}
        </p>
      ) : null}
      <dl className="ecc-company-summary__grid">
        {summary.items.map((item) => (
          <div key={item.id} className="ecc-company-summary__item">
            <dt>{item.label}</dt>
            <dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export default memo(ExecutiveAiCompanySummary)
