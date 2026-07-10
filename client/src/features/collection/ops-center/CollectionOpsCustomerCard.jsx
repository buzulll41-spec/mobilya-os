import { formatCustomerPhonesCompact } from '../../orders/newOrderWizardModel.js'

/** @typedef {import('../../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('./collectionOpsCenterUi.js').ReturnType<typeof import('./collectionOpsCenterUi.js').buildOpsCustomerCardModel>} OpsCustomerCardView */

/**
 * @param {{
 *   view: OpsCustomerCardView | null
 *   telHref: string | null
 *   whatsappHref: string | null
 *   onOpenPayment?: (row: CollectionRowVM) => void
 * }} props
 */
export default function CollectionOpsCustomerCard({
  view,
  telHref,
  whatsappHref,
  onOpenPayment,
}) {
  if (!view) {
    return (
      <section className="coll-ops-customer coll-ops-customer--empty" aria-label="Seçili müşteri">
        <p className="coll-ops-customer__empty">Tablodan müşteri seçin.</p>
      </section>
    )
  }

  const {
    card,
    customer,
    phone,
    orderDate,
    dueDateLabel,
    totalLabel,
    collectedLabel,
    remainingLabel,
    lastNote,
    riskReason,
    orderNo,
  } = view
  const hasPhone = Boolean(telHref)
  const phoneDisplay = formatCustomerPhonesCompact({
    phone: card.row.phone,
    phone2: card.row.phone2,
  })

  return (
    <section className="coll-ops-customer" aria-label="Seçili müşteri">
      <div className="coll-ops-customer__grid">
        <div className="coll-ops-customer__fields">
          <div className="coll-ops-customer__primary">
            <h2 className="coll-ops-customer__name">{customer}</h2>
            <span className="coll-ops-customer__order">{orderNo}</span>
            <span className="coll-ops-customer__phone">
              {phone ? phoneDisplay || phone : 'Telefon yok'}
            </span>
          </div>
          <dl className="coll-ops-customer__dl">
            <div>
              <dt>Sipariş tarihi</dt>
              <dd>{orderDate}</dd>
            </div>
            <div>
              <dt>Vade tarihi</dt>
              <dd>{dueDateLabel}</dd>
            </div>
            <div>
              <dt>Toplam sipariş</dt>
              <dd>{totalLabel}</dd>
            </div>
            <div>
              <dt>Tahsil edilen</dt>
              <dd>{collectedLabel}</dd>
            </div>
          </dl>
          <div className="coll-ops-customer__balance-wrap">
            <span className="coll-ops-customer__balance-label">Kalan bakiye</span>
            <p className="coll-ops-customer__balance">{remainingLabel}</p>
          </div>
          <div className="coll-ops-customer__notes">
            <div className="coll-ops-customer__note">
              <span className="coll-ops-customer__note-label">Son görüşme notu</span>
              <p title={lastNote}>{lastNote}</p>
            </div>
            <div className="coll-ops-customer__note">
              <span className="coll-ops-customer__note-label">Risk nedeni</span>
              <p>{riskReason}</p>
            </div>
          </div>
        </div>
        <div className="coll-ops-customer__actions">
          {hasPhone ? (
            <a className="coll-ops-customer__btn" href={telHref ?? undefined}>
              Ara
            </a>
          ) : (
            <span className="coll-ops-customer__btn is-disabled">Ara</span>
          )}
          {hasPhone ? (
            <a
              className="coll-ops-customer__btn"
              href={whatsappHref ?? undefined}
              target="_blank"
              rel="noopener noreferrer"
            >
              WhatsApp
            </a>
          ) : (
            <span className="coll-ops-customer__btn is-disabled">WhatsApp</span>
          )}
          <button
            type="button"
            className="coll-ops-customer__btn coll-ops-customer__btn--pay"
            onClick={() => onOpenPayment?.(card.row)}
          >
            Ödeme Al
          </button>
        </div>
      </div>
    </section>
  )
}
