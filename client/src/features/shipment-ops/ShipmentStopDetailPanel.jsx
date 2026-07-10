import { createPortal } from 'react-dom'
import { useEffect } from 'react'

import { buildShipmentStopDetailModel } from '../../mappers/shipment-ops/buildShipmentStopDetailModel.js'
import { IconClose } from '../../components/Icons.jsx'
import '../../styles/shipment-stop-detail.css'

/** @typedef {import('../../mappers/shipment-ops/shipmentOpsAgendaViewModel.js').ShipmentAgendaItem} ShipmentAgendaItem */
/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/**
 * @param {{
 *   open: boolean
 *   item: ShipmentAgendaItem | null
 *   order?: Order
 *   listItemDto?: SalesOrderListItemDto
 *   plan?: ShipmentPlan
 *   onClose: () => void
 * }} props
 */
export default function ShipmentStopDetailPanel({
  open,
  item,
  order,
  listItemDto,
  plan,
  onClose,
}) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !item) return null

  const model = buildShipmentStopDetailModel({ item, order, listItemDto, plan })

  return createPortal(
    <div className="ssd-overlay" role="dialog" aria-modal="true" aria-label={`Sevk detay — ${model.customer}`}>
      <div className="ssd-shell">
        <nav className="ssd-nav" aria-label="Geri dön">
          <button type="button" className="ssd-back" onClick={onClose}>
            ← Sevk Operasyonuna Dön
          </button>
        </nav>

        <div className="ssd-panel">
          <header className="ssd-head">
            <div className="ssd-head__main">
              <p className="ssd-kicker">Sevk &amp; Montaj</p>
              <h1 className="ssd-title">{model.customer}</h1>
              <p className="ssd-sub">
                {model.orderNumber} · {model.plannedDateLabel}
              </p>
            </div>
            <button type="button" className="ssd-close" onClick={onClose} aria-label="Kapat">
              <IconClose />
            </button>
          </header>

          <main className="ssd-body">
        <section className="ssd-hero">
          <div className="ssd-hero__time">
            <span className="ssd-hero__label">Planlanan saat</span>
            <strong>{model.hasPlannedTime ? model.plannedTime : 'Saat girilmedi'}</strong>
          </div>
          <span className={`ssd-status ssd-status--${model.paymentComplete ? 'ok' : 'warn'}`}>
            {model.statusLabel}
          </span>
        </section>

        <section className="ssd-card">
          <h2 className="ssd-card__title">Araç & ekip</h2>
          <dl className="ssd-dl">
            <div>
              <dt>Araç</dt>
              <dd>{model.vehicle}</dd>
            </div>
            <div>
              <dt>Ekip</dt>
              <dd>
                {model.crewMembers.length ? (
                  <ul className="ssd-crew">
                    {model.crewMembers.map((member) => (
                      <li key={member}>{member}</li>
                    ))}
                  </ul>
                ) : (
                  model.crewLabel
                )}
              </dd>
            </div>
          </dl>
        </section>

        <section className="ssd-card">
          <h2 className="ssd-card__title">İletişim & adres</h2>
          <dl className="ssd-dl">
            <div>
              <dt>Telefon</dt>
              <dd>{model.phone}</dd>
            </div>
            <div>
              <dt>Adres</dt>
              <dd>{model.address}</dd>
            </div>
            <div>
              <dt>Bölge</dt>
              <dd>{model.region}</dd>
            </div>
          </dl>

          <div className="ssd-actions">
            {model.mapsHref ? (
              <a
                className="ssd-btn ssd-btn--maps"
                href={model.mapsHref}
                target="_blank"
                rel="noopener noreferrer"
              >
                Google Maps&apos;te aç
              </a>
            ) : (
              <button type="button" className="ssd-btn ssd-btn--maps" disabled>
                Google Maps&apos;te aç
              </button>
            )}
            {model.phoneDialHref ? (
              <a className="ssd-btn ssd-btn--call" href={model.phoneDialHref}>
                Müşteriyi ara
              </a>
            ) : (
              <button type="button" className="ssd-btn ssd-btn--call" disabled>
                Müşteriyi ara
              </button>
            )}
          </div>
        </section>

        <section className="ssd-card ssd-card--payment">
          <h2 className="ssd-card__title">Tahsilat</h2>
          <p className={`ssd-payment ${model.paymentComplete ? 'ssd-payment--ok' : 'ssd-payment--due'}`}>
            {model.paymentComplete ? 'Tahsilat tamam' : `${model.remainingPaymentLabel} kalan`}
          </p>
          {model.collectionNote !== '—' ? (
            <p className="ssd-note-block">
              <span className="ssd-note-block__label">Tahsilat notu</span>
              {model.collectionNote}
            </p>
          ) : null}
        </section>

        <section className="ssd-card">
          <h2 className="ssd-card__title">Montaj notları</h2>
          <p className="ssd-note-block">{model.installationNote}</p>
          {model.shipmentNote !== '—' ? (
            <p className="ssd-note-block">
              <span className="ssd-note-block__label">Sevk notu</span>
              {model.shipmentNote}
            </p>
          ) : null}
        </section>

        <section className="ssd-card">
          <h2 className="ssd-card__title">Ürün</h2>
          <p className="ssd-product">{model.product}</p>
          {model.riskLabel !== 'Normal' && model.riskLabel !== 'Tahsilat tamam' ? (
            <p className="ssd-risk">⚠ {model.riskLabel}</p>
          ) : null}
        </section>
          </main>
        </div>
      </div>
    </div>,
    document.body,
  )
}
