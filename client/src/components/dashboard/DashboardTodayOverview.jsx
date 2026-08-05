import { IconChevronRight } from '../Icons.jsx'

/** @typedef {import('../../mappers/dashboard/computeDashboardControlTower.js').DashboardOverviewBullet} DashboardOverviewBullet */

/** @type {Record<string, { icon: string, label: string }>} */
const ROW_META = {
  orders: { icon: '○', label: 'Yeni sipariş' },
  ship: { icon: '↗', label: 'Sevk planı bekleyen' },
  collect: { icon: '₺', label: 'Tahsilat bekleyen' },
  risk: { icon: '!', label: 'Kritik risk' },
  service: { icon: '◎', label: 'Açık servis kaydı' },
}

/** @param {string} text */
function extractOverviewValue(text) {
  if (/yok$/i.test(text.trim()) || text.includes(' yok')) return '0'
  const money = text.match(/₺[\d.,]+/)
  if (money) return money[0]
  const leading = text.match(/^(\d+)/)
  if (leading) return leading[1]
  return '—'
}

/**
 * @param {{
 *   bullets: DashboardOverviewBullet[]
 *   onOpenDetails?: () => void
 * }} props
 */
export default function DashboardTodayOverview({ bullets, onOpenDetails }) {
  return (
    <section className="dct-panel-card dct-panel-card--agenda" aria-labelledby="dct-overview-title">
      <header className="dct-panel-card__head">
        <h2 id="dct-overview-title" className="dct-panel-card__title">
          Bugünkü operasyon özeti
        </h2>
      </header>
      <ul className="dct-panel-rows dct-agenda-rows">
        {bullets.map((b) => {
          const meta = ROW_META[b.id] ?? { icon: '•', label: b.text }
          const value = extractOverviewValue(b.text)
          const isZero = value === '0' || value === '—'
          return (
            <li key={b.id}>
              <button
                type="button"
                className="dct-panel-row dct-agenda-row"
                onClick={onOpenDetails}
                disabled={!onOpenDetails}
              >
                <span className={`dct-agenda-row__icon dct-agenda-row__icon--${b.id}`} aria-hidden>
                  {meta.icon}
                </span>
                <span className="dct-agenda-row__label">{meta.label}</span>
                <span className={`dct-agenda-row__value${isZero ? ' dct-agenda-row__value--muted' : ''}`}>
                  {value}
                </span>
                <span className="dct-panel-row__chevron" aria-hidden>
                  <IconChevronRight />
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {onOpenDetails ? (
        <button type="button" className="dct-panel-card__footer" onClick={onOpenDetails}>
          Tüm detaylar →
        </button>
      ) : null}
    </section>
  )
}
