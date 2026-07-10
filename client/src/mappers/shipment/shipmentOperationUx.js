import {
  SHIPMENT_OPERATION_STATUS,
} from '../../contracts/v1/shipmentStatuses.js'
import { shipmentStatusLabel, shipmentStatusOrPlanned } from './shipmentStatusLabel.js'
import {
  buildShipmentAdvanceChain,
  isPreDeliveryShipmentStatus,
  orderNeedsInstallation,
  simplifiedNextStepLabel,
  simplifiedShipmentStatusLabel,
} from './shipmentSimplifiedFlow.js'

/** @typedef {import('../../contracts/v1/shipmentStatuses.js').ShipmentOperationStatus} ShipmentOperationStatus */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @typedef {Object} ShipmentFlowAction
 * @property {ShipmentOperationStatus} status
 * @property {string} label
 * @property {string} [ctaLabel]
 * @property {ShipmentOperationStatus[]} [advanceChain]
 * @property {boolean} [requiresDeliveryConfirm] Teslim Et — onay modalı zorunlu
 */

/**
 * İlerleme butonu metni (hedef duruma geçiş).
 * @param {ShipmentOperationStatus} targetStatus
 */
export function shipmentPrimaryActionCta(targetStatus) {
  switch (targetStatus) {
    case SHIPMENT_OPERATION_STATUS.DISPATCHED:
      return 'Yola çıktı olarak işaretle'
    case SHIPMENT_OPERATION_STATUS.DELIVERED:
      return 'Teslim onayı ile kaydet'
    case SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE:
      return 'Montaj tamamlandı olarak işaretle'
    case SHIPMENT_OPERATION_STATUS.ISSUE:
      return 'Sorun bildir'
    default:
      return shipmentAdvanceButtonLabel(targetStatus)
  }
}

export function shipmentAdvanceButtonLabel(targetStatus) {
  switch (targetStatus) {
    case SHIPMENT_OPERATION_STATUS.DELIVERED:
      return 'Teslim Et'
    case SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE:
      return 'Montaj tamamlandı'
    case SHIPMENT_OPERATION_STATUS.ISSUE:
      return 'Sorun bildir'
    case SHIPMENT_OPERATION_STATUS.LOADED:
      return 'Araç yüklendi'
    case SHIPMENT_OPERATION_STATUS.DISPATCHED:
      return 'Yola Çıktı'
    default:
      return shipmentStatusLabel(targetStatus)
  }
}

/**
 * @param {string | undefined | null} status
 * @param {{ listItemDto?: SalesOrderListItemDto }} [options]
 */
export function getShipmentFlowPresentation(status, options = {}) {
  const current = shipmentStatusOrPlanned(status)
  const needsInstallation = orderNeedsInstallation(options.listItemDto)

  const isTerminal =
    current === SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE ||
    current === SHIPMENT_OPERATION_STATUS.ISSUE ||
    (current === SHIPMENT_OPERATION_STATUS.DELIVERED && !needsInstallation)

  /** @type {ShipmentFlowAction | null} */
  let primaryAction = null
  /** @type {ShipmentFlowAction[]} */
  const deliveredChoices = []

  if (isPreDeliveryShipmentStatus(current)) {
    const target =
      current === SHIPMENT_OPERATION_STATUS.DISPATCHED
        ? SHIPMENT_OPERATION_STATUS.DELIVERED
        : SHIPMENT_OPERATION_STATUS.DISPATCHED
    primaryAction = {
      status: target,
      label: shipmentAdvanceButtonLabel(target),
      ctaLabel: shipmentPrimaryActionCta(target),
      advanceChain: buildShipmentAdvanceChain(current, target),
      requiresDeliveryConfirm: target === SHIPMENT_OPERATION_STATUS.DELIVERED,
    }
  } else if (current === SHIPMENT_OPERATION_STATUS.DELIVERED && needsInstallation) {
    deliveredChoices.push({
      status: SHIPMENT_OPERATION_STATUS.ISSUE,
      label: shipmentAdvanceButtonLabel(SHIPMENT_OPERATION_STATUS.ISSUE),
      needsNote: true,
    })
    const target = SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE
    primaryAction = {
      status: target,
      label: shipmentAdvanceButtonLabel(target),
      ctaLabel: shipmentPrimaryActionCta(target),
      advanceChain: buildShipmentAdvanceChain(current, target),
    }
  } else if (current === SHIPMENT_OPERATION_STATUS.DELIVERED) {
    deliveredChoices.push({
      status: SHIPMENT_OPERATION_STATUS.ISSUE,
      label: shipmentAdvanceButtonLabel(SHIPMENT_OPERATION_STATUS.ISSUE),
      needsNote: true,
    })
  }

  return {
    currentLabel: simplifiedShipmentStatusLabel(current),
    nextStepLabel: simplifiedNextStepLabel(current, needsInstallation),
    primaryAction,
    deliveredChoices,
    isTerminal,
    terminalMessage:
      current === SHIPMENT_OPERATION_STATUS.INSTALLATION_DONE
        ? 'Montaj tamamlandı — bu sevk kapatıldı.'
        : current === SHIPMENT_OPERATION_STATUS.ISSUE
          ? 'Sorun kaydedildi — operasyon ekibi bilgilendirilmeli.'
          : current === SHIPMENT_OPERATION_STATUS.DELIVERED && !needsInstallation
            ? 'Teslim edildi — bu sevk tamamlandı.'
            : null,
  }
}

/**
 * @param {string | undefined | null} shipmentStatus
 * @param {{ installationPending?: boolean; hasShipmentIssue?: boolean }} [hints]
 */
export function shipmentQueueCardStatusLabel(shipmentStatus, hints = {}) {
  if (hints.hasShipmentIssue) return 'Sorun var'
  const s = shipmentStatusOrPlanned(shipmentStatus)
  if (s === SHIPMENT_OPERATION_STATUS.DELIVERED && hints.installationPending) {
    return 'Montaj bekleniyor'
  }
  if (isPreDeliveryShipmentStatus(s)) return 'Sevk planlandı'
  return shipmentStatusLabel(s)
}
