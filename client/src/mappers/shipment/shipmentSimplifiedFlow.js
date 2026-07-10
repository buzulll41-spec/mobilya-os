import {
  SHIPMENT_OPERATION_STATUS,
  nextShipmentOperationStatus,
} from '../../contracts/v1/shipmentStatuses.js'
import { shipmentStatusLabel, shipmentStatusOrPlanned } from './shipmentStatusLabel.js'
import { formatShipmentDateTime } from './shipmentStepperModel.js'

/** @typedef {import('../../contracts/v1/shipmentStatuses.js').ShipmentOperationStatus} ShipmentOperationStatus */
/** @typedef {import('./shipmentStepperModel.js').ShipmentStepperStep} ShipmentStepperStep */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

const PRE_DELIVERY = new Set([
  SHIPMENT_OPERATION_STATUS.PLANNED,
  SHIPMENT_OPERATION_STATUS.LOADED,
  SHIPMENT_OPERATION_STATUS.DISPATCHED,
])

/**
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function orderNeedsInstallation(dto) {
  if (dto?.operationalState?.installationState === 'NOT_REQUIRED') return false
  if (dto?.installationPending === true) return true
  if (dto?.operationalState?.installationState === 'PENDING') return true
  return true
}

/** @param {string | undefined | null} status */
export function isPreDeliveryShipmentStatus(status) {
  const s = shipmentStatusOrPlanned(status)
  return (
    s === SHIPMENT_OPERATION_STATUS.PLANNED ||
    s === SHIPMENT_OPERATION_STATUS.LOADED ||
    s === SHIPMENT_OPERATION_STATUS.DISPATCHED
  )
}

/**
 * Mağaza UI — tek ekran durum etiketi.
 * @param {string | undefined | null} status
 */
export function simplifiedShipmentStatusLabel(status) {
  const s = shipmentStatusOrPlanned(status)
  if (isPreDeliveryShipmentStatus(s)) return 'Sevk planlandı'
  return shipmentStatusLabel(s)
}

/**
 * @param {string | undefined | null} from
 * @param {ShipmentOperationStatus} target
 * @returns {ShipmentOperationStatus[]}
 */
export function buildShipmentAdvanceChain(from, target) {
  let cur = shipmentStatusOrPlanned(from)
  /** @type {ShipmentOperationStatus[]} */
  const chain = []
  let guard = 0
  while (cur !== target && guard < 8) {
    const next = nextShipmentOperationStatus(cur)
    if (!next) break
    chain.push(next)
    cur = next
    guard += 1
  }
  return chain
}

/**
 * @param {string | undefined | null} status
 * @param {boolean} needsInstallation
 */
export function simplifiedNextStepLabel(status, needsInstallation) {
  const s = shipmentStatusOrPlanned(status)
  if (s === SHIPMENT_OPERATION_STATUS.PLANNED || s === SHIPMENT_OPERATION_STATUS.LOADED) {
    return 'Yola çıktı'
  }
  if (s === SHIPMENT_OPERATION_STATUS.DISPATCHED) return 'Teslim edildi'
  if (s === SHIPMENT_OPERATION_STATUS.DELIVERED && needsInstallation) {
    return 'Montaj tamamlandı'
  }
  return null
}

/**
 * @param {string | undefined | null} activeStatus
 * @param {Record<string, string>} timestamps
 * @param {{ needsInstallation?: boolean }} [options]
 * @returns {ShipmentStepperStep[]}
 */
/**
 * @param {string | undefined | null} status
 * @param {boolean} needsInstallation
 */
function simplifiedPhaseIndex(status, needsInstallation) {
  const s = shipmentStatusOrPlanned(status)
  if (s === SHIPMENT_OPERATION_STATUS.ISSUE) return -1
  if (isPreDeliveryShipmentStatus(s)) return 0
  if (s === SHIPMENT_OPERATION_STATUS.DELIVERED) return 1
  if (s === SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE) {
    return needsInstallation ? 2 : 1
  }
  return 0
}

export function buildSimplifiedShipmentStepperSteps(
  activeStatus,
  timestamps = {},
  options = {},
) {
  const needsInstallation = options.needsInstallation ?? true
  const current = shipmentStatusOrPlanned(activeStatus)
  const isIssue = current === SHIPMENT_OPERATION_STATUS.ISSUE
  const phase = simplifiedPhaseIndex(current, needsInstallation)

  /** @type {{ key: string, label: string, icon: string, timeKeys: string[] }[]} */
  const defs = [
    {
      key: 'planned',
      label: 'Sevk planlandı',
      icon: '📋',
      timeKeys: [
        SHIPMENT_OPERATION_STATUS.PLANNED,
        SHIPMENT_OPERATION_STATUS.LOADED,
        SHIPMENT_OPERATION_STATUS.DISPATCHED,
      ],
    },
    {
      key: 'delivered',
      label: 'Teslim edildi',
      icon: '✓',
      timeKeys: [SHIPMENT_OPERATION_STATUS.DELIVERED],
    },
  ]
  if (needsInstallation) {
    defs.push({
      key: 'installation',
      label: 'Montaj tamamlandı',
      icon: '🔧',
      timeKeys: [SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE],
    })
  }

  const steps = defs.map((def, i) => {
    /** @type {import('./shipmentStepperModel.js').StepVisualState} */
    let state = 'pending'
    if (!isIssue) {
      if (i < phase) state = 'done'
      else if (i === phase) state = 'active'
    } else if (def.timeKeys.some((k) => timestamps[k])) {
      state = 'done'
    }

    const occurredKey = [...def.timeKeys].reverse().find((k) => timestamps[k])
    /** @type {string | undefined} */
    let subHint
    if (
      def.key === 'planned' &&
      state === 'active' &&
      (current === SHIPMENT_OPERATION_STATUS.LOADED ||
        current === SHIPMENT_OPERATION_STATUS.DISPATCHED)
    ) {
      subHint = 'Yolda / hazırlık süreci'
    }

    return {
      key: def.key,
      stepNumber: i + 1,
      label: def.label,
      icon: def.icon,
      state,
      occurredAtLabel: formatShipmentDateTime(occurredKey ? timestamps[occurredKey] : undefined),
      subHint,
    }
  })

  if (isIssue) {
    steps.push({
      key: SHIPMENT_OPERATION_STATUS.ISSUE,
      stepNumber: steps.length + 1,
      label: shipmentStatusLabel(SHIPMENT_OPERATION_STATUS.ISSUE),
      icon: '⚠️',
      state: 'issue',
      occurredAtLabel: formatShipmentDateTime(timestamps[SHIPMENT_OPERATION_STATUS.ISSUE]),
    })
  }

  return steps
}

/**
 * Zaman çizelgesi — ara adımlar pasif özet.
 * @param {string} from
 * @param {string} to
 */
export function shipmentTimelineTransitionDetail(from, to) {
  const f = shipmentStatusOrPlanned(from)
  const t = shipmentStatusOrPlanned(to)
  if (PRE_DELIVERY.has(f) && PRE_DELIVERY.has(t)) {
    return 'Yolda / hazırlık süreci'
  }
  if (PRE_DELIVERY.has(f) && t === SHIPMENT_OPERATION_STATUS.DELIVERED) {
    return `${shipmentStatusLabel(f)} → Teslim edildi`
  }
  return `${shipmentStatusLabel(f)} → ${shipmentStatusLabel(t)}`
}
