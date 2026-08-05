import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { WORKER_DISPLAY_NAMES } from '../../contracts/v1/workerOrchestration.js'
import { domainEventTypeLabelTr } from '../timeline/domainEventTypeLabelTr.js'

/** @typedef {import('../../contracts/v1/workerOrchestration.js').CeoOrchestrationTimelineItem} CeoOrchestrationTimelineItem */

/**
 * @param {string} iso
 */
export function formatCeoTimelineClock(iso) {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })
}

/**
 * @param {import('../../contracts/v1/domainEvent.js').DomainEventDto} event
 */
export function domainEventToCeoTimelineItem(event) {
  const workerId = event.payload?.workerId ?? null
  const workerLabel =
    (typeof event.payload?.worker === 'string' && event.payload.worker) ||
    (workerId ? WORKER_DISPLAY_NAMES[workerId] : null) ||
    domainEventTypeLabelTr(event.type)

  let message =
    typeof event.payload?.description === 'string'
      ? event.payload.description
      : typeof event.payload?.taskTitle === 'string'
        ? event.payload.taskTitle
        : domainEventTypeLabelTr(event.type)

  if (event.type === DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED) {
    message = 'Operasyon tamamlandı.'
  }

  return {
    id: event.id,
    timeLabel: formatCeoTimelineClock(event.occurredAt ?? ''),
    workerLabel,
    workerId: workerId ?? 'event',
    message,
    orderId: event.aggregateId ?? '—',
    occurredAt: event.occurredAt ?? '',
    kind: event.type === DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED ? 'chain' : 'worker',
    tone:
      event.type === DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED
        ? 'success'
        : workerId?.includes('collection')
          ? 'collection'
          : workerId?.includes('shipment')
            ? 'shipment'
            : workerId?.includes('procurement')
              ? 'procurement'
              : 'sales',
  }
}

/**
 * @param {CeoOrchestrationTimelineItem[]} orchestratorTimeline
 * @param {import('../../contracts/v1/domainEvent.js').DomainEventDto[]} [domainEvents]
 * @param {number} [limit]
 */
export function mergeCeoOrchestrationTimeline(orchestratorTimeline, domainEvents = [], limit = 24) {
  const aiCompletedTypes = new Set([
    DOMAIN_EVENT_TYPE.AI_SALES_TASK_COMPLETED,
    DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_COMPLETED,
    DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_COMPLETED,
    DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_COMPLETED,
    DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED,
  ])

  const fromEvents = domainEvents
    .filter((e) => aiCompletedTypes.has(/** @type {string} */ (e.type)))
    .map(domainEventToCeoTimelineItem)

  const merged = [...orchestratorTimeline, ...fromEvents]
    .sort((a, b) => String(b.occurredAt).localeCompare(String(a.occurredAt)))
    .filter((item, idx, arr) => arr.findIndex((x) => x.id === item.id) === idx)

  return merged.slice(0, limit)
}

export {}
