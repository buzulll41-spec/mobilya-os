import { getApiBaseUrl } from '../config/dataSource.js'
import * as ordersClient from '../services/ordersClient.js'
import { listItemDtoToLegacyOrder } from '../mappers/listItemDtoToLegacyOrder.js'
import { DEMO_TODAY } from '../data/constants.js'
import { DOMAIN_EVENT_TYPE } from '../contracts/v1/domainEventTypes.js'
import { projectLegacyOrderToListItemDto } from '../services/orderListItemProjection.js'
import { fetchDomainEventsAndTasks } from './orderSnapshotSync.js'
import { parseCustomerExtraFromNotes } from '../features/orders/newOrderWizardModel.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../contracts/v1/task.js').TaskDto} TaskDto */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @typedef {Object} OrdersRefreshResult
 * @property {SalesOrderListItemDto[]} salesOrderListItemDtos
 * @property {import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM[]} shipmentQueueRows
 * @property {DomainEventDto[]} domainEvents
 * @property {TaskDto[]} operationalTasks
 */

/**
 * Liste yenileme: getOrders (içinde task rebuild) + event/task snapshot.
 * @returns {Promise<OrdersRefreshResult>}
 */
export async function executeRefreshOrdersFlow() {
  const salesOrderListItemDtos = await ordersClient.getOrders()
  const shipmentQueueRows = await ordersClient.getShipmentQueue().catch(
    () => /** @type {import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM[]} */ ([]),
  )
  const { domainEvents, operationalTasks } = await fetchDomainEventsAndTasks()
  return { salesOrderListItemDtos, shipmentQueueRows, domainEvents, operationalTasks }
}

/**
 * Mutasyon hatası sonrası sunucu ile yeniden hizala.
 * @returns {Promise<OrdersRefreshResult>}
 */
export async function executeRollbackOrdersState() {
  const [salesOrderListItemDtos, shipmentQueueRows, snapshot] = await Promise.all([
    ordersClient.getOrders(),
    ordersClient.getShipmentQueue().catch(
      () => /** @type {import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM[]} */ ([]),
    ),
    fetchDomainEventsAndTasks().catch(() => ({
      domainEvents: /** @type {DomainEventDto[]} */ ([]),
      operationalTasks: /** @type {TaskDto[]} */ ([]),
    })),
  ])
  return {
    salesOrderListItemDtos,
    shipmentQueueRows,
    domainEvents: snapshot.domainEvents,
    operationalTasks: snapshot.operationalTasks,
  }
}

/**
 * @typedef {Object} CreateOrderFlowResult
 * @property {Order} created
 * @property {SalesOrderListItemDto} optimisticDto
 * @property {DomainEventDto[]} domainEvents
 * @property {TaskDto[]} operationalTasks
 */

/**
 * @param {Omit<Order, 'id' | 'orderDate'> | import('../contracts/v1/createOrderRequest.js').CreateOrderRequest} draft
 * @returns {Promise<CreateOrderFlowResult>}
 */
export async function executeCreateOrderFlow(draft) {
  if (getApiBaseUrl()) {
    const req = /** @type {import('../contracts/v1/createOrderRequest.js').CreateOrderRequest} */ (draft)
    const dto = await ordersClient.createSalesOrderViaApi(req)
    const parsed = parseCustomerExtraFromNotes(req.notes)
    const created = {
      ...listItemDtoToLegacyOrder(dto),
      phone: req.phone ?? listItemDtoToLegacyOrder(dto).phone,
      phone2: req.phone2 ?? parsed.phone2,
      nationalId: req.nationalId ?? parsed.nationalId,
      taxNumber: req.taxNumber ?? parsed.taxNumber,
      taxOffice: req.taxOffice ?? parsed.taxOffice,
      notes: req.notes ?? listItemDtoToLegacyOrder(dto).notes,
    }
    return {
      created,
      optimisticDto: {
        ...dto,
        customerPhone: req.phone ?? dto.customerPhone,
        notesSnapshot: req.notes ?? dto.notesSnapshot,
      },
      domainEvents: [],
      operationalTasks: [],
    }
  }

  const created = await ordersClient.createOrder(draft)
  const optimisticDto = projectLegacyOrderToListItemDto(created, DEMO_TODAY)
  ordersClient.appendDomainEvent({
    id: `DOM-${created.id}-placed-${Date.now()}`,
    type: DOMAIN_EVENT_TYPE.ORDER_PLACED,
    aggregateType: 'SalesOrder',
    aggregateId: created.id,
    occurredAt: `${created.orderDate}T12:30:00.000Z`,
    correlationId: `corr-${created.id}-${Date.now()}`,
    payloadSchemaVersion: '1',
    payload: { source: 'createOrder' },
  })
  const { domainEvents, operationalTasks } = await fetchDomainEventsAndTasks()
  return { created, optimisticDto, domainEvents, operationalTasks }
}

export { executeUpdateOrderFlow } from './orderOperationsOrchestration.js'
