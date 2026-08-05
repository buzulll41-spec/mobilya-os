/** @param {{
 * rows: Array<{ id: string, title: string, detail: string, time: string, route: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'reports', tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral' }>
 * loading: boolean
 * onNavigate: (route: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'reports') => void
 * }} props */
export default function HomeV2RecentActivity({ rows, loading, onNavigate }) {
  return (
    <section className="evm-home-v2__section" aria-label="Recent Activity">
      <div className="evm-home-v2__section-head">
        <h2>Recent Activity</h2>
      </div>
      <div className="evm-home-v2__activity-list">
        {loading ? (
          Array.from({ length: 3 }, (_, index) => <div key={`act-sk-${index}`} className="evm-home-v2__activity-skeleton" aria-hidden />)
        ) : rows.length === 0 ? (
          <div className="evm-home-v2__activity-empty" role="status">Son aktivite bulunamadi.</div>
        ) : (
          rows.map((row) => (
            <button key={row.id} type="button" className="evm-home-v2__activity-row" onClick={() => onNavigate(row.route)}>
              <span className={`evm-home-v2__timeline-dot evm-home-v2__timeline-dot--${row.tone}`} aria-hidden />
              <div className="evm-home-v2__activity-copy">
                <strong>{row.title}</strong>
                <p>{row.detail}</p>
              </div>
              <time>{row.time}</time>
            </button>
          ))
        )}
      </div>
    </section>
  )
}
