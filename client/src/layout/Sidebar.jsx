import { APP_NAME, APP_TAGLINE } from '../constants/app.js'
import { MAIN_NAV } from '../constants/navigation.js'
import { shouldShowDemoBanner } from '../config/appMode.js'
import {
  IconChevronLeft,
  IconChevronRight,
  IconClose,
  IconDashboard,
  IconOrders,
  IconService,
  IconTruck,
  IconWallet,
  IconSupply,
  IconProducts,
} from '../components/Icons.jsx'

const icons = {
  dashboard: IconDashboard,
  'operation-map': IconDashboard,
  'executive-center': IconDashboard,
  'executive-command-center': IconDashboard,
  'ceo-copilot': IconDashboard,
  'digital-workforce': IconDashboard,
  'operation-center': IconDashboard,
  'operation-automation-center': IconDashboard,
  'pilot-readiness': IconDashboard,
  'go-live': IconDashboard,
  'system-health': IconDashboard,
  'error-center': IconDashboard,
  'ceo-control-center': IconDashboard,
  'operations-agents': IconDashboard,
  'executive-director': IconDashboard,
  'strategic-intelligence': IconDashboard,
  'company-simulation': IconDashboard,
  'board-directors': IconDashboard,
  'ceo-intelligence': IconDashboard,
  'chairman-intelligence': IconDashboard,
  'future-engine': IconDashboard,
  'investor-intelligence': IconDashboard,
  'holding-center': IconDashboard,
  'group-chairman': IconDashboard,
  'business-brain': IconDashboard,
  'action-orchestrator': IconDashboard,
  'performance-feedback': IconDashboard,
  'learning-engine': IconDashboard,
  'optimization-engine': IconDashboard,
  'goal-engine': IconDashboard,
  'enterprise-command-center': IconDashboard,
  'manager-cockpit': IconDashboard,
  'forecast-engine': IconDashboard,
  'ai-operations-advisor': IconDashboard,
  'action-center': IconDashboard,
  'operation-cases': IconDashboard,
  'automation-center': IconDashboard,
  'business-rules': IconDashboard,
  orders: IconOrders,
  products: IconProducts,
  'supply-incoming': IconSupply,
  'shipment-ops': IconTruck,
  collection: IconWallet,
  'sales-source-analytics': IconWallet,
  'profitability-analytics': IconWallet,
  'data-quality': IconService,
  'ssh-service': IconService,
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
 *   navItems?: { id: string; label: string }[]
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
  navItems = MAIN_NAV,
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
        {navItems.map((item) => {
          const Icon = icons[item.id] ?? IconOrders
          const active = page === item.id
          return (
            <button
              key={item.id}
              type="button"
              className="mos-nav-item"
              data-active={active ? 'true' : 'false'}
              data-indent={item.indent ? 'true' : 'false'}
              title={collapsed ? item.label : undefined}
              onClick={() => onNavigate(item.id)}
            >
              <span className="mos-nav-item-icon">
                {Icon ? <Icon /> : null}
              </span>
              <span className="mos-nav-item-label">{item.label}</span>
            </button>
          )
        })}
      </nav>

      <div className="mos-sidebar-shell-label mos-sidebar-label-fade">Desktop / Tablet Sidebar</div>

      <div className="mos-sidebar-spacer" />

      <button
        type="button"
        className="mos-sidebar-collapse"
        onClick={onToggleCollapsed}
        aria-label={collapsed ? 'Menüyü genişlet' : 'Menüyü daralt'}
        title={collapsed ? 'Genişlet' : 'Daralt'}
      >
        {collapsed ? <IconChevronRight /> : <IconChevronLeft />}
        <span className="mos-sidebar-collapse-label">
          {collapsed ? 'Genişlet' : 'Menüyü daralt'}
        </span>
      </button>

      <div className="mos-sidebar-foot mos-sidebar-label-fade">
        <span className="mos-sidebar-foot-line">{todayLabel}</span>
        {shouldShowDemoBanner() ? (
          <span className="mos-sidebar-foot-muted">Canlı (demo)</span>
        ) : null}
      </div>
    </aside>
  )
}
