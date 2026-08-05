import { formatTry } from '../../../data/index.js'

/**
 * @param {{
 *   lines: { label: string, value: string | number, format?: string, accent?: boolean }[]
 *   paidPct: number
 *   remaining: number
 * }} props
 */
export default function OrderPanelFinanceCard({ lines, paidPct, remaining }) {
  return (
    <section className="oop-card oop-card--saas oop-card--finance-compact" aria-labelledby="oop-finance-title">
      <h3 id="oop-finance-title" className="oop-card-title">
        Finansal özet
      </h3>
      <dl className="oop-finance-compact">
        {lines.map((line) => (
          <div key={line.label} className="oop-finance-compact__row">
            <dt>{line.label}</dt>
            <dd
              className={
                line.accent && typeof line.value === 'number' && line.value > 0.009
                  ? 'oop-finance-compact__due'
                  : undefined
              }
            >
              {line.format === 'money' && typeof line.value === 'number'
                ? formatTry(line.value)
                : String(line.value)}
            </dd>
          </div>
        ))}
      </dl>
      <div className="oop-bar oop-bar--thin" aria-hidden>
        <span className="oop-bar__fill" style={{ width: `${Math.min(100, paidPct)}%` }} />
      </div>
      <p className="oop-finance-compact__foot">
        Tahsilat <strong>%{paidPct}</strong>
        {remaining > 0.009 ? (
          <>
            {' '}
            · Kalan <strong className="oop-finance-compact__due">{formatTry(remaining)}</strong>
          </>
        ) : null}
      </p>
    </section>
  )
}
