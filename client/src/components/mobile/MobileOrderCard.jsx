import { memo } from 'react'

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
 *   dense?: boolean
 *   selected?: boolean
 *   onOpen?: () => void
 * }} props
 */
function MobileOrderCard({ card, dense = false, selected = false, onOpen }) {
  return (
    <button
      type="button"
      className={`mos-mobile-order-card ${dense ? 'mos-mobile-order-card--dense' : ''} ${toneClass(card.tone)} ${selected ? 'is-selected' : ''}`.trim()}
      data-order-row-id={card.id}
      aria-label={`${card.customer}, ${card.orderNo}, ${card.statusLabel}, ${card.riskLabel}`}
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
        {dense ? (
          <>
            <div>
              <dt>Tutar</dt>
              <dd>{card.amountLabel}</dd>
            </div>
            <div>
              <dt>Kalan ödeme</dt>
              <dd>{card.balanceLabel}</dd>
            </div>
            <div>
              <dt>Sevk durumu</dt>
              <dd>{card.shipmentLabel}</dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd data-tone={card.riskTone ?? 'neutral'}>{card.riskLabel}</dd>
            </div>
          </>
        ) : (
          <>
            <div>
              <dt>Tutar</dt>
              <dd>{card.amountLabel}</dd>
            </div>
            <div>
              <dt>Aktif asama</dt>
              <dd>{card.activeStage ?? card.statusLabel}</dd>
            </div>
            <div>
              <dt>Risk</dt>
              <dd data-tone={card.riskTone ?? 'neutral'}>{card.riskLabel}</dd>
            </div>
            <div>
              <dt>Teslim</dt>
              <dd>{card.deliveryDateLabel ?? card.terminLabel}</dd>
            </div>
            <div>
              <dt>Sonraki adim</dt>
              <dd>{card.nextStep ?? 'Detayi ac'}</dd>
            </div>
          </>
        )}
      </dl>
      <div className="evm-order-list-v1__progress-block" style={{ marginTop: '0.4rem' }}>
        <div className="evm-order-list-v1__progress-labels">
          <span>Ilerleme</span>
          <strong>%{Number(card.progressPercent ?? 0)}</strong>
        </div>
        <div className="evm-order-list-v1__progress" aria-hidden>
          <span style={{ width: `${Math.max(0, Math.min(100, Number(card.progressPercent ?? 0)))}%` }} />
        </div>
      </div>
      <span className="mos-mobile-order-card__order-no">{card.orderNo}</span>
    </button>
  )
}

export default memo(MobileOrderCard)
