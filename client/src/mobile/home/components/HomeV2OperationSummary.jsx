/** @param {{
 * title: string
 * items: Array<{ id: string, label: string, value: string, detail: string, tone: 'primary' | 'success' | 'warning' | 'danger' | 'neutral', route: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'reports' }>
 * loading: boolean
 * hasError: boolean
 * onRetry: () => void
 * onNavigate: (route: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'reports') => void
 * }} props */
export default function HomeV2OperationSummary({ title, items, loading, hasError, onRetry, onNavigate }) {
  const fallbackItems = [
    { id: 'collection-fallback', label: 'Tahsilat', value: '—', detail: 'Veri bekleniyor', tone: 'danger' },
    { id: 'orders-fallback', label: 'Siparis', value: '—', detail: 'Veri bekleniyor', tone: 'primary' },
    { id: 'shipment-fallback', label: 'Sevkiyat', value: '—', detail: 'Veri bekleniyor', tone: 'warning' },
    { id: 'service-fallback', label: 'Servis', value: '—', detail: 'Veri bekleniyor', tone: 'primary' },
    { id: 'customers-fallback', label: 'Musteri', value: '—', detail: 'Veri bekleniyor', tone: 'success' },
    { id: 'kpi-fallback', label: 'Bugunku KPI', value: '—', detail: 'Veri bekleniyor', tone: 'neutral' },
  ]

  return (
    <section className="evm-home-v2__section" aria-label="Operation Summary">
      <div className="evm-home-v2__section-head">
        <h2>{title}</h2>
      </div>
      <article className="evm-home-v2__summary-card">
        {loading ? (
          <div className="evm-home-v2__summary-skeleton" aria-hidden>
            {Array.from({ length: 6 }, (_, index) => <span key={`sum-sk-${index}`} className="evm-home-v2__skeleton-block" />)}
          </div>
        ) : hasError ? (
          <div className="evm-home-v2__summary-empty" role="status">
            <p>Ozet verileri gecici olarak alinamadi.</p>
            <div className="evm-home-v2__summary-empty-grid" aria-hidden>
              {fallbackItems.map((item) => (
                <div key={item.id} className={`evm-home-v2__summary-item evm-home-v2__summary-item--${item.tone} evm-home-v2__summary-item--fallback`}>
                  <span className="evm-home-v2__summary-label">{item.label}</span>
                  <strong className="evm-home-v2__summary-value">{item.value}</strong>
                  <small className="evm-home-v2__summary-detail">{item.detail}</small>
                </div>
              ))}
            </div>
            <button type="button" onClick={onRetry}>Tekrar dene</button>
          </div>
        ) : (
          <div className="evm-home-v2__summary-grid">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={`evm-home-v2__summary-item evm-home-v2__summary-item--${item.tone}`}
                onClick={() => onNavigate(item.route)}
              >
                <span className="evm-home-v2__summary-label">{item.label}</span>
                <strong className="evm-home-v2__summary-value">{item.value}</strong>
                <small className="evm-home-v2__summary-detail">{item.detail}</small>
              </button>
            ))}
          </div>
        )}
      </article>
    </section>
  )
}
