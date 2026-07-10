/**
 * CSS mini bar chart — harici chart kütüphanesi yok.
 *
 * @param {{
 *   title: string
 *   labels: string[]
 *   values: number[]
 *   formatValue?: (n: number) => string
 *   tone?: 'sales' | 'orders' | 'collect' | 'ship'
 * }} props
 */
export default function ExecutiveMiniTrend({
  title,
  labels,
  values,
  formatValue = (n) => String(n),
  tone = 'sales',
}) {
  const max = Math.max(...values, 1)

  return (
    <section className={`mos-exec-trend mos-exec-trend--${tone}`} aria-label={`${title} trendi`}>
      <header className="mos-exec-trend__head">
        <h3 className="mos-exec-trend__title">{title}</h3>
        <span className="mos-exec-trend__total">{formatValue(values.reduce((s, v) => s + v, 0))}</span>
      </header>
      <div className="mos-exec-trend__bars" role="img" aria-hidden>
        {values.map((value, i) => {
          const heightPct = Math.max(8, Math.round((value / max) * 100))
          return (
            <div key={labels[i]} className="mos-exec-trend__bar-wrap">
              <div
                className="mos-exec-trend__bar"
                style={{ height: `${heightPct}%` }}
                title={`${labels[i]}: ${formatValue(value)}`}
              />
              <span className="mos-exec-trend__label">{labels[i]}</span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
