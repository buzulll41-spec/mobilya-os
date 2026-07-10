import OrderPanelStatusFlow from './OrderPanelStatusFlow.jsx'

/**
 * Operasyon özeti — mevcut faz, durum akışı ve kısa uyarılar.
 *
 * @param {{
 *   phaseLabel: string
 *   steps: { id: string, label: string, state: 'done' | 'current' | 'pending' | 'warning' }[]
 *   highlights: string[]
 *   onViewHistory?: () => void
 * }} props
 */
export default function OrderPanelOperationSummaryCard({
  phaseLabel,
  steps,
  highlights,
  onViewHistory,
}) {
  return (
    <section className="oop-card oop-card--saas oop-card--ops-summary" aria-labelledby="oop-ops-summary-title">
      <div className="oop-card__head">
        <h3 id="oop-ops-summary-title" className="oop-card-title">
          Operasyon Özeti
        </h3>
        {onViewHistory ? (
          <button type="button" className="oop-link-btn oop-link-btn--secondary" onClick={onViewHistory}>
            İşlem Geçmişi
          </button>
        ) : null}
      </div>

      <div className="oop-ops-phase">
        <span className="oop-ops-phase__label">Güncel faz</span>
        <strong className="oop-ops-phase__value">{phaseLabel}</strong>
      </div>

      {highlights.length > 0 ? (
        <ul className="oop-ops-highlights">
          {highlights.slice(0, 4).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : (
        <p className="oop-muted oop-muted--block">Operasyon akışı normal seyrediyor.</p>
      )}

      <div className="oop-ops-summary-flow">
        <OrderPanelStatusFlow steps={steps} embedded />
      </div>
    </section>
  )
}
