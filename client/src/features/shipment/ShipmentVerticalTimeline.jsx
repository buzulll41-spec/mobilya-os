import { domainEventTypeLabelTr } from '../../mappers/timeline/domainEventTypeLabelTr.js'
import { shipmentTimelineTransitionDetail } from '../../mappers/shipment/shipmentSimplifiedFlow.js'
import { formatShipmentDateTime } from '../../mappers/shipment/shipmentStepperModel.js'
import { normalizeShipmentStatusValue } from '../../contracts/v1/shipmentStatuses.js'

/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

/**
 * @param {DomainEventDto} e
 */
function eventLine(e) {
  const from = e.payload.fromStatus != null ? normalizeShipmentStatusValue(String(e.payload.fromStatus)) : ''
  const to = e.payload.toStatus != null ? normalizeShipmentStatusValue(String(e.payload.toStatus)) : ''
  if (from && to) {
    return shipmentTimelineTransitionDetail(from, to)
  }
  const issue = e.payload.issueNote != null ? String(e.payload.issueNote) : ''
  return issue || ''
}

/**
 * @param {{ events: DomainEventDto[] }} props
 */
export default function ShipmentVerticalTimeline({ events }) {
  if (!events.length) {
    return <p className="som-muted">Henüz sevk hareketi kaydı yok.</p>
  }

  return (
    <ol className="som-vtimeline" aria-label="Sevk zaman çizelgesi">
      {events.map((e) => {
        const when = formatShipmentDateTime(e.occurredAt)
        const detail = eventLine(e)
        const label = domainEventTypeLabelTr(e.type)
        return (
          <li key={e.id} className="som-vtimeline__item">
            <span className="som-vtimeline__dot" aria-hidden />
            <div className="som-vtimeline__body">
              <p className="som-vtimeline__when">{when ?? '—'}</p>
              <p className="som-vtimeline__label">
                <span className="som-vtimeline__check" aria-hidden>
                  ✓
                </span>{' '}
                {label}
              </p>
              {detail ? <p className="som-vtimeline__detail">{detail}</p> : null}
            </div>
          </li>
        )
      })}
    </ol>
  )
}
