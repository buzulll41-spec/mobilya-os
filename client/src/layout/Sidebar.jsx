import { APP_NAME, APP_TAGLINE } from '../constants/app.js'
import { MAIN_NAV } from '../constants/navigation.js'
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconDashboard,
  IconOrders,
  IconTruck,
  IconWallet,
} from '../components/Icons.jsx'

const icons = {
  dashboard: IconDashboard,
  orders: IconOrders,
  shipment: IconTruck,
  collection: IconWallet,
}

/**
 * @param {{
 *   page: string
 *   onNavigate: (id: string) => void
 *   mobileOpen: boolean
 *   onMobileClose: () => void
 *   todayLabel: string
 *   collapsed: boolean
 *   onToggleCollapsed: () => void
 * }} props
 */
export default function Sidebar({
  page,
  onNavigate,
  mobileOpen,
  onMobileClose,
  todayLabel,
  collapsed,
  onToggleCollapsed,
}) {
  return (
    <aside
      className="mos-sidebar"
      data-open={mobileOpen ? 'true' : 'false'}
      data-collapsed={collapsed ? 'true' : 'false'}
      aria-label="Ana navigasyon"
    >
      <div className="mos-sidebar-top">
        <div className="mos-brand">
          <div className="mos-brand-logo" aria-hidden>
            <span className="mos-brand-logo-inner" />
          </div>
          <div className="mos-brand-text">
            <div className="mos-brand-name">{APP_NAME}</div>
            <div className="mos-brand-tag">{APP_TAGLINE}</div>
          </div>
        </div>
        <button
          type="button"
          className="mos-sidebar-close"
          onClick={onMobileClose}
          aria-label="Menüyü kapat"
        >
          <IconClose />
        </button>
      </div>

      <div className="mos-sidebar-section-label mos-sidebar-label-fade">Menü</div>
      <nav className="mos-nav" aria-label="Sayfalar">
        {MAIN_NAV.map((item) => {
          const Icon = icons[item.id]
          const active = page === item.id
          return (
            <button
              key={item.id}
              type="button"
              className="mos-nav-item"
              data-active={active ? 'true' : 'false'}
              title={collapsed ? item.label : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <span className="mos-nav-item-icon">
                <Icon />
              </span>
              <span className="mos-nav-item-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mos-sidebar-spacer" />

      <button
        type="button"
        className="mos-sidebar-collapse"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
        title={collapsed ? 'Genişlet' : 'Daralt'}
      >
        {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
      </button>

      <div className="mos-sidebar-foot mos-sidebar-label-fade">
        <span className="mos-sidebar-foot-line">{todayLabel}</span>
        <span className="mos-sidebar-foot-muted">Canlı (demo)</span>
      </div>
    </aside>
  )
}
