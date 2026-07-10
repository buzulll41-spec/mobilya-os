/**
 * Sipariş operasyon paneli — durum akışı (Türkçe adımlar).
 *
 * @param {{
 *   steps: import('../../../mappers/order/orderCommandCenterModel.js').LifecycleFlowStep[]
 *   title?: string
 * }} props
 */
function OperationStatusFlow({ steps, title = 'Operasyon akışı' }) {
  return (
    <section className="oop-card oop-card--flow" aria-labelledby="oop-flow-title">
      <h3 id="oop-flow-title" className="oop-card-title">
        {title}
      </h3>
      <ol className="oop-lifecycle">
        {steps.map((step, index) => (
          <li
            key={step.id}
            className={`oop-lifecycle__item oop-lifecycle__item--${step.state}`}
            title={[step.detail ?? step.hint, step.timestamp].filter(Boolean).join(' · ') || undefined}
          >
            <span className="oop-lifecycle__rail" aria-hidden>
              {index < steps.length - 1 ? <span className="oop-lifecycle__line" /> : null}
              <span className="oop-lifecycle__node">
                {step.state === 'done' ? '✓' : step.state === 'current' ? '●' : '○'}
              </span>
            </span>
            <div className="oop-lifecycle__content">
              <p className="oop-lifecycle__label">{step.label}</p>
              {step.detail || step.hint ? (
                <p className="oop-lifecycle__detail">{step.detail ?? step.hint}</p>
              ) : null}
              {step.timestamp && step.state === 'done' ? (
                <p className="oop-lifecycle__time">{step.timestamp}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default OperationStatusFlow
