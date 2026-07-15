import { useCallback, useEffect, useMemo, useState } from 'react'
import { DEMO_TODAY, getOperationalToday } from '../data/constants.js'
import { projectLegacyOrderToListItemDto } from '../services/orderListItemProjection.js'
import { listItemDtoToLegacyOrder } from '../mappers/listItemDtoToLegacyOrder.js'
import { mapListItemToRowVM } from '../mappers/mapListItemToRowVM.js'
import { mapListItemToShipmentRowVM } from '../mappers/shipment/mapListItemToShipmentRowVM.js'
import { mapListItemToCollectionRowVM } from '../mappers/payment/mapListItemToCollectionRowVM.js'
import { OrdersStateContext } from './ordersContext.js'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import { withApiRetry } from '../lib/apiRetry.js'
import {
  executeCreateOrderFlow,
  executeRefreshOrdersFlow,
  executeRollbackOrdersState,
  executeUpdateOrderFlow,
} from '../application/orderMutationOrchestration.js'
import {
  executePatchTerminFlow,
  executePostPaymentFlow,
  executePatchMissingItemStatusFlow,
  executeMarkMissingItemReadyForShipmentFlow,
  executePostMissingItemFlow,
  executePatchShipmentStatusFlow,
  executePostOrderShipmentFlow,
  mergeOrderListItemFromMutation,
} from '../application/orderOperationsOrchestration.js'
import { DOMAIN_EVENT_TYPE } from '../contracts/v1/domainEventTypes.js'
import { getApiBaseUrl, assertProductionDataSource } from '../config/dataSource.js'
import { projectOperationalTasksFromReadModels } from '../mappers/tasks/projectOperationalTasks.js'
import { useAuth } from './AuthProvider.jsx'
import { useOfflineFirst } from './OfflineFirstProvider.jsx'
import { isOfflineMode, runWithOfflineQueue } from '../services/offline/offlineMutationGate.js'
import { OFFLINE_MUTATION_TYPE } from '../services/offline/offlineCacheStore.js'
import { readCachedOrders } from '../services/offline/offlineCacheStore.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */
/** @typedef {import('../contracts/v1/orderListRowVm.js').OrderListRowVM} OrderListRowVM */
/** @typedef {import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM} ShipmentRowVM */
/** @typedef {import('../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../contracts/v1/task.js').TaskDto} TaskDto */

/**
 * @typedef {Object} OrdersStateValue
 * @property {Order[]} orders Legacy adapter çıktısı — workspace / drawer / diğer sayfalar
 * @property {OrderListRowVM[]} orderListRows DTO → VM (Siparişler tablosu)
 * @property {ShipmentRowVM[]} shipmentRowVMs DTO → Sevk satır VM (sipariş projection)
 * @property {ShipmentRowVM[]} shipmentQueueRows GET /v1/shipments kuyruğu
 * @property {CollectionRowVM[]} collectionRowVMs DTO → Tahsilat satır VM
 * @property {SalesOrderListItemDto[]} salesOrderListItemDtos Wire DTO (foundation)
 * @property {DomainEventDto[]} domainEvents Operasyonel domain event akışı (mock)
 * @property {TaskDto[]} operationalTasks Operasyonel görevler (mock)
 * @property {boolean} loading İlk yükleme: liste boşken veri çekiliyor
 * @property {boolean} isRefreshing Herhangi bir getOrders çalışıyor
 * @property {boolean} mutating create / update API çağrısı
 * @property {Error | null} error
 * @property {(options?: { mergeCreated?: SalesOrderListItemDto }) => Promise<void>} refreshOrders
 * @property {(draft: Omit<Order, 'id' | 'orderDate'> | import('../contracts/v1/createOrderRequest.js').CreateOrderRequest) => Promise<Order>} createOrder
 * @property {(id: string, patch: Partial<Order>) => Promise<void>} updateOrder
 * @property {(orderId: string, body: { amount: number, method: string, note?: string }) => Promise<void>} postOrderPayment
 * @property {(orderId: string, body: { committedShipBy: string, reason: string }) => Promise<void>} patchOrderTermin
 * @property {(orderId: string, body: { title: string, quantity: number, reason: string, supplierNote?: string }) => Promise<{ missingItem: import('../contracts/v1/missingItem.js').MissingItemDto }>} postOrderMissingItem
 * @property {(orderId: string, missingItemId: string, body: { status: string, supplierNote?: string, resolutionNote?: string }) => Promise<{ missingItem: import('../contracts/v1/missingItem.js').MissingItemDto }>} patchMissingItemStatus
 * @property {(orderId: string, missingItemId: string, body?: { note?: string }) => Promise<{ missingItem: import('../contracts/v1/missingItem.js').MissingItemDto }>} markMissingItemReadyForShipment
 * @property {(orderId: string, body: { plannedDate: string, crewName?: string, vehicleNote?: string, note?: string }) => Promise<{ shipment: import('../contracts/v1/shipment.js').ShipmentDto }>} postOrderShipment
 * @property {(orderId: string, shipmentId: string, body: { status: string, issueNote?: string }) => Promise<{ shipment: import('../contracts/v1/shipment.js').ShipmentDto }>} patchShipmentStatus
 * @property {(orderId: string) => Promise<void>} recordContractPrinted
 * @property {(input: { vehicleName: string, plannedDate: string, orderIds: string[] }) => Promise<void>} recordDispatchSheetPrinted
 * @property {(input: { salesOrderId: string, selectedDate: string, healthScore: number, savingsCount: number, waitCount: number, riskCount: number, orderIds: string[] }) => Promise<void>} recordDispatchAdviceGenerated
 * @property {(input: { vehicleName: string, plannedDate: string, orderIds: string[], region: string, estimatedSaving: number }) => Promise<void>} recordDispatchAutoPlanned
 * @property {(input: { salesOrderId: string, riskType: string, title: string, recommendation: string, selectedDate: string }) => Promise<void>} recordDispatchRiskDetected
 * @property {(dedupeKey: string, state: 'dismissed' | 'completed' | 'snoozed') => void} setTaskOverlay
 */

/** @param {{ children: import('react').ReactNode }} props */
export function OrdersProvider({ children }) {
  const { user } = useAuth()
  const { cacheOrders, refreshSnapshot } = useOfflineFirst()
  const [salesOrderListItemDtos, setSalesOrderListItemDtos] = useState(/** @type {SalesOrderListItemDto[]} */ ([]))
  const [shipmentQueueRows, setShipmentQueueRows] = useState(/** @type {ShipmentRowVM[]} */ ([]))
  const [domainEvents, setDomainEvents] = useState(/** @type {DomainEventDto[]} */ ([]))
  const [operationalTasks, setOperationalTasks] = useState(/** @type {TaskDto[]} */ ([]))
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState(/** @type {Error | null} */ (null))

  const orderListRows = useMemo(
    () => salesOrderListItemDtos.map((dto) => mapListItemToRowVM(dto)),
    [salesOrderListItemDtos],
  )

  const shipmentRowVMs = useMemo(
    () => salesOrderListItemDtos.map((dto) => mapListItemToShipmentRowVM(dto)),
    [salesOrderListItemDtos],
  )

  const collectionRowVMs = useMemo(
    () => salesOrderListItemDtos.map((dto) => mapListItemToCollectionRowVM(dto)),
    [salesOrderListItemDtos],
  )

  const orders = useMemo(
    () => salesOrderListItemDtos.map((dto) => listItemDtoToLegacyOrder(dto)),
    [salesOrderListItemDtos],
  )

  const loading = isRefreshing && salesOrderListItemDtos.length === 0

  const refreshOrders = useCallback(
    async (/** @type {{ mergeCreated?: SalesOrderListItemDto } | undefined} */ options) => {
      setError(null)
      setIsRefreshing(true)
      try {
        assertProductionDataSource()
        const next = await withApiRetry(() => executeRefreshOrdersFlow(), { maxAttempts: 3 })
        let salesOrderListItemDtos = Array.isArray(next.salesOrderListItemDtos)
          ? next.salesOrderListItemDtos
          : []
        const mergeCreated = options?.mergeCreated
        if (mergeCreated?.id) {
          const serverDto = salesOrderListItemDtos.find((d) => d.id === mergeCreated.id)
          salesOrderListItemDtos = mergeOrderListItemFromMutation(
            salesOrderListItemDtos,
            mergeCreated.id,
            serverDto ?? mergeCreated,
          )
        }
        setSalesOrderListItemDtos(salesOrderListItemDtos)
        setShipmentQueueRows(Array.isArray(next.shipmentQueueRows) ? next.shipmentQueueRows : [])
        setDomainEvents(next.domainEvents)
        setOperationalTasks(next.operationalTasks)
        await cacheOrders(salesOrderListItemDtos)
      } catch (e) {
        if (isOfflineMode()) {
          try {
            const cached = await readCachedOrders()
            if (cached.length) setSalesOrderListItemDtos(cached)
          } catch {
            // ignore cache fallback failures
          }
        }
        const message = formatApiErrorMessage(e)
        if (!message.includes('Backend çalışmıyor') && !message.includes('zaman aşımına')) {
          setError(new Error(message))
        }
      } finally {
        setIsRefreshing(false)
      }
    },
    [cacheOrders],
  )

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrap: mock getOrders
    void refreshOrders()
  }, [refreshOrders])

  useEffect(() => {
    if (!user?.id) return
    void refreshOrders()
  }, [user?.id, refreshOrders])

  const createOrder = useCallback(
    async (
      /** @type {Omit<Order, 'id' | 'orderDate'> | import('../contracts/v1/createOrderRequest.js').CreateOrderRequest} */ draft,
    ) => {
      setMutating(true)
      setError(null)
      try {
        if (isOfflineMode()) {
          const queued = await runWithOfflineQueue({
            type: OFFLINE_MUTATION_TYPE.CREATE_ORDER,
            payload: draft,
            onlineExecutor: () => executeCreateOrderFlow(draft),
          })
          if ('queued' in queued) {
            const optimistic = projectLegacyOrderToListItemDto(
              /** @type {Order} */ ({
                ...(typeof draft === 'object' && draft && 'customer' in draft ? draft : {}),
                id: `offline-${queued.id}`,
                orderDate: getOperationalToday(),
              }),
              DEMO_TODAY,
            )
            setSalesOrderListItemDtos((prev) => [optimistic, ...prev])
            await refreshSnapshot()
            return listItemDtoToLegacyOrder(optimistic)
          }
        }
        const result = await executeCreateOrderFlow(draft)
        const createdDto = result.optimisticDto
        setSalesOrderListItemDtos((prev) => [
          createdDto,
          ...prev.filter((d) => d.id !== createdDto.id),
        ])
        try {
          await refreshOrders({ mergeCreated: createdDto })
        } catch {
          /* Sipariş oluşturuldu; kısıtlı rolde kısmi yenileme başarısız olabilir */
        }
        return result.created
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [refreshOrders, refreshSnapshot],
  )

  const updateOrder = useCallback(async (/** @type {string} */ id, /** @type {Partial<Order>} */ patch) => {
    setMutating(true)
    setError(null)
    setSalesOrderListItemDtos((prev) =>
      prev.map((d) =>
        d.id === id
          ? projectLegacyOrderToListItemDto(
              { ...listItemDtoToLegacyOrder(d), ...patch },
              DEMO_TODAY,
            )
          : d,
      ),
    )
    try {
      const result = await executeUpdateOrderFlow(id, patch)
      setSalesOrderListItemDtos(result.salesOrderListItemDtos)
      setDomainEvents(result.domainEvents)
      setOperationalTasks(result.operationalTasks)
    } catch (e) {
      const err = new Error(formatApiErrorMessage(e))
      setError(err)
      try {
        const rolled = await executeRollbackOrdersState()
        setSalesOrderListItemDtos(rolled.salesOrderListItemDtos)
        setShipmentQueueRows(rolled.shipmentQueueRows ?? [])
        setDomainEvents(rolled.domainEvents)
        setOperationalTasks(rolled.operationalTasks)
      } catch {
        /* ignore */
      }
      throw err
    } finally {
      setMutating(false)
    }
  }, [])

  const postOrderPayment = useCallback(
    async (/** @type {string} */ orderId, /** @type {{ amount: number, method: string, note?: string }} */ body) => {
      setMutating(true)
      setError(null)
      try {
        if (isOfflineMode()) {
          const queued = await runWithOfflineQueue({
            type: OFFLINE_MUTATION_TYPE.POST_PAYMENT,
            payload: { orderId, body },
            entityKey: orderId,
            onlineExecutor: () => executePostPaymentFlow(orderId, body),
          })
          if ('queued' in queued) {
            await refreshSnapshot()
            return
          }
        }
        const result = await executePostPaymentFlow(orderId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [refreshSnapshot],
  )

  const patchOrderTermin = useCallback(
    async (
      /** @type {string} */ orderId,
      /** @type {{ committedShipBy: string, reason: string }} */ body,
    ) => {
      setMutating(true)
      setError(null)
      try {
        const result = await executePatchTerminFlow(orderId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [],
  )

  const postOrderMissingItem = useCallback(
    async (
      /** @type {string} */ orderId,
      /** @type {{ title: string, quantity: number, reason: string, supplierNote?: string }} */ body,
    ) => {
      setMutating(true)
      setError(null)
      try {
        const result = await executePostMissingItemFlow(orderId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
        return { missingItem: result.missingItem }
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [],
  )

  const patchMissingItemStatus = useCallback(
    async (
      /** @type {string} */ orderId,
      /** @type {string} */ missingItemId,
      /** @type {{ status: string, supplierNote?: string, resolutionNote?: string }} */ body,
    ) => {
      setMutating(true)
      setError(null)
      try {
        const result = await executePatchMissingItemStatusFlow(orderId, missingItemId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
        return { missingItem: result.missingItem }
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [],
  )

  const markMissingItemReadyForShipment = useCallback(
    async (
      /** @type {string} */ orderId,
      /** @type {string} */ missingItemId,
      /** @type {{ note?: string }} */ body = {},
    ) => {
      setMutating(true)
      setError(null)
      try {
        const result = await executeMarkMissingItemReadyForShipmentFlow(orderId, missingItemId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
        return { missingItem: result.missingItem }
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [],
  )

  const postOrderShipment = useCallback(
    async (
      /** @type {string} */ orderId,
      /** @type {{ plannedDate: string, crewName?: string, vehicleNote?: string, note?: string }} */ body,
    ) => {
      setMutating(true)
      setError(null)
      try {
        const result = await executePostOrderShipmentFlow(orderId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setShipmentQueueRows(result.shipmentQueueRows)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
        return { shipment: result.shipment }
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [],
  )

  const patchShipmentStatus = useCallback(
    async (
      /** @type {string} */ orderId,
      /** @type {string} */ shipmentId,
      /** @type {{ status: string, issueNote?: string }} */ body,
    ) => {
      setMutating(true)
      setError(null)
      try {
        const result = await executePatchShipmentStatusFlow(orderId, shipmentId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setShipmentQueueRows(result.shipmentQueueRows)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
        return { shipment: result.shipment }
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [],
  )

  const recordContractPrinted = useCallback(
    async (orderId) => {
      const { postDomainEvent } = await import('../services/ordersClient.js')
      const { contractPrintedMetadata } = await import('../lib/operationActor.js')
      const { filterActiveOperationalTasks } = await import(
        '../mappers/tasks/applyTaskStateOverlay.js'
      )
      const { loadTaskStateMap } = await import('../services/taskStateStore.js')

      const ev = await postDomainEvent({
        type: DOMAIN_EVENT_TYPE.SALES_CONTRACT_PRINTED,
        salesOrderId: orderId,
        metadata: contractPrintedMetadata(),
      })

      setDomainEvents((prev) => {
        const exists = prev.some((e) => e.id === ev.id)
        const nextEvents = exists ? prev : [...prev, ev]
        const projected = projectOperationalTasksFromReadModels({
          dtos: salesOrderListItemDtos,
          events: nextEvents,
          todayIso: DEMO_TODAY,
        })
        setOperationalTasks(filterActiveOperationalTasks(projected, loadTaskStateMap()))
        return nextEvents
      })
    },
    [salesOrderListItemDtos],
  )

  const recordDispatchSheetPrinted = useCallback(
    async ({ vehicleName, plannedDate, orderIds }) => {
      if (!orderIds?.length) return

      const { postDomainEvent } = await import('../services/ordersClient.js')
      const { dispatchSheetPrintedMetadata } = await import('../lib/operationActor.js')
      const { filterActiveOperationalTasks } = await import(
        '../mappers/tasks/applyTaskStateOverlay.js'
      )
      const { loadTaskStateMap } = await import('../services/taskStateStore.js')

      const metadata = dispatchSheetPrintedMetadata({ vehicleName, plannedDate, orderIds })
      const events = await Promise.all(
        orderIds.map((orderId) =>
          postDomainEvent({
            type: DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCH_SHEET_PRINTED,
            salesOrderId: orderId,
            metadata,
          }),
        ),
      )

      setDomainEvents((prev) => {
        const nextEvents = [...prev]
        for (const ev of events) {
          if (!nextEvents.some((e) => e.id === ev.id)) {
            nextEvents.push(ev)
          }
        }
        const projected = projectOperationalTasksFromReadModels({
          dtos: salesOrderListItemDtos,
          events: nextEvents,
          todayIso: DEMO_TODAY,
        })
        setOperationalTasks(filterActiveOperationalTasks(projected, loadTaskStateMap()))
        return nextEvents
      })
    },
    [salesOrderListItemDtos],
  )

  const appendDomainEventsToState = useCallback(
    async (events) => {
      const { filterActiveOperationalTasks } = await import(
        '../mappers/tasks/applyTaskStateOverlay.js'
      )
      const { loadTaskStateMap } = await import('../services/taskStateStore.js')

      setDomainEvents((prev) => {
        const nextEvents = [...prev]
        for (const ev of events) {
          if (!nextEvents.some((e) => e.id === ev.id)) {
            nextEvents.push(ev)
          }
        }
        const projected = projectOperationalTasksFromReadModels({
          dtos: salesOrderListItemDtos,
          events: nextEvents,
          todayIso: DEMO_TODAY,
        })
        setOperationalTasks(filterActiveOperationalTasks(projected, loadTaskStateMap()))
        return nextEvents
      })
    },
    [salesOrderListItemDtos],
  )

  const recordDispatchAdviceGenerated = useCallback(
    async (input) => {
      const { postDomainEvent } = await import('../services/ordersClient.js')
      const { dispatchAdviceGeneratedMetadata } = await import('../lib/operationActor.js')
      const metadata = dispatchAdviceGeneratedMetadata({
        selectedDate: input.selectedDate,
        healthScore: input.healthScore,
        savingsCount: input.savingsCount,
        waitCount: input.waitCount,
        riskCount: input.riskCount,
        orderIds: input.orderIds,
      })
      const ev = await postDomainEvent({
        type: DOMAIN_EVENT_TYPE.DISPATCH_ADVICE_GENERATED,
        salesOrderId: input.salesOrderId,
        metadata,
      })
      await appendDomainEventsToState([ev])
    },
    [appendDomainEventsToState],
  )

  const recordDispatchAutoPlanned = useCallback(
    async ({ vehicleName, plannedDate, orderIds, region, estimatedSaving }) => {
      if (!orderIds?.length) return
      const { postDomainEvent } = await import('../services/ordersClient.js')
      const { dispatchAutoPlannedMetadata } = await import('../lib/operationActor.js')
      const metadata = dispatchAutoPlannedMetadata({
        vehicleName,
        plannedDate,
        orderIds,
        region,
        estimatedSaving,
      })
      const events = await Promise.all(
        orderIds.map((orderId) =>
          postDomainEvent({
            type: DOMAIN_EVENT_TYPE.DISPATCH_AUTO_PLANNED,
            salesOrderId: orderId,
            metadata,
          }),
        ),
      )
      await appendDomainEventsToState(events)
    },
    [appendDomainEventsToState],
  )

  const recordDispatchRiskDetected = useCallback(
    async (input) => {
      const { postDomainEvent } = await import('../services/ordersClient.js')
      const { dispatchRiskDetectedMetadata } = await import('../lib/operationActor.js')
      const metadata = dispatchRiskDetectedMetadata({
        riskType: input.riskType,
        title: input.title,
        recommendation: input.recommendation,
        selectedDate: input.selectedDate,
      })
      const ev = await postDomainEvent({
        type: DOMAIN_EVENT_TYPE.DISPATCH_RISK_DETECTED,
        salesOrderId: input.salesOrderId,
        metadata,
      })
      await appendDomainEventsToState([ev])
    },
    [appendDomainEventsToState],
  )

  const setTaskOverlay = useCallback(
    (dedupeKey, state) => {
      void Promise.all([
        import('../services/taskStateClient.js'),
        import('../mappers/tasks/applyTaskStateOverlay.js'),
      ]).then(async ([{ persistTaskOverlayAction, fetchTaskStateMapFromApi }, { filterActiveOperationalTasks }]) => {
        await persistTaskOverlayAction(dedupeKey, state)
        const stateMap = await fetchTaskStateMapFromApi()
        const projected = projectOperationalTasksFromReadModels({
          dtos: salesOrderListItemDtos,
          events: domainEvents,
          todayIso: DEMO_TODAY,
        })
        setOperationalTasks(filterActiveOperationalTasks(projected, stateMap))
      })
    },
    [salesOrderListItemDtos, domainEvents],
  )

  const value = useMemo(
    () => ({
      orders,
      orderListRows,
      shipmentRowVMs,
      shipmentQueueRows,
      collectionRowVMs,
      salesOrderListItemDtos,
      domainEvents,
      operationalTasks,
      loading,
      isRefreshing,
      mutating,
      error,
      refreshOrders,
      createOrder,
      updateOrder,
      postOrderPayment,
      patchOrderTermin,
      postOrderMissingItem,
      patchMissingItemStatus,
      markMissingItemReadyForShipment,
      postOrderShipment,
      patchShipmentStatus,
      recordContractPrinted,
      recordDispatchSheetPrinted,
      recordDispatchAdviceGenerated,
      recordDispatchAutoPlanned,
      recordDispatchRiskDetected,
      setTaskOverlay,
    }),
    [
      orders,
      orderListRows,
      shipmentRowVMs,
      shipmentQueueRows,
      collectionRowVMs,
      salesOrderListItemDtos,
      domainEvents,
      operationalTasks,
      loading,
      isRefreshing,
      mutating,
      error,
      refreshOrders,
      createOrder,
      updateOrder,
      postOrderPayment,
      patchOrderTermin,
      postOrderMissingItem,
      patchMissingItemStatus,
      markMissingItemReadyForShipment,
      postOrderShipment,
      patchShipmentStatus,
      recordContractPrinted,
      recordDispatchSheetPrinted,
      recordDispatchAdviceGenerated,
      recordDispatchAutoPlanned,
      recordDispatchRiskDetected,
      setTaskOverlay,
    ],
  )

  return <OrdersStateContext.Provider value={value}>{children}</OrdersStateContext.Provider>
}
