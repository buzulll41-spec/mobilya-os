import DataSourceIndicator from './DataSourceIndicator.jsx'
import BuildStatusIndicator from './BuildStatusIndicator.jsx'
import PilotModeIndicator from './chrome/PilotModeIndicator.jsx'
import ApiConnectionStatus from './chrome/ApiConnectionStatus.jsx'
import UserProfileCard from './chrome/UserProfileCard.jsx'
import GlobalSearchInput from './GlobalSearchInput.jsx'
import NotificationDropdown from './NotificationDropdown.jsx'
import QuickActionMenu from './QuickActionMenu.jsx'
import { IconMenu } from './Icons.jsx'
import { STORE_NAME } from '../constants/app.js'

/**
 * @param {{
 *   page: string
 *   compactMobileChrome?: boolean
 *   pageTitle?: string
 *   pageSection?: string
 *   globalSearch: string
 *   onGlobalSearchChange: (v: string) => void
 *   orders?: import('../data/seedOrders.js').Order[]
 *   onSearchSelect?: (result: import('../utils/globalSearchExperience.js').GlobalSearchResult) => void
 *   onCommitSearch?: (query: string, results: import('../utils/globalSearchExperience.js').GlobalSearchResult[]) => void
 *   onMobileMenu: () => void
 *   notifications: { id: string; title: string; body: string; time: string; orderId?: string; severity?: string }[]
 *   onNotificationNavigate?: (page: string, ctx?: { orderId?: string }) => void
 *   onQuickAction?: (action: import('../lib/quickActions.js').QuickActionDef) => void
 *   userName?: string
 *   userRole?: string
 *   userRoleKey?: import('../contracts/v1/user.js').UserRole
 *   userInitials?: string
 *   onLogout?: () => void
 * }} props
 */
export default function AppChrome({
  page,
  compactMobileChrome = false,
  pageTitle,
  pageSection,
  globalSearch,
  onGlobalSearchChange,
  orders = [],
  onSearchSelect,
  onCommitSearch,
  onMobileMenu,
  notifications,
  onNotificationNavigate,
  onQuickAction,
  userName = 'Kullanıcı',
  userRole = '—',
  userRoleKey,
  userInitials = 'K',
  onLogout,
}) {
  if (compactMobileChrome) {
    return (
      <header className="mos-app-chrome mos-app-chrome--compact-mobile" data-compact-mobile="true">
        <div className="mos-app-chrome-left mos-app-chrome-left--compact-brand" aria-label="Evtrend">
          <span className="mos-app-chrome-brand-wordmark">evtrend</span>
        </div>
        <div className="mos-app-chrome-right">
          <NotificationDropdown items={notifications} onNavigate={onNotificationNavigate} />
          <button
            type="button"
            className="mos-mobile-avatar-btn mos-user-chip"
            aria-label="Profil menüsü"
            onClick={onMobileMenu}
          >
            {userInitials}
          </button>
        </div>
      </header>
    )
  }

  return (
    <header className="mos-app-chrome">
      <div className="mos-app-chrome-left">
        <button
          type="button"
          className="mos-menu-btn mos-menu-btn--chrome"
          onClick={onMobileMenu}
          aria-label="Menüyü aç"
        >
          <IconMenu />
        </button>
        <div className="mos-app-chrome-heading" aria-label="Page title">
          <span className="mos-app-chrome-heading__kicker">{pageSection ?? 'Workspace'}</span>
          <strong className="mos-app-chrome-heading__title">{pageTitle ?? page}</strong>
        </div>
      </div>

      <GlobalSearchInput
        value={globalSearch}
        onChange={onGlobalSearchChange}
        orders={orders}
        onSelectResult={onSearchSelect}
        onCommitSearch={onCommitSearch}
      />

      <div className="mos-app-chrome-right">
        <PilotModeIndicator />
        <ApiConnectionStatus />
        <BuildStatusIndicator />
        <QuickActionMenu page={page} onAction={onQuickAction} userRole={userRoleKey} />
        <DataSourceIndicator />
        <div className="mos-store-pill" title={STORE_NAME}>
          <span className="mos-store-pill-dot" aria-hidden />
          <span className="mos-store-pill-name">{STORE_NAME}</span>
        </div>
        <NotificationDropdown items={notifications} onNavigate={onNotificationNavigate} />
        <UserProfileCard
          userName={userName}
          userRole={userRole}
          userInitials={userInitials}
          onLogout={onLogout}
        />
      </div>
    </header>
  )
}
