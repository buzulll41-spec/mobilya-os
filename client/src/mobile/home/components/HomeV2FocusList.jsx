import { IconChevronRight } from '../../../components/Icons.jsx'

/** @param {{
 * rows: Array<{ id: string, title: string, description: string, status: string, tone: 'primary' | 'success' | 'warning' | 'danger', route: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'reports' }>
 * loading: boolean
 * onNavigate: (route: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'reports') => void
 * }} props */
export default function HomeV2FocusList({ rows, loading, onNavigate }) {
  return (
    <section className="evm-home-v2__section" aria-label="Today's Focus">
      <div className="evm-home-v2__section-head">
        <h2>Today&apos;s Focus</h2>
        <p>Bugun tamamlanmasi gereken en onemli isler</p>
      </div>
      <div className="evm-home-v2__focus-list">
        {loading ? (
          Array.from({ length: 4 }, (_, index) => <div key={`focus-sk-${index}`} className="evm-home-v2__focus-skeleton" aria-hidden />)
        ) : rows.length === 0 ? (
          <div className="evm-home-v2__focus-empty" role="status">Eslesen odak isi bulunamadi.</div>
        ) : (
          rows.map((row) => (
            <button key={row.id} type="button" className="evm-home-v2__focus-row" onClick={() => onNavigate(row.route)}>
              <div className="evm-home-v2__focus-copy">
                <strong>{row.title}</strong>
                <p>{row.description}</p>
              </div>
              <div className="evm-home-v2__focus-side">
                <span className={`evm-home-v2__status evm-home-v2__status--${row.tone}`}>{row.status}</span>
                <span className="evm-home-v2__focus-arrow" aria-hidden><IconChevronRight /></span>
              </div>
            </button>
          ))
        )}
      </div>
    </section>
  )
}
