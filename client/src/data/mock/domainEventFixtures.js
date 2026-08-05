import { PAYMENT_TRANSACTION_STATUS, SHIPMENT_STATUS } from '../../contracts/v1/enums.js'
import { INITIAL_PAYMENT_TRANSACTIONS } from './paymentFixtures.js'
import { INITIAL_SHIPMENTS } from './shipmentFixtures.js'
import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'

/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */

const SCHEMA = '1'

/**
 * Ödeme / sevkiyat fixture’larından türetilen başlangıç domain event’leri.
 * @returns {DomainEventDto[]}
 */
export function buildInitialDomainEventsFromFixtures() {
  /** @type {DomainEventDto[]} */
  const out = []

  for (const tx of INITIAL_PAYMENT_TRANSACTIONS) {
    const type =
      tx.status === PAYMENT_TRANSACTION_STATUS.POSTED
        ? DOMAIN_EVENT_TYPE.PAYMENT_POSTED
        : DOMAIN_EVENT_TYPE.PAYMENT_PENDING
    out.push({
      id: `DOM-${tx.id}`,
      type,
      aggregateType: 'SalesOrder',
      aggregateId: tx.salesOrderId,
      occurredAt: tx.occurredAt,
      correlationId: `corr-${tx.salesOrderId}-pay`,
      payloadSchemaVersion: SCHEMA,
      payload: {
        transactionId: tx.id,
        amount: tx.amount.amount,
        currency: tx.amount.currency,
        method: tx.method,
        status: tx.status,
        ...(tx.status === PAYMENT_TRANSACTION_STATUS.PENDING_APPROVAL
          ? {
              operationActor: { actorName: 'Murat Tekin', role: 'SATIŞ' },
              note: tx.externalRef ?? undefined,
            }
          : {}),
      },
    })
  }

  for (const sh of INITIAL_SHIPMENTS) {
    if (sh.status === SHIPMENT_STATUS.DISPATCHED) {
      out.push({
        id: `DOM-${sh.id}-disp`,
        type: DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED,
        aggregateType: 'SalesOrder',
        aggregateId: sh.salesOrderId,
        occurredAt: `${sh.actualShipDate ?? sh.plannedShipDate}T16:00:00.000Z`,
        correlationId: `corr-${sh.salesOrderId}-shp`,
        payloadSchemaVersion: SCHEMA,
        payload: { shipmentId: sh.id, shipmentNumber: sh.shipmentNumber },
      })
    }
    if (sh.status === SHIPMENT_STATUS.PLANNED) {
      out.push({
        id: `DOM-${sh.id}-plan`,
        type: DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED,
        aggregateType: 'SalesOrder',
        aggregateId: sh.salesOrderId,
        occurredAt: `${sh.plannedShipDate ?? '1970-01-01'}T09:00:00.000Z`,
        correlationId: `corr-${sh.salesOrderId}-shp-plan`,
        payloadSchemaVersion: SCHEMA,
        payload: { shipmentId: sh.id, shipmentNumber: sh.shipmentNumber },
      })
    }
  }

  out.push({
    id: 'DOM-S-24089-partial',
    type: DOMAIN_EVENT_TYPE.SHIPMENT_PARTIAL,
    aggregateType: 'SalesOrder',
    aggregateId: 'S-24089',
    occurredAt: '2026-05-10T16:05:00.000Z',
    correlationId: 'corr-S-24089-partial',
    payloadSchemaVersion: SCHEMA,
    payload: { shippedQty: '1', orderedQty: '2', orderLineId: 'OL-S-24089-1' },
  })

  out.push({
    id: 'DOM-S-24089-risk',
    type: DOMAIN_EVENT_TYPE.RISK_ESCALATED,
    aggregateType: 'SalesOrder',
    aggregateId: 'S-24089',
    occurredAt: '2026-05-13T08:00:00.000Z',
    correlationId: 'corr-S-24089-risk',
    payloadSchemaVersion: SCHEMA,
    payload: {
      reason: 'overdue_partial_shipment',
      severity: 'HIGH',
      signals: ['termin_overdue', 'partial_shipment'],
    },
  })

  out.push({
    id: 'DOM-S-24105-delivery-fail',
    type: DOMAIN_EVENT_TYPE.DELIVERY_FAILED,
    aggregateType: 'SalesOrder',
    aggregateId: 'S-24105',
    occurredAt: '2026-05-12T11:30:00.000Z',
    correlationId: 'corr-S-24105-del',
    payloadSchemaVersion: SCHEMA,
    payload: { reason: 'Müşteri yerinde değildi — randevu ertelendi.' },
  })

  return out
}
