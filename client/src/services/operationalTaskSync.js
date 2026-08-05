import { projectOperationalTasksFromReadModels } from '../mappers/tasks/projectOperationalTasks.js'
import { getAllDomainEventsSnapshot } from './mockDomainEventStore.js'
import { replaceAllTasks } from './mockTaskStore.js'

/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../contracts/v1/task.js').TaskDto} TaskDto */

/**
 * Mock store’u projection ile senkron tutar (READ-ONLY kurallar, yan etkisiz).
 * @param {SalesOrderListItemDto[]} dtos
 * @param {string} todayIso
 */
export function rebuildOperationalTasksFromDtos(dtos, todayIso) {
  const events = getAllDomainEventsSnapshot()
  const projected = projectOperationalTasksFromReadModels({ dtos, events, todayIso })
  replaceAllTasks(projected)
}
