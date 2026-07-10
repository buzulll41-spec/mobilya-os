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
