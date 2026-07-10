import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import {
  SHIPMENT_OPERATION_STATUS,
  SHIPMENT_STATUS_FLOW,
  normalizeShipmentStatusValue,
} from '../../contracts/v1/shipmentStatuses.js'
import { shipmentStatusLabel, shipmentStatusOrPlanned } from './shipmentStatusLabel.js'

/** @typedef {'done' | 'active' | 'pending' | 'issue'} StepVisualState */

/**
 * @typedef {Object} ShipmentStepperStep
 * @property {string} key
 * @property {number} stepNumber
 * @property {string} label
 * @property {string} icon
 * @property {StepVisualState} state
 * @property {string | null} occurredAtLabel
 * @property {string} [subHint] Ara adım özeti (LOADED/DISPATCHED)
 */

const STEP_DEFS = [
  { key: SHIPMENT_OPERATION_STATUS.PLANNED, icon: '📋' },
  { key: SHIPMENT_OPERATION_STATUS.LOADED, icon: '📦' },
  { key: SHIPMENT_OPERATION_STATUS.DISPATCHED, icon: '🚚' },
  { key: SHIPMENT_OPERATION_STATUS.DELIVERED, icon: '✓' },
  { key: SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE, icon: '🔧' },
]

const EVENT_TO_STATUS = {
  [DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED]: SHIPMENT_OPERATION_STATUS.PLANNED,
  [DOMAIN_EVENT_TYPE.SHIPMENT_LOADED]: SHIPMENT_OPERATION_STATUS.LOADED,
  [DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED]: SHIPMENT_OPERATION_STATUS.DISPATCHED,
  [DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED]: SHIPMENT_OPERATION_STATUS.DELIVERED,
  [DOMAIN_EVENT_TYPE.INSTALLATION_COMPLETED]: SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE,
  [DOMAIN_EVENT_TYPE.INSTALLATION_ISSUE]: SHIPMENT_OPERATION_STATUS.ISSUE,
}

const SHIPMENT_EVENT_TYPES = new Set(Object.keys(EVENT_TO_STATUS))

/**
 * @param {string} iso
 */
export function formatShipmentDateTime(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleString('tr-TR', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * @param {import('../../contracts/v1/domainEvent.js').DomainEventDto[]} events
 * @param {string} orderId
 * @param {string | undefined} shipmentId
 */
export function buildStatusTimestampMap(events, orderId, shipmentId) {
  /** @type {Record<string, string>} */
  const map = {}
  const relevant = events
    .filter((e) => e.aggregateId === orderId && SHIPMENT_EVENT_TYPES.has(e.type))
    .sort((a, b) => a.occurredAt.localeCompare(b.occurredAt))

  for (const e of relevant) {
    if (shipmentId && e.payload.shipmentId && String(e.payload.shipmentId) !== shipmentId) {
      continue
    }
    const to = e.payload.toStatus != null ? normalizeShipmentStatusValue(String(e.payload.toStatus)) : ''
    const fromEvent = EVENT_TO_STATUS[e.type]
    const statusKey = to || fromEvent
    if (statusKey) {
      map[statusKey] = e.occurredAt
    }
  }
  return map
}

/**
 * @param {string | undefined | null} activeStatus
 * @param {Record<string, string>} timestamps
 * @returns {ShipmentStepperStep[]}
 */
export function buildShipmentStepperSteps(activeStatus, timestamps = {}) {
  const current = shipmentStatusOrPlanned(activeStatus)
  const isIssue = current === SHIPMENT_OPERATION_STATUS.ISSUE
  const flowIndex = isIssue
    ? -1
    : SHIPMENT_STATUS_FLOW.indexOf(/** @type {typeof SHIPMENT_STATUS_FLOW[number]} */ (current))

  /** @type {ShipmentStepperStep[]} */
  const steps = STEP_DEFS.map((def, i) => {
    const idx = SHIPMENT_STATUS_FLOW.indexOf(def.key)
    let state = /** @type {StepVisualState} */ ('pending')

    if (isIssue) {
      state = timestamps[def.key] ? 'done' : 'pending'
    } else if (idx < flowIndex) {
      state = 'done'
    } else if (idx === flowIndex) {
      state = 'active'
    }

    return {
      key: def.key,
      stepNumber: i + 1,
      label: shipmentStatusLabel(def.key),
      icon: def.icon,
      state,
      occurredAtLabel: formatShipmentDateTime(timestamps[def.key]),
    }
  })

  if (isIssue) {
    steps.push({
      key: SHIPMENT_OPERATION_STATUS.ISSUE,
      stepNumber: 6,
      label: shipmentStatusLabel(SHIPMENT_OPERATION_STATUS.ISSUE),
      icon: '⚠️',
      state: 'issue',
      occurredAtLabel: formatShipmentDateTime(timestamps[SHIPMENT_OPERATION_STATUS.ISSUE]),
    })
  }

  return steps
}

/**
 * @param {import('../../contracts/v1/domainEvent.js').DomainEventDto[]} events
 * @param {string} orderId
 * @param {string | undefined} shipmentId
 */
export function buildShipmentVerticalTimeline(events, orderId, shipmentId) {
  return events
    .filter((e) => e.aggregateId === orderId && SHIPMENT_EVENT_TYPES.has(e.type))
    .filter((e) => {
      if (!shipmentId) return true
      if (!e.payload.shipmentId) return true
      return String(e.payload.shipmentId) === shipmentId
    })
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}
