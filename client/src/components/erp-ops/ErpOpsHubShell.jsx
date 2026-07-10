/**
 * @param {{
 *   title: string
 *   subtitle?: string
 *   className?: string
 *   tabs: { id: string, label: string }[]
 *   activeTab: string
 *   onTabChange: (id: string) => void
 *   children: import('react').ReactNode
 * }} props
 */
export default function ErpOpsHubShell({
  title,
  subtitle,
  className = '',
  tabs,
  activeTab,
  onTabChange,
  children,
}) {
  return (
    <div className={`mos-page mos-erp-ops mos-hub ${className}`.trim()}>
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">{title}</h1>
          {subtitle ? <span className="mos-erp-ops__sub">{subtitle}</span> : null}
        </div>
      </header>

      <nav className="mos-erp-tabs mos-hub__tabs" aria-label={`${title} sekmeleri`}>
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`mos-erp-tab${activeTab === t.id ? ' is-active' : ''}`}
            onClick={() => onTabChange(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>

      <div className="mos-hub__body">{children}</div>
    </div>
  )
}
