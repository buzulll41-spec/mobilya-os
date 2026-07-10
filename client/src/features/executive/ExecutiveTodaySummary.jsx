import { memo } from 'react'

/**
 * @param {{
 *   summary: {
 *     headline: string
 *     items: { id: string, label: string, tone?: string }[]
 *     revenueLabel: string
 *   }
 * }} props
 */
function ExecutiveTodaySummary({ summary }) {
  return (
    <section className="ecc-today-summary" aria-label="Bugün neler oldu">
      <h2 className="ecc-section__title">{summary.headline}</h2>
      <ul className="ecc-today-summary__list">
        {summary.items.map((item) => (
          <li key={item.id} className={`ecc-today-summary__item ecc-today-summary__item--${item.tone ?? 'neutral'}`}>
            {item.label}
          </li>
        ))}
      </ul>
      <p className="ecc-today-summary__revenue">{summary.revenueLabel}</p>
    </section>
  )
}

export default memo(ExecutiveTodaySummary)
