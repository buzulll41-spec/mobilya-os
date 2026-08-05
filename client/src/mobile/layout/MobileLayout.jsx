import { BottomNavigation } from '../design-system/MobileOpsV2Components.jsx'

/**
 * @param {{
 *   page: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'ssh' | 'warehouse' | 'reports'
 *   onNavigate: (page: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'ssh' | 'warehouse' | 'reports') => void
 *   onOpenOrderModal?: () => void
 *   children: import('react').ReactNode
 * }} props
 */
export default function MobileLayout({ page, onNavigate, onOpenOrderModal, children }) {
  const showCompactChrome = page !== 'home'
  const shellClassName = `mos mos-mobile-pwa mos-viewport-phone ${page === 'home' ? 'evtrend-native-home-shell' : ''}`

  return (
    <div className={shellClassName} data-viewport="phone" data-mobile-shell="true">
      <div className="mos-main">
        <div className="mos-shell-safe-area">
          {showCompactChrome ? (
            <header className="mos-app-chrome mos-app-chrome--compact-mobile" data-compact-mobile="true">
              <div className="mos-app-chrome-left mos-app-chrome-left--compact-brand" aria-label="Evtrend Mobile">
                <span className="mos-app-chrome-brand-wordmark">evtrend mobile</span>
              </div>
            </header>
          ) : null}
          <div className="mos-shell-page">
            <div className="mos-shell-scroll">
              <div className="mos-shell-page-container">
                <div className="mos-content">{children}</div>
              </div>
            </div>
          </div>
        </div>
        <BottomNavigation page={page} onNavigate={onNavigate} onPrimaryAction={onOpenOrderModal} />
      </div>
    </div>
  )
}
