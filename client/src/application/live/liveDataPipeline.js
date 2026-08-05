import { getOperationalToday } from '../../data/index.js'
import { getApiBaseUrl } from '../../config/dataSource.js'
import * as ordersClient from '../../services/ordersClient.js'
import * as mockApi from '../../services/mockApi.js'
import { readCachedOrders } from '../../services/offline/offlineCacheStore.js'
import { mapListItemToShipmentRowVM } from '../../mappers/shipment/mapListItemToShipmentRowVM.js'
import { mapListItemToCollectionRowVM } from '../../mappers/payment/mapListItemToCollectionRowVM.js'
import { projectOperationalTasksFromReadModels } from '../../mappers/tasks/projectOperationalTasks.js'
import { filterActiveOperationalTasks } from '../../mappers/tasks/applyTaskStateOverlay.js'
import { fetchTaskStateMapFromApi } from '../../services/taskStateClient.js'

/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../../contracts/v1/task.js').TaskDto} TaskDto */

/**
 * @typedef {'api' | 'cache' | 'mock'} LiveDataLayer
 *
 * @typedef {Object} LiveDataSnapshot
 * @property {LiveDataLayer} layer
 * @property {SalesOrderListItemDto[]} salesOrderListItemDtos
 * @property {ShipmentRowVM[]} shipmentQueueRows
 * @property {DomainEventDto[]} domainEvents
 * @property {TaskDto[]} operationalTasks
 * @property {{
 *   hasApiBase: boolean
 *   usedFallback: boolean
 *   fetchedAt: string
 *   layerError?: string
 * }} meta
 */

/**
 * @param {SalesOrderListItemDto[]} dtos
 * @param {DomainEventDto[]} domainEvents
 * @returns {Promise<TaskDto[]>}
 */
async function projectTasks(dtos, domainEvents) {
  const projected = projectOperationalTasksFromReadModels({
    dtos,
    events: domainEvents,
    todayIso: getOperationalToday(),
  })
  try {
    const stateMap = await fetchTaskStateMapFromApi()
    return filterActiveOperationalTasks(projected, stateMap)
  } catch {
    return projected
  }
}

/**
 * @param {SalesOrderListItemDto[]} dtos
 * @returns {ShipmentRowVM[]}
 */
function shipmentRowsFromDtos(dtos) {
  return dtos.map((dto) => mapListItemToShipmentRowVM(dto))
}

/**
 * API -> Offline Cache -> Mock fallback sırasıyla canlı snapshot üretir.
 * @param {{ includeDomainEvents?: boolean }} [options]
 * @returns {Promise<LiveDataSnapshot>}
 */
export async function loadLiveDataSnapshot(options = {}) {
  const hasApiBase = Boolean(getApiBaseUrl())
  const includeDomainEvents = options.includeDomainEvents !== false

  if (hasApiBase) {
    try {
      const salesOrderListItemDtos = await ordersClient.getOrders()
      const [shipmentQueueRows, domainEvents] = await Promise.all([
        ordersClient.getShipmentQueue().catch(() => shipmentRowsFromDtos(salesOrderListItemDtos)),
        includeDomainEvents ? ordersClient.getDomainEvents().catch(() => []) : Promise.resolve([]),
      ])
      const operationalTasks = await projectTasks(salesOrderListItemDtos, domainEvents)
      return {
        layer: 'api',
        salesOrderListItemDtos,
        shipmentQueueRows,
        domainEvents,
        operationalTasks,
        meta: {
          hasApiBase,
          usedFallback: false,
          fetchedAt: new Date().toISOString(),
        },
      }
    } catch (error) {
      const layerError = error instanceof Error ? error.message : String(error)
      const cachedDtos = await readCachedOrders().catch(() => [])
      if (cachedDtos.length > 0) {
        const domainEvents = /** @type {DomainEventDto[]} */ ([])
        const operationalTasks = await projectTasks(cachedDtos, domainEvents)
        return {
          layer: 'cache',
          salesOrderListItemDtos: cachedDtos,
          shipmentQueueRows: shipmentRowsFromDtos(cachedDtos),
          domainEvents,
          operationalTasks,
          meta: {
            hasApiBase,
            usedFallback: true,
            fetchedAt: new Date().toISOString(),
            layerError,
          },
        }
      }

      // API base varken mock'a düşmek production pilotta yasak.
      throw new Error(layerError)
    }
  }

  const cachedDtos = await readCachedOrders().catch(() => [])
  if (cachedDtos.length > 0) {
    const domainEvents = /** @type {DomainEventDto[]} */ ([])
    const operationalTasks = await projectTasks(cachedDtos, domainEvents)
    return {
      layer: 'cache',
      salesOrderListItemDtos: cachedDtos,
      shipmentQueueRows: shipmentRowsFromDtos(cachedDtos),
      domainEvents,
      operationalTasks,
      meta: {
        hasApiBase,
        usedFallback: true,
        fetchedAt: new Date().toISOString(),
      },
    }
  }

  const salesOrderListItemDtos = await mockApi.getOrders()
  const domainEvents = includeDomainEvents ? await mockApi.getDomainEvents() : []
  const operationalTasks = await projectTasks(salesOrderListItemDtos, domainEvents)
  return {
    layer: 'mock',
    salesOrderListItemDtos,
    shipmentQueueRows: await mockApi.getShipmentQueue().catch(() => shipmentRowsFromDtos(salesOrderListItemDtos)),
    domainEvents,
    operationalTasks,
    meta: {
      hasApiBase,
      usedFallback: true,
      fetchedAt: new Date().toISOString(),
    },
  }
}

/**
 * @param {SalesOrderListItemDto[]} dtos
 */
export function projectCollectionsFromDtos(dtos) {
  return dtos.map((dto) => mapListItemToCollectionRowVM(dto))
}
