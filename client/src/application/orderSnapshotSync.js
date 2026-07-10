import * as ordersClient from '../services/ordersClient.js'
import { mergeDomainEventsById } from '../utils/mergeDomainEvents.js'

/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../contracts/v1/task.js').TaskDto} TaskDto */

/**
 * @returns {Promise<{ domainEvents: DomainEventDto[], operationalTasks: TaskDto[] }>}
 */
export async function fetchDomainEventsAndTasks() {
  const operationalTasks = await ordersClient.getTasks().catch(() => /** @type {TaskDto[]} */ ([]))
  const domainEvents = await ordersClient.getDomainEvents().catch(() => /** @type {DomainEventDto[]} */ ([]))
  return { domainEvents, operationalTasks }
}

/**
 * Mutasyon sonrası: global + sipariş event’lerini birleştir (timeline anında güncellenir).
 * @param {string} orderId
 * @returns {Promise<{ domainEvents: DomainEventDto[], operationalTasks: TaskDto[] }>}
 */
export async function fetchDomainEventsAfterOrderMutation(orderId) {
  const operationalTasks = await ordersClient.getTasks().catch(() => /** @type {TaskDto[]} */ ([]))

  const [globalEvents, orderEvents] = await Promise.all([
    ordersClient.getDomainEvents().catch(() => /** @type {DomainEventDto[]} */ ([])),
    ordersClient.getDomainEventsForOrder(orderId).catch(() => /** @type {DomainEventDto[]} */ ([])),
  ])

  return {
    domainEvents: mergeDomainEventsById(globalEvents, orderEvents),
    operationalTasks,
  }
}
