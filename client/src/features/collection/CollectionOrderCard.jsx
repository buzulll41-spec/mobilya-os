import { formatTry } from '../../data/dashboardHelpers.js'
import { isDeliveredOpenBalance, PRIORITY_CALL_LIMIT } from '../../mappers/collection/collectionCommandCenterModel.js'
import { formatCustomerPhonesCompact } from '../orders/newOrderWizardModel.js'
import { getCollectionOperationCategoryMeta } from './collectionOperationCategoryUi.js'
import { buildCollectionSuggestedAction } from './collectionSuggestedActionUi.js'

/** @typedef {import('../../mappers/collection/collectionCommandCenterModel.js').CollectionCardModel} CollectionCardModel */

/**
 * @param {string} phone
 */
function phoneDigits(phone) {
  return phone.replace(/\D/g, '')
}

/**
 * @param {{
 *   card: CollectionCardModel
 *   todayIso: string
 *   priorityRank?: number | null
 *   onOpenOrder?: () => void
 *   onOpenPayment?: () => void
 * }} props
 */
export default function CollectionOrderCard({
  card,
  todayIso,
  priorityRank = null,
  onOpenOrder,
  onOpenPayment,
}) {
  const { row, remaining, paidPct, stripeTone, orderNo, productDisplay, productOverflow } = card
  const deliveredOpen = isDeliveredOpenBalance(row)
  const category = getCollectionOperationCategoryMeta(card, todayIso)
  const suggested = buildCollectionSuggestedAction(card, todayIso)
  const phone = row.phone?.trim() || row.phone2?.trim() || ''
  const hasPhone = Boolean(phone)
  const phoneDisplay = hasPhone
    ? formatCustomerPhonesCompact({ phone: row.phone, phone2: row.phone2 })
    : null
  const telHref = phone ? `tel:${phone.replace(/\s/g, '')}` : null
  const digits = phone ? phoneDigits(phone) : ''
  const whatsappHref = digits ? `https://wa.me/${digits.replace(/^0/, '90')}` : null
  const progressPct = Math.min(100, Math.max(0, paidPct))

  const categoryBadgeLabel =
    category.id === 'critical'
      ? 'KRİTİK TAHSİLAT'
      : category.id === 'risky'
        ? 'RİSKLİ'
        : category.id === 'watch'
          ? 'TAKİP'
          : 'NORMAL'

  return (
    <article className={`coll-row coll-row--stripe-${stripeTone} coll-v31-row coll-v31-row--${category.id}`}>
      <div className={`coll-v31-category coll-v31-category--${category.badgeLevel}`}>
        <span className="coll-v31-category__emoji" aria-hidden>
          {category.emoji}
        </span>
        <span className="coll-v31-category__label">{categoryBadgeLabel}</span>
      </div>

      {deliveredOpen ? (
        <div className="coll-v31-delivered-banner">Teslim edildi · bakiye açık</div>
      ) : null}

      <div className="coll-v31-body">
        <div className="coll-v31-hero">
          {priorityRank != null && priorityRank <= PRIORITY_CALL_LIMIT ? (
            <span className="coll-v31-priority">🔥 #{priorityRank} bugün müdahale</span>
          ) : null}
          <p className="coll-v31-balance-label">Kalan bakiye</p>
          <p className="coll-v31-balance-amount">{formatTry(remaining)}</p>

          <div className="coll-v31-progress" aria-label={`Tahsilat oranı yüzde ${progressPct}`}>
            <div className="coll-v31-progress-track">
              <div
                className={`coll-v31-progress-fill coll-v31-progress-fill--${category.badgeLevel}`}
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="coll-v31-progress-label">%{progressPct} tahsil edildi</span>
          </div>

          <div className={`coll-v31-action coll-v31-action--${suggested.tone}`}>
            <p className="coll-v31-action-kicker">Önerilen aksiyon</p>
            <p className="coll-v31-action-title">
              <span aria-hidden>{suggested.icon}</span> {suggested.title}
            </p>
            <p className="coll-v31-action-reason">
              <span className="coll-v31-action-reason-label">Sebep:</span> {suggested.detail}
            </p>
            {hasPhone ? (
              <a className="coll-v31-action-call" href={telHref ?? undefined}>
                Hemen ara
              </a>
            ) : null}
          </div>
        </div>

        <div className="coll-v31-side">
          <button type="button" className="coll-v31-customer" onClick={onOpenOrder}>
            {row.customer}
          </button>
          <div className="coll-v31-meta">
            <span className="coll-v31-order-no">{orderNo}</span>
            {hasPhone ? (
              <span className="coll-v31-phone">{phoneDisplay}</span>
            ) : (
              <span className="coll-v31-phone-missing">⚠ Telefon eksik</span>
            )}
          </div>
          <p className="coll-v31-product">
            {productDisplay}
            {productOverflow ? <span className="coll-v31-product-more"> {productOverflow}</span> : null}
          </p>
          <p className="coll-v31-health-hint">{card.healthLabel}</p>
        </div>

        <div className="coll-v31-actions">
          <div className="coll-v31-primary-actions">
            <button type="button" className="coll-action coll-action--primary" onClick={onOpenPayment}>
              Ödeme al
            </button>
            <button type="button" className="coll-action coll-action--secondary" onClick={onOpenOrder}>
              Detay
            </button>
          </div>
          {hasPhone ? (
            <div className="coll-v31-icon-actions">
              <a className="coll-v31-icon-btn" href={telHref ?? undefined} aria-label="Ara" title="Ara">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
                  <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z" />
                </svg>
              </a>
              <a
                className="coll-v31-icon-btn"
                href={whatsappHref ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="WhatsApp"
                title="WhatsApp"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                </svg>
              </a>
            </div>
          ) : null}
        </div>
      </div>
    </article>
  )
}
