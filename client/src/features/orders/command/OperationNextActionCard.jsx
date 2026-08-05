/**
 * @param {{
 *   action: import('../../../mappers/order/orderCommandCenterModel.js').NextActionModel
 *   onCta?: () => void
 * }} props
 */
export default function OperationNextActionCard({ action, onCta }) {
  const suggestion = action.suggestion ?? action.description
  const headlineClass =
    action.tone === 'warning' || action.tone === 'critical'
      ? ' oop-next-action-erp__headline--alert'
      : ''

  return (
    <section className="oop-next-action-erp" aria-labelledby="oop-next-action-title">
      <div className="oop-next-action-erp__body">
        <h3 id="oop-next-action-title" className="oop-next-action-erp__kicker">
          Sonraki aksiyon
        </h3>
        <p className={`oop-next-action-erp__headline${headlineClass}`}>{action.title}</p>
        {suggestion ? (
          <p className="oop-next-action-erp__suggestion">
            <span className="oop-next-action-erp__suggestion-label">Öneri:</span> {suggestion}
          </p>
        ) : null}
      </div>
      <button type="button" className="oop-btn oop-btn--primary oop-next-action-erp__cta" onClick={onCta}>
        {action.ctaLabel}
      </button>
    </section>
  )
}
