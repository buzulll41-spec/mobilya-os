import AppChrome from '../components/AppChrome.jsx'
import MobileFab from '../components/mobile/MobileFab.jsx'
import MobileLongPressEnhancer from '../components/mobile/MobileLongPressEnhancer.jsx'
import MobilePullToRefresh from '../components/mobile/MobilePullToRefresh.jsx'
import MobileSwipeBackEnhancer from '../components/mobile/MobileSwipeBackEnhancer.jsx'
import MobileSwipeEnhancer from '../components/mobile/MobileSwipeEnhancer.jsx'
import MobileTabBar from '../components/mobile/MobileTabBar.jsx'
import MobileQuickActions from '../components/mobile/MobileQuickActions.jsx'
import { isMobileStoreOpsPage } from '../constants/mobileStoreOpsChecklist.js'
import { dispatchMobileFabIntent } from '../constants/mobileFabActions.js'
import { PAGE_TITLE } from '../constants/navigation.js'
import { useViewportTier } from '../hooks/useViewportTier.js'
import Sidebar from './Sidebar.jsx'

/**
 * @param {{
 *   page: string
 *   onNavigate: (id: string) => void
 *   sidebarOpen: boolean
 *   setSidebarOpen: (v: boolean) => void
 *   sidebarCollapsed: boolean
 *   onToggleSidebarCollapsed: () => void
 *   todayLabel: string
 *   globalSearch: string
 *   onGlobalSearchChange: (v: string) => void
 *   orders?: import('../data/seedOrders.js').Order[]
 *   onSearchSelect?: (result: import('../utils/globalSearchExperience.js').GlobalSearchResult) => void
 *   onCommitSearch?: (query: string, results: import('../utils/globalSearchExperience.js').GlobalSearchResult[]) => void
 *   onQuickAction?: (action: import('../lib/quickActions.js').QuickActionDef) => void
 *   onMobileFabIntent?: (intent: string) => void
 *   onPullRefresh?: () => void | Promise<void>
 *   onOpenOrderModal?: () => void
 *   onNotificationNavigate?: (page: string, ctx?: { orderId?: string }) => void
 *   notifications: { id: string; title: string; body: string; time: string; orderId?: string; severity?: string }[]
 *   navItems?: { id: string; label: string }[]
 *   userName?: string
 *   userRole?: string
 *   userRoleKey?: import('../contracts/v1/user.js').UserRole
 *   userInitials?: string
 *   onLogout?: () => void
 *   suspendMobileDock?: boolean
 *   children: import('react').ReactNode
 * }} props
 */
export default function AppLayout({
  page,
  onNavigate,
  sidebarOpen,
  setSidebarOpen,
  sidebarCollapsed,
  onToggleSidebarCollapsed,
  todayLabel,
  globalSearch,
  onGlobalSearchChange,
  orders,
  onSearchSelect,
  onCommitSearch,
  onQuickAction,
  onMobileFabIntent,
  onPullRefresh,
  onOpenOrderModal,
  onNotificationNavigate,
  notifications,
  navItems,
  userName,
  userRole,
  userRoleKey,
  userInitials,
  onLogout,
  suspendMobileDock = false,
  children,
}) {
  const viewportTier = useViewportTier()
  const isPhone = viewportTier === 'phone'
  const isTodayPhoneHome = isPhone && page === 'dashboard'
  const immersivePhoneHome = isTodayPhoneHome || (isPhone && page === 'orders')
  const isTouchDevice = viewportTier === 'phone' || viewportTier === 'tablet'
  const showStoreQuickDock = isPhone && isMobileStoreOpsPage(page) && page !== 'dashboard' && page !== 'orders'
  const showMobileFab = isPhone && !showStoreQuickDock && page !== 'dashboard' && page !== 'orders'
  const mobileDockMode = suspendMobileDock ? 'none' : showStoreQuickDock ? 'quick-actions' : 'fab'
  const tabletSidebarCollapsed = viewportTier === 'tablet' ? true : sidebarCollapsed
  const viewportClass =
    viewportTier === 'tablet'
      ? 'mos-viewport-tablet'
      : viewportTier === 'phone'
        ? 'mos-viewport-phone'
        : 'mos-viewport-desktop'
  const resolvedNavItems = navItems ?? []
  const activeNav = resolvedNavItems.find((item) => item.id === page) ?? null
  const pageTitle = PAGE_TITLE[page] ?? activeNav?.label ?? 'Evtrend'
  const pageSection = activeNav?.indent ? 'Modül' : 'Workspace'
  const latestNotification = notifications?.[0] ?? null
  const unreadNotificationCount = Array.isArray(notifications) ? notifications.length : 0
  const breadcrumbItems = ['Evtrend', pageSection, pageTitle]

  function handleFabIntent(intent) {
    if (onMobileFabIntent) {
      onMobileFabIntent(intent)
      return
    }
    if (intent === 'new-order') {
      onQuickAction?.({ id: 'new-order', label: 'Yeni Sipariş', action: 'new-order' })
      return
    }
    dispatchMobileFabIntent(intent)
  }

  const content =
    isPhone && onPullRefresh ? (
      <MobilePullToRefresh onRefresh={onPullRefresh}>{children}</MobilePullToRefresh>
    ) : (
      children
    )

  return (
    <div
      className={`mos mos-mobile-pwa ${viewportClass}`}
      data-sidebar-collapsed={tabletSidebarCollapsed ? 'true' : 'false'}
      data-viewport={viewportTier}
      data-mobile-dock={isPhone ? mobileDockMode : 'none'}
    >
      <div
        className="mos-overlay"
        data-visible={sidebarOpen ? 'true' : 'false'}
        onClick={() => setSidebarOpen(false)}
        aria-hidden
      />

      {!immersivePhoneHome ? (
        <Sidebar
          page={page}
          onNavigate={onNavigate}
          mobileOpen={sidebarOpen}
          onMobileClose={() => setSidebarOpen(false)}
          todayLabel={todayLabel}
          collapsed={tabletSidebarCollapsed}
          onToggleCollapsed={onToggleSidebarCollapsed}
          navItems={navItems}
        />
      ) : null}

      <div className="mos-main">
        <div className="mos-shell-safe-area">
          {!immersivePhoneHome ? (
            <div className="mos-shell-topbar">
              <AppChrome
                page={page}
                compactMobileChrome={isTodayPhoneHome}
                pageTitle={pageTitle}
                pageSection={pageSection}
                globalSearch={globalSearch}
                onGlobalSearchChange={onGlobalSearchChange}
                orders={orders}
                onSearchSelect={onSearchSelect}
                onCommitSearch={onCommitSearch}
                onMobileMenu={() => setSidebarOpen(true)}
                notifications={notifications}
                onNotificationNavigate={onNotificationNavigate}
                onQuickAction={onQuickAction}
                userName={userName}
                userRole={userRole}
                userRoleKey={userRoleKey}
                userInitials={userInitials}
                onLogout={onLogout}
              />
            </div>
          ) : null}

          <div className="mos-shell-page">
            {!immersivePhoneHome ? (
            <div className="mos-shell-page-head">
              <nav className="mos-shell-breadcrumb" aria-label="Breadcrumb">
                {breadcrumbItems.map((label, index) => (
                  <span key={`${label}-${index}`} className="mos-shell-breadcrumb__item">
                    <span>{label}</span>
                    {index < breadcrumbItems.length - 1 ? <span className="mos-shell-breadcrumb__sep">/</span> : null}
                  </span>
                ))}
              </nav>

              <div className="mos-shell-hero">
                <div className="mos-shell-hero__copy">
                  <p className="mos-shell-kicker">{pageSection}</p>
                  <h1 className="mos-shell-title">{pageTitle}</h1>
                  <p className="mos-shell-subtitle">Tüm modüller ortak app shell içinde aynı navigasyon ve çalışma ritmini kullanır.</p>
                </div>

                <div className="mos-shell-hero__meta">
                  <section className="mos-shell-action-area" aria-label="Action area">
                    <span className="mos-shell-action-area__label">Action Area</span>
                    <strong>{todayLabel}</strong>
                    <span>{viewportTier === 'phone' ? 'Mobile layout' : viewportTier === 'tablet' ? 'Tablet layout' : 'Desktop layout'}</span>
                  </section>

                  <section className="mos-shell-notification-area" aria-label="Notification area">
                    <div className="mos-shell-notification-area__head">
                      <span>Notification Area</span>
                      <strong>{unreadNotificationCount}</strong>
                    </div>
                    <p className="mos-shell-notification-area__body">{latestNotification?.title ?? 'Yeni bildirim yok'}</p>
                  </section>
                </div>
              </div>
            </div>
            ) : null}

            <div className="mos-shell-scroll">
              <div className="mos-shell-page-container">
                <div className="mos-content">{content}</div>
              </div>
            </div>
          </div>
        </div>

        {isTouchDevice ? (
          <>
            <MobileSwipeBackEnhancer />
            {isPhone ? (
              <>
                <MobileSwipeEnhancer />
                <MobileLongPressEnhancer />
                {!suspendMobileDock && showMobileFab ? (
                  <MobileFab page={page} onFabIntent={handleFabIntent} />
                ) : null}
                {!suspendMobileDock ? (
                  <MobileTabBar
                    page={page}
                    sidebarOpen={sidebarOpen}
                    onNavigate={onNavigate}
                    onOpenMenu={() => setSidebarOpen(true)}
                  />
                ) : null}
                {showStoreQuickDock && !suspendMobileDock ? (
                  <MobileQuickActions
                    className="mos-mobile-quick-actions--dock"
                    onNavigate={onNavigate}
                    onNewOrder={onOpenOrderModal}
                    onFocusSearch={() => document.querySelector('.mos-global-search-input')?.focus()}
                  />
                ) : null}
              </>
            ) : null}
          </>
        ) : null}
      </div>
    </div>
  )
}
