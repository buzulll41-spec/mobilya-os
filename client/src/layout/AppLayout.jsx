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
  const isTouchDevice = viewportTier === 'phone' || viewportTier === 'tablet'
  const showStoreQuickDock = isPhone && isMobileStoreOpsPage(page) && page !== 'dashboard'
  const showMobileFab = isPhone && !showStoreQuickDock && page !== 'dashboard'
  const mobileDockMode = suspendMobileDock ? 'none' : showStoreQuickDock ? 'quick-actions' : 'fab'
  const tabletSidebarCollapsed = viewportTier === 'tablet' ? true : sidebarCollapsed
  const viewportClass =
    viewportTier === 'tablet'
      ? 'mos-viewport-tablet'
      : viewportTier === 'phone'
        ? 'mos-viewport-phone'
        : 'mos-viewport-desktop'

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

      <div className="mos-main">
        <AppChrome
          page={page}
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

        <div className="mos-content">{content}</div>

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
