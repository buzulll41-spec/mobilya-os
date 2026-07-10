import { memo } from 'react'

/**
 * @param {{
 *   rows: { id: string, label: string, bar: string, count: number, tone?: string }[]
 * }} props
 */
function ExecutiveDepartmentHeatmap({ rows }) {
  return (
    <section className="ecc-section" aria-label="Departman yoğunluk haritası">
      <h2 className="ecc-section__title">Yoğunluk Haritası · Bugün</h2>
      <ul className="ecc-heatmap">
        {rows.map((row) => (
          <li key={row.id} className={`ecc-heatmap__row ecc-heatmap__row--${row.tone ?? 'neutral'}`}>
            <span className="ecc-heatmap__label">{row.label}</span>
            <span className="ecc-heatmap__bar" aria-hidden>
              {row.bar}
            </span>
            <span className="ecc-heatmap__count">{row.count}</span>
          </li>
        ))}
      </ul>
    </section>
  )
}

export default memo(ExecutiveDepartmentHeatmap)
