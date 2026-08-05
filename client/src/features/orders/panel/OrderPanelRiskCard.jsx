/** @typedef {import('../../../mappers/risk/riskDrawerUi.js').ReturnType<typeof import('../../../mappers/risk/riskDrawerUi.js').buildRiskDrawerModel>} RiskDrawerModel */

/** @param {RiskDrawerModel['severity']} severity */
function riskVisual(severity) {
  switch (severity) {
    case 'CRITICAL':
      return { tone: 'critical', icon: '⛔', label: 'Kritik' }
    case 'HIGH':
      return { tone: 'high', icon: '🔴', label: 'Yüksek' }
    case 'MEDIUM':
      return { tone: 'medium', icon: '🟠', label: 'Orta' }
    case 'LOW':
      return { tone: 'low', icon: '🟡', label: 'Düşük' }
    default:
      return { tone: 'none', icon: '🟢', label: 'Yok' }
  }
}

/**
 * @param {{ riskModel: RiskDrawerModel }} props
 */
export default function OrderPanelRiskCard({ riskModel }) {
  if (riskModel.state === 'loading') {
    return (
      <section className="oop-card oop-card--saas oop-card--risk" aria-labelledby="oop-risk-title">
        <h3 id="oop-risk-title" className="oop-card-title">
          Risk Motoru
        </h3>
        <p className="oop-muted">Risk değerlendiriliyor…</p>
      </section>
    )
  }

  const visual = riskVisual(riskModel.severity)

  return (
    <section
      className={`oop-card oop-card--saas oop-card--risk oop-card--risk-${visual.tone} oop-card--risk-v10`}
      aria-labelledby="oop-risk-title"
    >
      <div className="oop-risk-v10-head">
        <div className="oop-risk-v10-level" aria-label={`Risk seviyesi: ${visual.label}`}>
          <span className="oop-risk-v10-icon" aria-hidden>
            {visual.icon}
          </span>
          <div>
            <p className="oop-risk-v10-kicker">Risk seviyesi</p>
            <strong className="oop-risk-v10-label">{visual.label}</strong>
          </div>
        </div>
        <h3 id="oop-risk-title" className="oop-card-title oop-risk-v10-title">
          Risk Motoru
        </h3>
      </div>

      {riskModel.showNoneMessage ? (
        <p className="oop-risk-summary oop-risk-summary--calm">Bu sipariş için aktif risk sinyali yok.</p>
      ) : (
        <>
          {riskModel.summary ? <p className="oop-risk-summary">{riskModel.summary}</p> : null}
          {riskModel.bullets.length > 0 ? (
            <ul className="oop-risk-bullets">
              {riskModel.bullets.slice(0, 4).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : null}
        </>
      )}
    </section>
  )
}
