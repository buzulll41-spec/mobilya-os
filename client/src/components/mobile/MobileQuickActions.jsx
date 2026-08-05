import { MOBILE_STORE_QUICK_ACTIONS } from '../../mappers/mobile/mobileStoreOpsModel.js'
import { navigateWithOpsFilter } from '../../lib/opsDeepLink.js'
import { memo } from 'react'

/**
 * @param {{
 *   onNavigate?: (page: string, ctx?: { opsFilter?: import('../../lib/opsDeepLink.js').OpsDeepLinkFilterId }) => void
 *   onNewOrder?: () => void
 *   onFocusSearch?: () => void
 *   className?: string
 * }} props
 */
function MobileQuickActions({
  onNavigate,
  onNewOrder,
  onFocusSearch,
  className = '',
}) {
  /** @param {typeof MOBILE_STORE_QUICK_ACTIONS[number]} action */
  function run(action) {
    if (action.actionKind === 'new-order') {
      onNewOrder?.()
      return
    }
    if (action.actionKind === 'focus-search') {
      onFocusSearch?.()
      return
    }
    if (!onNavigate || !action.navTarget) return
    if (action.navFilter) navigateWithOpsFilter(action.navTarget, action.navFilter, onNavigate)
    else onNavigate(action.navTarget)
  }

  return (
    <section
      className={`mos-mobile-quick-actions ${className}`.trim()}
      aria-label="Hızlı işlemler"
    >
      <h2 className="mos-mobile-quick-actions__title">Hızlı işlemler</h2>
      <div className="mos-mobile-quick-actions__grid">
        {MOBILE_STORE_QUICK_ACTIONS.map((action) => (
          <button
            key={action.id}
            type="button"
            className="mos-mobile-quick-actions__btn"
            onClick={() => run(action)}
          >
            <span className="mos-mobile-quick-actions__icon" aria-hidden>
              {action.icon}
            </span>
            <span className="mos-mobile-quick-actions__label">{action.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}

export default memo(MobileQuickActions)
