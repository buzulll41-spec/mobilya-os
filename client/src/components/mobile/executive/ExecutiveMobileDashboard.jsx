import { useState } from 'react'
import ExecutiveMobileKpiCard from './ExecutiveMobileKpiCard.jsx'
import { EXECUTIVE_MOBILE_TIMELINE_PERIODS } from '../../../contracts/v1/executiveMobileFaz116.js'

const TIMELINE_LABELS = {
  today: 'Bugün',
  yesterday: 'Dün',
  week: 'Bu hafta',
}

/**
 * @param {{
 *   view: import('../../mappers/mobile/executiveMobileModel.js').ExecutiveMobileView
 *   healthScore?: number
 *   onNavigate?: (page: string) => void
 *   onApprove?: (row: import('../../mappers/collection/collectionPendingApprovalQueueModel.js').PendingApprovalQueueRow) => void | Promise<void>
 *   onReject?: (row: import('../../mappers/collection/collectionPendingApprovalQueueModel.js').PendingApprovalQueueRow) => void | Promise<void>
 *   onReview?: (row: import('../../mappers/collection/collectionPendingApprovalQueueModel.js').PendingApprovalQueueRow) => void
 *   onCeoFabAction?: (action: import('../../../contracts/v1/executiveMobileFaz116.js').ExecutiveMobileCeoFabActions[number]) => void
 *   mutating?: boolean
 * }} props
 */
export default function ExecutiveMobileDashboard({
  view,
  healthScore = 0,
  onNavigate,
  onApprove,
  onReject,
  onReview,
  onCeoFabAction,
  mutating = false,
}) {
  const [timelinePeriod, setTimelinePeriod] = useState(
    /** @type {'today' | 'yesterday' | 'week'} */ ('today'),
  )
  const [fabOpen, setFabOpen] = useState(false)

  const timelineItems = view.timeline[timelinePeriod] ?? []

  /** @param {import('../../mappers/mobile/executiveMobileModel.js').ExecutiveMobileKpi} kpi */
  function openKpi(kpi) {
    if (kpi.navTarget) onNavigate?.(kpi.navTarget)
  }

  return (
    <div className="exec-mobile-dashboard">
      <header className="exec-mobile-dashboard__head">
        <div>
          <p className="exec-mobile-dashboard__kicker">Executive Mobile</p>
          <h1 className="exec-mobile-dashboard__title">Şirket Özeti</h1>
        </div>
        {healthScore > 0 ? (
          <div className="exec-mobile-dashboard__health">
            <span>Sağlık</span>
            <strong>{Math.round(healthScore)}</strong>
          </div>
        ) : null}
      </header>

      <section className="exec-mobile-dashboard__kpis" aria-label="KPI kartları">
        {view.kpis.map((kpi) => (
          <ExecutiveMobileKpiCard key={kpi.id} kpi={kpi} onOpen={() => openKpi(kpi)} />
        ))}
      </section>

      <div className="exec-mobile-dashboard__alerts-opps">
        {view.criticalAlerts.length > 0 ? (
          <section className="exec-mobile-dashboard__alerts" aria-label="Kritik uyarılar">
          <h2 className="exec-mobile-dashboard__section-title">Kritik uyarılar</h2>
          <ul className="exec-mobile-alert-list">
            {view.criticalAlerts.map((alert) => (
              <li key={alert.id}>
                <button
                  type="button"
                  className={`exec-mobile-alert ${alert.tone === 'critical' ? 'is-critical' : 'is-warning'}`}
                  onClick={() => alert.navTarget && onNavigate?.(alert.navTarget)}
                >
                  <span className="exec-mobile-alert__dot" aria-hidden />
                  <span>
                    <strong>{alert.title}</strong>
                    <small>{alert.detail}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {view.opportunities.length > 0 ? (
        <section className="exec-mobile-dashboard__opps" aria-label="Fırsatlar">
          <h2 className="exec-mobile-dashboard__section-title">Fırsatlar</h2>
          <ul className="exec-mobile-opp-list">
            {view.opportunities.map((opp) => (
              <li key={opp.id}>
                <button
                  type="button"
                  className="exec-mobile-opp"
                  onClick={() => opp.navTarget && onNavigate?.(opp.navTarget)}
                >
                  <span>{opp.title}</span>
                  <strong>{opp.amountLabel}</strong>
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      </div>

      {view.quickApprovals.length > 0 ? (
        <section className="exec-mobile-dashboard__approvals" aria-label="Hızlı onay">
          <h2 className="exec-mobile-dashboard__section-title">Hızlı onay</h2>
          <ul className="exec-mobile-approval-list">
            {view.quickApprovals.map((row) => (
              <li key={row.paymentId} className="exec-mobile-approval">
                <div className="exec-mobile-approval__copy">
                  <strong>{row.customer}</strong>
                  <span>
                    {row.amountLabel} · {row.methodLabel}
                  </span>
                  <small>{row.orderNo}</small>
                </div>
                <div className="exec-mobile-approval__actions">
                  <button
                    type="button"
                    className="is-approve"
                    disabled={mutating}
                    onClick={() => void onApprove?.(row)}
                  >
                    Onayla
                  </button>
                  <button
                    type="button"
                    className="is-reject"
                    disabled={mutating}
                    onClick={() => void onReject?.(row)}
                  >
                    Reddet
                  </button>
                  <button type="button" className="is-review" onClick={() => onReview?.(row)}>
                    İncele
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="exec-mobile-dashboard__timeline" aria-label="CEO timeline">
        <h2 className="exec-mobile-dashboard__section-title">CEO Timeline</h2>
        <div className="exec-mobile-timeline-tabs" role="tablist">
          {EXECUTIVE_MOBILE_TIMELINE_PERIODS.map((period) => (
            <button
              key={period}
              type="button"
              role="tab"
              aria-selected={timelinePeriod === period}
              className={timelinePeriod === period ? 'is-active' : ''}
              onClick={() => setTimelinePeriod(period)}
            >
              {TIMELINE_LABELS[period]}
            </button>
          ))}
        </div>
        {timelineItems.length === 0 ? (
          <p className="exec-mobile-timeline-empty">Bu dönemde kayıt yok.</p>
        ) : (
          <ul className="exec-mobile-timeline-list">
            {timelineItems.map((item) => (
              <li key={item.id}>
                <span className="exec-mobile-timeline-list__time">{item.timeLabel}</span>
                <span className="exec-mobile-timeline-list__msg">{item.message}</span>
                <span className="exec-mobile-timeline-list__actor">{item.actor}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <footer className="exec-mobile-copilot-bar" aria-label="AI Copilot">
        <span className="exec-mobile-copilot-bar__label">Bugün ne yapmalıyım?</span>
        <p className="exec-mobile-copilot-bar__line">{view.copilotLine}</p>
        <button type="button" className="exec-mobile-copilot-bar__link" onClick={() => onNavigate?.('ceo-copilot')}>
          Copilot&apos;a git
        </button>
      </footer>

      <div className={`exec-mobile-ceo-fab ${fabOpen ? 'is-open' : ''}`}>
        {fabOpen ? (
          <div className="exec-mobile-ceo-fab__menu" role="menu">
            <button type="button" onClick={() => { onCeoFabAction?.('meeting-note'); setFabOpen(false) }}>
              Toplantı Notu
            </button>
            <button type="button" onClick={() => { onCeoFabAction?.('voice-note'); setFabOpen(false) }}>
              Sesli Not
            </button>
            <button type="button" onClick={() => { onCeoFabAction?.('reminder'); setFabOpen(false) }}>
              Hatırlatma
            </button>
          </div>
        ) : null}
        <button
          type="button"
          className="exec-mobile-ceo-fab__btn"
          aria-expanded={fabOpen}
          aria-label="CEO hızlı işlemler"
          onClick={() => setFabOpen((v) => !v)}
        >
          +
        </button>
      </div>
    </div>
  )
}
