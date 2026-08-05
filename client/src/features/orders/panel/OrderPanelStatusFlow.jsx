/**
 * Yatay mini durum akışı.
 *
 * @param {{
 *   steps: { id: string, label: string, state: 'done' | 'current' | 'pending' | 'warning' }[]
 *   onViewAll?: () => void
 *   embedded?: boolean
 * }} props
 */
export default function OrderPanelStatusFlow({ steps, onViewAll, embedded = false }) {
  const flow = (
    <>
      {!embedded ? (
        <div className="oop-card__head">
          <h3 id="oop-status-h-title" className="oop-card-title">
            Durum akışı
          </h3>
          {onViewAll ? (
            <button type="button" className="oop-link-btn oop-link-btn--secondary" onClick={onViewAll}>
              Tümünü gör
            </button>
          ) : null}
        </div>
      ) : null}
      <ol className="oop-status-h">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`oop-status-h__step oop-status-h__step--${step.state === 'warning' ? 'current' : step.state}`}
          >
            {index > 0 ? <span className="oop-status-h__line" aria-hidden /> : null}
            <span className="oop-status-h__dot" aria-hidden />
            <span className="oop-status-h__label">{step.label}</span>
          </li>
        ))}
      </ol>
    </>
  )

  if (embedded) {
    return <div className="oop-status-h-wrap">{flow}</div>
  }

  return (
    <section className="oop-card oop-card--saas oop-card--status-h" aria-labelledby="oop-status-h-title">
      {flow}
    </section>
  )
}
