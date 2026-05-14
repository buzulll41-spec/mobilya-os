import AppChrome from '../components/AppChrome.jsx'
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
 *   notifications: { id: string; title: string; body: string; time: string }[]
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
  notifications,
  children,
}) {
  return (
    <div className="mos" data-sidebar-collapsed={sidebarCollapsed ? 'true' : 'false'}>
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
        collapsed={sidebarCollapsed}
        onToggleCollapsed={onToggleSidebarCollapsed}
      />

      <div className="mos-main">
        <AppChrome
          globalSearch={globalSearch}
          onGlobalSearchChange={onGlobalSearchChange}
          onMobileMenu={() => setSidebarOpen(true)}
          notifications={notifications}
        />

        <div className="mos-content">{children}</div>
      </div>
    </div>
  )
}
