/**
 * @param {'success' | 'warning' | 'critical' | 'neutral'} tone
 */
function toneClass(tone) {
  if (tone === 'success') return 'is-success'
  if (tone === 'warning') return 'is-warning'
  if (tone === 'critical') return 'is-critical'
  return ''
}

/**
 * @param {{
 *   card: import('../../mappers/mobile/mobileStoreOpsModel.js').MobileOrderCardVm
 *   selected?: boolean
 *   onOpen?: () => void
 * }} props
 */
export default function MobileOrderCard({ card, selected = false, onOpen }) {
  return (
    <button
      type="button"
      className={`mos-mobile-order-card ${toneClass(card.tone)} ${selected ? 'is-selected' : ''}`.trim()}
      data-order-row-id={card.id}
      onClick={onOpen}
    >
      <div className="mos-mobile-order-card__head">
        <div>
          <strong className="mos-mobile-order-card__customer">{card.customer}</strong>
          <span className="mos-mobile-order-card__phone">{card.phone}</span>
        </div>
        <span className="mos-mobile-order-card__status">{card.statusLabel}</span>
      </div>
      <dl className="mos-mobile-order-card__meta">
        <div>
          <dt>Termin</dt>
          <dd className={card.terminOverdue ? 'is-overdue' : ''}>{card.terminLabel}</dd>
        </div>
        <div>
          <dt>Bakiye</dt>
          <dd>{card.balanceLabel}</dd>
        </div>
        <div>
          <dt>Sevk</dt>
          <dd>{card.shipmentLabel}</dd>
        </div>
      </dl>
      <span className="mos-mobile-order-card__order-no">{card.orderNo}</span>
    </button>
  )
}
