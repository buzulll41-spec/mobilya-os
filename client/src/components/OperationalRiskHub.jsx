import { useMemo, useState } from 'react'
import { IconChevronRight } from './Icons.jsx'
import { formatShortDate } from '../utils/dates.js'
/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../utils/operationalAlarms.js').OperationalAlarm} OperationalAlarm */

const CATEGORY_ICON = {
  termin: '⏱',
  missing: '📦',
  ssh: '📦',
  shipment: '🚚',
  install: '🔧',
  finance: '₺',
}

/** @type {{ id: string, label: string }[]} */
const FILTERS = [
  { id: 'all', label: 'Tümü' },
  { id: 'critical', label: 'Kritik' },
  { id: 'warning', label: 'Dikkat' },
  { id: 'info', label: 'Bilgi' },
]

const VISIBLE_LIMIT = 5

/** @type {Record<string, string>} */
const LEVEL_LABEL = {
  critical: 'Kritik',
  warning: 'Dikkat',
  info: 'Bilgi',
}

/** @param {Order | undefined} order */
function feedTimeLabel(order) {
  if (!order) return 'Bugün'
  if (order.dueDate) return formatShortDate(order.dueDate)
  if (order.orderDate) return formatShortDate(order.orderDate)
  return 'Bugün'
}

/** @param {string} detail */
function shortDetail(detail) {
  const primary = detail.split('—')[0]?.trim() || detail
  if (primary.length <= 52) return primary
  return `${primary.slice(0, 52)}…`
}

/**
 * @param {{
 *   alarms: OperationalAlarm[]
 *   onOrderClick?: (order: Order) => void
 *   ordersById?: Map<string, Order>
 *   compact?: boolean
 *   onViewAllRisks?: () => void
 * }} props
 */
export default function OperationalRiskHub({
  alarms,
  onOrderClick,
  ordersById,
  compact = false,
  onViewAllRisks,
}) {
  const [filter, setFilter] = useState('all')

  const filtered = useMemo(() => {
    if (filter === 'all') return alarms
    return alarms.filter((a) => a.level === filter)
  }, [alarms, filter])

  const visible = filtered.slice(0, VISIBLE_LIMIT)
  const showViewAll = Boolean(onViewAllRisks && filtered.length > VISIBLE_LIMIT)

  return (
    <section
      className={`dct-risk-hub dct-risk-hub--live${compact ? ' dct-risk-hub--dashboard' : ''}`}
      aria-labelledby="dct-risk-hub-title"
    >
      <header className="dct-risk-hub__head">
        <div className="dct-risk-hub__head-copy">
          <h2 id="dct-risk-hub-title" className="dct-risk-hub__title">
            Risk merkezi
          </h2>
          <p className="dct-risk-hub__sub">
            <span className="dct-risk-hub__live-dot" aria-hidden />
            Canlı operasyon uyarıları
          </p>
        </div>
        {showViewAll ? (
          <button type="button" className="dct-risk-hub__view-all" onClick={onViewAllRisks}>
            Tüm riskleri görüntüle →
          </button>
        ) : null}
      </header>

      <div className="dct-segmented" role="tablist" aria-label="Alarm filtresi">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="tab"
            aria-selected={filter === f.id}
            className={`dct-segmented__btn${filter === f.id ? ' dct-segmented__btn--active' : ''}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="dct-risk-hub__empty" role="status">
          Bu filtrede alarm yok. Operasyon akışı kontrol altında.
        </p>
      ) : (
        <ul className="dct-risk-feed dct-live-feed">
          {visible.map((alarm) => {
            const order = ordersById?.get(alarm.orderId)
            const timeLabel = feedTimeLabel(order)
            return (
              <li key={alarm.id}>
                <button
                  type="button"
                  className={`dct-risk-feed__item dct-live-feed__item dct-live-feed__item--${alarm.level}`}
                  onClick={() => order && onOrderClick?.(order)}
                  disabled={!order}
                >
                  <span className="dct-risk-feed__accent" aria-hidden />
                  <span className="dct-live-feed__icon" aria-hidden>
                    {CATEGORY_ICON[alarm.category] ?? '•'}
                  </span>
                  <span className="dct-live-feed__body">
                    <span className="dct-live-feed__title-row">
                      <span className="dct-live-feed__title">{alarm.title}</span>
                      <span className={`dct-live-feed__badge dct-live-feed__badge--${alarm.level}`}>
                        {LEVEL_LABEL[alarm.level] ?? alarm.level}
                      </span>
                    </span>
                    <span className="dct-live-feed__detail">{shortDetail(alarm.detail)}</span>
                    <span className="dct-live-feed__meta">
                      <span>{alarm.orderId}</span>
                      <span className="dct-live-feed__sep">•</span>
                      <span>{alarm.customer}</span>
                      <span className="dct-live-feed__sep">•</span>
                      <span>{timeLabel}</span>
                    </span>
                  </span>
                  <span className="dct-live-feed__actions">
                    <span className="dct-live-feed__action-btn">İncele</span>
                    <span className="dct-live-feed__chevron" aria-hidden>
                      <IconChevronRight />
                    </span>
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      )}

      {showViewAll ? (
        <footer className="dct-risk-hub__foot">
          <button type="button" className="dct-risk-hub__foot-link" onClick={onViewAllRisks}>
            Tüm riskleri görüntüle
            <span className="dct-risk-hub__foot-count">({filtered.length})</span>
            →
          </button>
        </footer>
      ) : null}
    </section>
  )
}
