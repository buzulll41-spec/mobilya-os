import { useMemo } from 'react'
import { DEMO_TODAY } from '../../../data/constants.js'
import { buildOrderLifecycleTimeline } from '../../../mappers/order/orderLifecycleTimelineModel.js'
import '../../../styles/order-lifecycle-timeline.css'

/** @typedef {import('../../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../../../contracts/orderDrawer.js').OrderDrawerTab} OrderDrawerTab */

/**
 * @param {{
 *   order: Order
 *   listItemDto?: SalesOrderListItemDto
 *   domainEvents?: DomainEventDto[]
 *   todayIso?: string
 *   onNavigateTab: (tab: OrderDrawerTab) => void
 * }} props
 */
export default function OrderPanelLifecycleTimeline({
  order,
  listItemDto,
  domainEvents = [],
  todayIso = DEMO_TODAY,
  onNavigateTab,
}) {
  const view = useMemo(
    () => buildOrderLifecycleTimeline(order, listItemDto, domainEvents, todayIso),
    [order, listItemDto, domainEvents, todayIso],
  )

  return (
    <div className="oop-lifecycle">
      <header className="oop-lifecycle__header">
        <dl className="oop-lifecycle__summary">
          <div>
            <dt>Sipariş</dt>
            <dd>{view.header.orderNo}</dd>
          </div>
          <div>
            <dt>Müşteri</dt>
            <dd>{view.header.customer}</dd>
          </div>
          <div>
            <dt>Telefon</dt>
            <dd>{view.header.phone}</dd>
          </div>
          <div>
            <dt>Toplam</dt>
            <dd>{view.header.totalLabel}</dd>
          </div>
          <div>
            <dt>Kalan</dt>
            <dd>{view.header.remainingLabel}</dd>
          </div>
          <div>
            <dt>Risk</dt>
            <dd>{view.header.riskLabel}</dd>
          </div>
          <div>
            <dt>Durum</dt>
            <dd>{view.header.status}</dd>
          </div>
        </dl>
        <div className="oop-lifecycle__progress" aria-label={`İlerleme yüzde ${view.progressPercent}`}>
          <div className="oop-lifecycle__progress-track">
            <div
              className="oop-lifecycle__progress-fill"
              style={{ width: `${view.progressPercent}%` }}
            />
          </div>
          <span className="oop-lifecycle__progress-label">%{view.progressPercent}</span>
        </div>
      </header>

      <ol className="oop-lifecycle__timeline" aria-label="Sipariş yaşam döngüsü">
        {view.milestones.map((step, index) => (
          <li key={step.id} className={`oop-lifecycle__step oop-lifecycle__step--${step.status}`}>
            {step.gapLabel && index > 0 ? (
              <div
                className={`oop-lifecycle__gap${step.gapOverdue ? ' oop-lifecycle__gap--overdue' : ''}`}
              >
                {step.gapOverdue ? '⚠ ' : null}
                {step.gapLabel}
                {step.gapWarning ? (
                  <span className="oop-lifecycle__gap-warn">{step.gapWarning}</span>
                ) : null}
              </div>
            ) : null}
            <button
              type="button"
              className="oop-lifecycle__step-btn"
              onClick={() => onNavigateTab(step.navTab)}
              disabled={step.status === 'pending'}
            >
              <span className="oop-lifecycle__icon" aria-hidden>
                {step.icon}
              </span>
              <span className="oop-lifecycle__step-body">
                <strong className="oop-lifecycle__step-title">{step.label}</strong>
                {step.dateLabel ? (
                  <span className="oop-lifecycle__step-meta">
                    {step.dateLabel}
                    {step.timeLabel ? ` · ${step.timeLabel}` : ''}
                    {step.actor ? ` · ${step.actor}` : ''}
                  </span>
                ) : step.status === 'in_progress' ? (
                  <span className="oop-lifecycle__step-meta oop-lifecycle__step-meta--active">
                    Devam ediyor
                  </span>
                ) : (
                  <span className="oop-lifecycle__step-meta oop-lifecycle__step-meta--muted">
                    Bekliyor
                  </span>
                )}
                {step.description ? (
                  <span className="oop-lifecycle__step-desc">{step.description}</span>
                ) : null}
              </span>
            </button>
          </li>
        ))}
      </ol>

      {view.aiEvents?.length > 0 ? (
        <section className="oop-lifecycle__ai" aria-label="AI olayları">
          <h3 className="oop-lifecycle__ceo-title">AI Satış Takibi</h3>
          <ul className="oop-lifecycle__ai-list">
            {view.aiEvents.map((evt) => (
              <li key={evt.id} className="oop-lifecycle__ai-item">
                <span className="oop-lifecycle__icon" aria-hidden>
                  🤖
                </span>
                <span className="oop-lifecycle__step-body">
                  <strong className="oop-lifecycle__step-title">{evt.label}</strong>
                  <span className="oop-lifecycle__step-meta">
                    {evt.taskTitle}
                    {evt.dateLabel ? ` · ${evt.dateLabel}` : ''}
                    {evt.timeLabel ? ` ${evt.timeLabel}` : ''}
                  </span>
                  {evt.description ? (
                    <span className="oop-lifecycle__step-desc">{evt.description}</span>
                  ) : null}
                </span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="oop-lifecycle__ceo" aria-label="Yaşam döngüsü analizi">
        <h3 className="oop-lifecycle__ceo-title">CEO Analizi</h3>
        <dl className="oop-lifecycle__ceo-grid">
          <div>
            <dt>Toplam Sipariş Süresi</dt>
            <dd>{view.ceoMetrics.totalOrderDuration}</dd>
          </div>
          <div>
            <dt>Üretim Süresi</dt>
            <dd>{view.ceoMetrics.productionDuration}</dd>
          </div>
          <div>
            <dt>Bekleme Süresi</dt>
            <dd>{view.ceoMetrics.waitingDuration}</dd>
          </div>
          <div>
            <dt>Sevk Süresi</dt>
            <dd>{view.ceoMetrics.shipmentDuration}</dd>
          </div>
          <div>
            <dt>Tahsilat Süresi</dt>
            <dd>{view.ceoMetrics.collectionDuration}</dd>
          </div>
          <div>
            <dt>Toplam Yaşam Döngüsü</dt>
            <dd>{view.ceoMetrics.totalLifecycle}</dd>
          </div>
        </dl>
        <p className="oop-lifecycle__ceo-note">
          AI yorumları ve otonom operasyon notları bu alana eklenecektir.
        </p>
      </section>
    </div>
  )
}
