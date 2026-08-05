import { formatTry } from '../../data/dashboardHelpers.js'
import { formatCustomerPhonesCompact } from '../orders/newOrderWizardModel.js'
import { buildLastContactNote } from './collectionErpTableUi.js'

/** @typedef {import('../../mappers/collection/collectionCommandCenterModel.js').CollectionCardModel} CollectionCardModel */
/** @typedef {import('../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */

/**
 * @param {{
 *   card: CollectionCardModel | null
 *   todayIso: string
 *   telHref: string | null
 *   whatsappHref: string | null
 *   onOpenOrder?: (row: CollectionRowVM) => void
 *   onOpenPayment?: (row: CollectionRowVM) => void
 * }} props
 */
export default function CollectionSelectedPanel({
  card,
  todayIso,
  telHref,
  whatsappHref,
  onOpenOrder,
  onOpenPayment,
}) {
  if (!card) {
    return (
      <aside className="coll-erp-detail" aria-label="Seçili müşteri">
        <p className="coll-erp-detail__empty">Listeden bir kayıt seçin.</p>
      </aside>
    )
  }

  const { row } = card
  const hasPhone = Boolean(telHref)
  const phoneDisplay = formatCustomerPhonesCompact({ phone: row.phone, phone2: row.phone2 })
  const contactNote = buildLastContactNote(card, todayIso)
  const paidPct = Math.min(100, Math.max(0, card.paidPct))

  return (
    <aside className="coll-erp-detail" aria-label="Seçili müşteri">
      <header className="coll-erp-detail__head">
        <button type="button" className="coll-erp-detail__customer" onClick={() => onOpenOrder?.(row)}>
          {row.customer}
        </button>
        <span className="coll-erp-detail__order">{card.orderNo}</span>
        {phoneDisplay ? <span className="coll-erp-detail__phone">{phoneDisplay}</span> : null}
      </header>

      <div className="coll-erp-detail__balance-block">
        <span className="coll-erp-detail__balance-label">Kalan bakiye</span>
        <p className="coll-erp-detail__balance">{formatTry(card.remaining)}</p>
        <div className="coll-erp-detail__pct" aria-label={`Tahsilat yüzde ${paidPct}`}>
          <div className="coll-erp-detail__pct-track">
            <div className="coll-erp-detail__pct-fill" style={{ width: `${paidPct}%` }} />
          </div>
          <span className="coll-erp-detail__pct-val">%{paidPct} tahsil</span>
        </div>
      </div>

      <div className="coll-erp-detail__note">
        <span className="coll-erp-detail__note-label">Son görüşme notu</span>
        <p className="coll-erp-detail__note-text">{contactNote}</p>
      </div>

      <div className="coll-erp-detail__actions">
        {hasPhone ? (
          <a className="coll-erp-detail__op" href={telHref ?? undefined}>
            Ara
          </a>
        ) : (
          <span className="coll-erp-detail__op coll-erp-detail__op--disabled" aria-disabled="true">
            Ara
          </span>
        )}
        {hasPhone ? (
          <a
            className="coll-erp-detail__op"
            href={whatsappHref ?? undefined}
            target="_blank"
            rel="noopener noreferrer"
          >
            WhatsApp
          </a>
        ) : (
          <span className="coll-erp-detail__op coll-erp-detail__op--disabled" aria-disabled="true">
            WhatsApp
          </span>
        )}
        <button type="button" className="coll-erp-detail__op coll-erp-detail__op--pay" onClick={() => onOpenPayment?.(row)}>
          Ödeme Al
        </button>
      </div>

      <button type="button" className="coll-erp-detail__link" onClick={() => onOpenOrder?.(row)}>
        Sipariş detayı →
      </button>
    </aside>
  )
}
