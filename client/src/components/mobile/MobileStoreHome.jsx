import { navigateWithOpsFilter } from '../../lib/opsDeepLink.js'
import { memo } from 'react'
import {
  IconChart,
  IconOrders,
  IconService,
  IconTruck,
  IconUsers,
  IconWallet,
} from '../Icons.jsx'

const CARD_ICONS = {
  collection: IconWallet,
  shipment: IconTruck,
  service: IconService,
  orders: IconOrders,
  customers: IconUsers,
  reports: IconChart,
}

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
 *   cards: import('../../mappers/mobile/mobileStoreOpsModel.js').MobileStoreHomeCard[]
 *   greeting?: string
 *   todayLabel?: string
 *   onNavigate?: (page: string, ctx?: { opsFilter?: import('../../lib/opsDeepLink.js').OpsDeepLinkFilterId }) => void
 * }} props
 */
function MobileStoreHome({ cards, greeting, todayLabel, onNavigate }) {
  /** @param {import('../../mappers/mobile/mobileStoreOpsModel.js').MobileStoreHomeCard} card */
  function openCard(card) {
    if (!onNavigate) return
    if (card.navFilter) navigateWithOpsFilter(card.navTarget, card.navFilter, onNavigate)
    else onNavigate(card.navTarget)
  }

  return (
    <section className="mos-mobile-store-home" aria-label="Mağaza özeti">
      <header className="mos-mobile-store-home__head">
        {todayLabel ? <p className="mos-mobile-store-home__date">{todayLabel}</p> : null}
        {greeting ? <h2 className="mos-mobile-store-home__greeting">{greeting}</h2> : null}
      </header>
      <div className="mos-mobile-store-home__grid">
        {cards.map((card) => {
          const Icon = CARD_ICONS[card.id] ?? IconOrders
          return (
            <button
              key={card.id}
              type="button"
              className={`mos-mobile-store-home__card ${toneClass(card.tone)}`}
              onClick={() => openCard(card)}
            >
              <span className="mos-mobile-store-home__card-top">
                <span className="mos-mobile-store-home__card-icon" aria-hidden>
                  <Icon />
                </span>
                <span className="mos-mobile-store-home__card-arrow" aria-hidden>
                  ›
                </span>
              </span>
              <span className="mos-mobile-store-home__card-label">{card.label}</span>
              <strong className="mos-mobile-store-home__card-value">{card.value}</strong>
              <span className="mos-mobile-store-home__card-hint">{card.hint}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}

export default memo(MobileStoreHome)
