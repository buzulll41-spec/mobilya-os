import GlobalSearchInput from './GlobalSearchInput.jsx'
import NotificationDropdown from './NotificationDropdown.jsx'
import { IconMenu } from './Icons.jsx'
import { STORE_NAME, USER_DISPLAY_NAME, USER_INITIALS } from '../constants/app.js'

/**
 * @param {{
 *   globalSearch: string
 *   onGlobalSearchChange: (v: string) => void
 *   onMobileMenu: () => void
 *   notifications: { id: string; title: string; body: string; time: string }[]
 * }} props
 */
export default function AppChrome({
  globalSearch,
  onGlobalSearchChange,
  onMobileMenu,
  notifications,
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

      <GlobalSearchInput value={globalSearch} onChange={onGlobalSearchChange} />

      <div className="mos-app-chrome-right">
        <div className="mos-store-pill" title={STORE_NAME}>
          <span className="mos-store-pill-dot" aria-hidden />
          <span className="mos-store-pill-name">{STORE_NAME}</span>
        </div>
        <NotificationDropdown items={notifications} />
        <button type="button" className="mos-user-chip" aria-label="Hesap menüsü">
          <span className="mos-user-avatar">{USER_INITIALS}</span>
          <span className="mos-user-meta">
            <span className="mos-user-name">{USER_DISPLAY_NAME}</span>
            <span className="mos-user-role">Mağaza müdürü</span>
          </span>
        </button>
      </div>
    </header>
  )
}
