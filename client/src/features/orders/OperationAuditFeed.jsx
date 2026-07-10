import { mapDomainEventsToAuditFeed } from '../../mappers/audit/mapDomainEventsToAuditFeed.js'

/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

/** @type {{ id: string, label: string, categories: string[] | null }}[] */
export const AUDIT_FEED_FILTERS = [
  { id: 'all', label: 'Tümü', categories: null },
  { id: 'payment', label: 'Tahsilat', categories: ['payment'] },
  { id: 'shipment', label: 'Sevk', categories: ['shipment'] },
  { id: 'ssh', label: 'SSH', categories: ['ssh'] },
  { id: 'task', label: 'Görev', categories: ['task'] },
  { id: 'system', label: 'Sistem', categories: ['system', 'document', 'order', 'risk'] },
]

/**
 * @param {{
 *   orderId: string
 *   events: DomainEventDto[]
 *   limit?: number
 *   compact?: boolean
 *   categoryFilter?: string
 * }} props
 */
export default function OperationAuditFeed({
  orderId,
  events,
  limit = 12,
  compact = false,
  categoryFilter = 'all',
}) {
  const filterDef = AUDIT_FEED_FILTERS.find((f) => f.id === categoryFilter) ?? AUDIT_FEED_FILTERS[0]
  let items = mapDomainEventsToAuditFeed(events, orderId)
  if (filterDef.categories) {
    items = items.filter((item) => filterDef.categories.includes(item.category))
  }
  items = items.slice(0, limit)

  if (items.length === 0) {
    return <p className="oop-muted">Bu filtrede kayıtlı operasyon olayı yok.</p>
  }

  return (
    <ul className={`oop-audit-feed${compact ? ' oop-audit-feed--compact' : ''}`}>
      {items.map((item) => (
        <li
          key={item.id}
          className={`oop-audit-feed__item oop-audit-feed__item--${item.category}`}
        >
          <div className="oop-audit-feed__head">
            <span className={`oop-audit-feed__cat oop-audit-feed__cat--${item.category}`}>
              {item.categoryLabel}
            </span>
            <div className="oop-audit-feed__meta">
              <time dateTime={item.at}>{item.timeLabel}</time>
              {item.actor ? <span className="oop-audit-feed__actor">{item.actor}</span> : null}
            </div>
          </div>
          <p className="oop-audit-feed__title">{item.title}</p>
          {item.description ? <p className="oop-audit-feed__desc">{item.description}</p> : null}
        </li>
      ))}
    </ul>
  )
}
