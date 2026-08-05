import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'
import { moneyToNumber } from '../moneyHelpers.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

/**
 * @typedef {{
 *   id: string
 *   label: string
 *   done: boolean
 *   critical: boolean
 * }} StoreChecklistItem
 */

/**
 * Gerçek mağaza operasyon checklist’i.
 * @param {Order} order
 * @param {SalesOrderListItemDto | undefined} dto
 * @param {DomainEventDto[]} [events]
 */
export function buildStoreOperationChecklist(order, dto, events = []) {
  const orderId = order.id
  const mine = events.filter((e) => e.aggregateId === orderId)
  const remaining = dto
    ? moneyToNumber(dto.remainingAmount ?? dto.amountDue)
    : Math.max(0, order.amount - (order.paidAmount ?? 0))
  const paid =
    Boolean(order.paid) ||
    remaining <= 0.009 ||
    (order.paidAmount ?? 0) > 0.009 ||
    (dto && moneyToNumber(dto.amountPaid) > 0.009)

  const contractPrinted = mine.some(
    (e) =>
      e.type === DOMAIN_EVENT_TYPE.SALES_CONTRACT_PRINTED ||
      e.type === 'sales.contract_printed',
  )
  const hasConfiguration =
    Boolean(order.product?.trim()) &&
    (order.notes?.includes('Konfig') ||
      order.notes?.includes('kumaş') ||
      mine.some((e) => e.type === DOMAIN_EVENT_TYPE.ORDER_PLACED))

  const productionSent = ['Üretimde', 'Geldi', 'Hazır', 'Eksik Var', 'Teslim Edildi'].includes(
    order.status,
  )
  const productArrived = ['Geldi', 'Hazır', 'Teslim Edildi'].includes(order.status)
  const shipPlanned =
    (dto?.shipmentSummaryOpenCount ?? 0) > 0 ||
    Boolean(order.shipmentDate) ||
    (dto?.inTransitShipmentCount ?? 0) > 0 ||
    mine.some((e) => e.type === DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED)
  const delivered = order.status === 'Teslim Edildi'
  const balanceClosed = remaining <= 0.009

  /** @type {StoreChecklistItem[]} */
  return [
    {
      id: 'config',
      label: 'Konfigürasyon girildi',
      done: hasConfiguration,
      critical: false,
    },
    {
      id: 'contract',
      label: 'Sözleşme yazdırıldı',
      done: contractPrinted,
      critical: !contractPrinted && order.status === 'Bekleniyor',
    },
    {
      id: 'deposit',
      label: 'Kapora alındı',
      done: paid,
      critical: !paid && order.amount > 30_000,
    },
    {
      id: 'factory',
      label: 'Fabrikaya geçildi',
      done: productionSent,
      critical: false,
    },
    {
      id: 'received',
      label: 'Ürün geldi',
      done: productArrived,
      critical: false,
    },
    {
      id: 'shipment',
      label: 'Sevk planlandı',
      done: shipPlanned,
      critical: productArrived && !shipPlanned,
    },
    {
      id: 'delivered',
      label: 'Teslim edildi',
      done: delivered,
      critical: false,
    },
    {
      id: 'balance',
      label: 'Kalan tahsilat kapandı',
      done: balanceClosed,
      critical: delivered && !balanceClosed,
    },
  ]
}
