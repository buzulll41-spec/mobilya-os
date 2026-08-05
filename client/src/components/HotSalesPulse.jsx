import { formatTry } from '../data/index.js'

/**
 * @param {{
 *   pulse: import('../mappers/dashboard/computeHotSalesPulse.js').HotSalesPulse
 * }} props
 */
export default function HotSalesPulse({ pulse }) {
  const densityLabel =
    pulse.densityTone === 'peak'
      ? 'Yoğun'
      : pulse.densityTone === 'busy'
        ? 'Hareketli'
        : 'Sakin'

  return (
    <section className="mos-card mos-card--saas mos-ssh" aria-labelledby="mos-ssh-title">
      <header className="mos-ssh-head">
        <span className="mos-ssh-pulse-dot" aria-hidden />
        <div>
          <h2 id="mos-ssh-title" className="mos-panel-title">
            Sıcak Satış Hareketi
          </h2>
          <p className="mos-ssh-sub">Mağaza nabzı — son saat ve bugünün akışı</p>
        </div>
      </header>

      <div className="mos-ssh-grid">
        <article className="mos-ssh-stat mos-ssh-stat--hero">
          <span className="mos-ssh-stat-label">Son 1 saat satış</span>
          <strong className="mos-ssh-stat-value">{pulse.lastHourSalesLabel}</strong>
          <span className="mos-ssh-stat-hint">Tahsilat hareketleri</span>
        </article>
        <article className="mos-ssh-stat">
          <span className="mos-ssh-stat-label">Bugünün en hızlı ürünü</span>
          <strong className="mos-ssh-stat-value mos-ssh-stat-value--sm">{pulse.topProductToday}</strong>
        </article>
        <article className="mos-ssh-stat">
          <span className="mos-ssh-stat-label">En aktif satış personeli</span>
          <strong className="mos-ssh-stat-value mos-ssh-stat-value--sm">{pulse.topSalesPerson}</strong>
        </article>
        <article className="mos-ssh-stat">
          <span className="mos-ssh-stat-label">Öne çıkan kategori</span>
          <strong className="mos-ssh-stat-value mos-ssh-stat-value--sm">{pulse.topCategory}</strong>
        </article>
      </div>

      <footer className="mos-ssh-flow">
        <div className="mos-ssh-flow-meta">
          <span>Bugünkü sipariş akışı</span>
          <strong>
            {pulse.todayOrderCount} sipariş · {formatTry(pulse.todayOrderVolume)}
          </strong>
        </div>
        <div
          className="mos-ssh-density"
          role="meter"
          aria-valuenow={pulse.densityPercent}
          aria-valuemin={0}
          aria-valuemax={100}
        >
          <div className="mos-ssh-density-bar">
            <span
              className={`mos-ssh-density-fill mos-ssh-density-fill--${pulse.densityTone}`}
              style={{ width: `${pulse.densityPercent}%` }}
            />
          </div>
          <span className="mos-ssh-density-label">
            Yoğunluk {pulse.densityPercent}% · {densityLabel}
          </span>
        </div>
      </footer>
    </section>
  )
}
