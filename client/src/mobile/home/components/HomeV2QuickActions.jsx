/** @param {{
 * actions: Array<{ id: string, label: string, route: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'reports', icon: import('react').ReactNode, tone: 'primary' | 'success' | 'warning' | 'danger' }>
 * onNavigate: (route: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'reports') => void
 * }} props */
export default function HomeV2QuickActions({ actions, onNavigate }) {
  return (
    <section className="evm-home-v2__section" aria-label="Quick Actions">
      <div className="evm-home-v2__section-head">
        <h2>Quick Actions</h2>
      </div>
      <div className="evm-home-v2__quick-grid">
        {actions.map((action) => (
          <button key={action.id} type="button" className={`evm-home-v2__quick-tile evm-home-v2__quick-tile--${action.tone}`} onClick={() => onNavigate(action.route)}>
            <span className="evm-home-v2__quick-icon" aria-hidden>{action.icon}</span>
            <span className="evm-home-v2__quick-label">{action.label}</span>
          </button>
        ))}
      </div>
    </section>
  )
}
