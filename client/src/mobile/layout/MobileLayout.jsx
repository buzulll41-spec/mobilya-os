import { useEffect, useMemo, useState } from 'react'
import { IconDashboard, IconMenu, IconOrders, IconTruck, IconUsers } from '../../components/Icons.jsx'
import { useViewportTier } from '../../hooks/useViewportTier.js'
import { BottomNavigation } from '../design-system/MobileOpsV2Components.jsx'

/** @typedef {'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'ssh' | 'warehouse' | 'reports'} MobilePage */

const SIDEBAR_GROUPS = [
  {
    title: 'Ana Navigasyon',
    items: [
      { id: 'home', label: 'Ana Sayfa', icon: IconDashboard },
      { id: 'orders', label: 'Siparisler', icon: IconOrders },
      { id: 'customers', label: 'Musteriler', icon: IconUsers },
      { id: 'menu', label: 'Menu', icon: IconMenu },
    ],
  },
  {
    title: 'Operasyon',
    items: [
      { id: 'collection', label: 'Tahsilat', icon: IconTruck },
      { id: 'shipment', label: 'Sevkiyat', icon: IconTruck },
      { id: 'service', label: 'Servis', icon: IconTruck },
      { id: 'ssh', label: 'SSH', icon: IconTruck },
    ],
  },
]

/**
 * @param {{
 *   page: MobilePage
 *   onNavigate: (page: MobilePage) => void
 *   onOpenOrderModal?: () => void
 *   children: import('react').ReactNode
 * }} props
 */
export default function MobileLayout({ page, onNavigate, onOpenOrderModal, children }) {
  const viewportTier = useViewportTier()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const isPhone = viewportTier === 'phone'
  const isTablet = viewportTier === 'tablet'
  const isDesktop = viewportTier === 'desktop'
  const showCompactChrome = page !== 'home'
  const shellClassName = `mos mos-mobile-pwa mos-viewport-${viewportTier} ${page === 'home' ? 'evtrend-native-home-shell' : ''}`

  const activeNavId = useMemo(() => {
    if (page === 'home' || page === 'orders' || page === 'customers' || page === 'menu') return page
    if (page === 'collection' || page === 'shipment' || page === 'service' || page === 'ssh') return page
    return 'menu'
  }, [page])

  useEffect(() => {
    if (isDesktop) {
      setSidebarOpen(true)
      return
    }
    setSidebarOpen(false)
  }, [isDesktop])

  useEffect(() => {
    if (isTablet) setSidebarOpen(false)
  }, [page, isTablet])

  function handleNavigate(nextPage) {
    onNavigate(nextPage)
    if (isTablet) setSidebarOpen(false)
  }

  return (
    <div className={shellClassName} data-viewport={viewportTier} data-mobile-shell="true" data-sidebar-open={sidebarOpen ? 'true' : 'false'}>
      {!isPhone ? (
        <>
          <aside className="evm-v2-responsive-sidebar" aria-label="Responsive sidebar" data-open={sidebarOpen ? 'true' : 'false'}>
            <div className="evm-v2-responsive-sidebar__brand">
              <strong>evtrend</strong>
              <small>{isDesktop ? 'Desktop Workspace' : 'Tablet Workspace'}</small>
            </div>
            {SIDEBAR_GROUPS.map((group) => (
              <section key={group.title} className="evm-v2-responsive-sidebar__group" aria-label={group.title}>
                <p className="evm-v2-responsive-sidebar__group-label">{group.title}</p>
                <div className="evm-v2-responsive-sidebar__items">
                  {group.items.map((item) => {
                    const Icon = item.icon
                    const active = item.id === activeNavId
                    return (
                      <button
                        key={item.id}
                        type="button"
                        className="evm-v2-responsive-sidebar__item"
                        data-active={active ? 'true' : 'false'}
                        aria-current={active ? 'page' : undefined}
                        onClick={() => handleNavigate(/** @type {MobilePage} */ (item.id))}
                      >
                        <span className="evm-v2-responsive-sidebar__item-icon" aria-hidden>
                          <Icon />
                        </span>
                        <span>{item.label}</span>
                      </button>
                    )
                  })}
                </div>
              </section>
            ))}
          </aside>
          {isTablet ? (
            <button
              type="button"
              className="evm-v2-responsive-sidebar-backdrop"
              aria-label="Sidebar kapat"
              data-open={sidebarOpen ? 'true' : 'false'}
              onClick={() => setSidebarOpen(false)}
            />
          ) : null}
        </>
      ) : null}
      <div className="mos-main">
        <div className="mos-shell-safe-area">
          {isTablet && !showCompactChrome ? (
            <button
              type="button"
              className="evm-v2-responsive-sidebar-toggle evm-v2-responsive-sidebar-toggle--floating"
              aria-label="Sidebar ac"
              onClick={() => setSidebarOpen((value) => !value)}
            >
              <IconMenu />
            </button>
          ) : null}
          {showCompactChrome ? (
            <header className="mos-app-chrome mos-app-chrome--compact-mobile" data-compact-mobile="true">
              <div className="mos-app-chrome-left mos-app-chrome-left--compact-brand" aria-label="Evtrend Mobile">
                {isTablet ? (
                  <button
                    type="button"
                    className="evm-v2-responsive-sidebar-toggle"
                    aria-label="Sidebar ac"
                    onClick={() => setSidebarOpen((value) => !value)}
                  >
                    <IconMenu />
                  </button>
                ) : null}
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
        {isPhone ? <BottomNavigation page={page} onNavigate={onNavigate} onPrimaryAction={onOpenOrderModal} /> : null}
      </div>
    </div>
  )
}
