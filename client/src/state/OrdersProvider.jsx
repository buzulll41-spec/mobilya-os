import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import { operationsRepository } from '../repository/operationsRepository.js'
import { recordOperationAudit } from '../lib/operationAuditLog.js'

const STARTUP_RETRY_INTERVAL_MS = 5000
const STARTUP_RETRY_MAX_ATTEMPTS = 18
const STARTUP_MESSAGE = 'Sunucu başlatılıyor, kısa süre sonra yeniden deneyin. İlk açılış ücretsiz pilot sunucuda kısa sürebilir.'

function isStartupWakeError(message) {
  const text = String(message ?? '').toLowerCase()
  return text.includes('failed to fetch') ||
    text.includes('network') ||
    text.includes('timeout') ||
    text.includes('503') ||
    text.includes('sunucu başlatılıyor') ||
    text.includes('server')
}

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
 * @property {{ layer: 'api' | 'cache' | 'mock', hasApiBase: boolean, usedFallback: boolean, fetchedAt: string | null, layerError?: string }} dataPipeline Canlı veri pipeline katmanı
 * @property {boolean} loading İlk yükleme: liste boşken veri çekiliyor
 * @property {boolean} isRefreshing Herhangi bir getOrders çalışıyor
 * @property {boolean} mutating create / update API çağrısı
 * @property {Error | null} error
 * @property {(options?: { mergeCreated?: SalesOrderListItemDto, includeDomainEvents?: boolean }) => Promise<void>} refreshOrders
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
  const apiMode = Boolean(getApiBaseUrl())
  const [salesOrderListItemDtos, setSalesOrderListItemDtos] = useState(/** @type {SalesOrderListItemDto[]} */ ([]))
  const [shipmentQueueRows, setShipmentQueueRows] = useState(/** @type {ShipmentRowVM[]} */ ([]))
  const [domainEvents, setDomainEvents] = useState(/** @type {DomainEventDto[]} */ ([]))
  const [operationalTasks, setOperationalTasks] = useState(/** @type {TaskDto[]} */ ([]))
  const [dataPipeline, setDataPipeline] = useState(
    /** @type {{ layer: 'api' | 'cache' | 'mock', hasApiBase: boolean, usedFallback: boolean, fetchedAt: string | null, layerError?: string }} */ ({
      layer: apiMode ? 'api' : 'mock',
      hasApiBase: apiMode,
      usedFallback: false,
      fetchedAt: null,
    }),
  )
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState(/** @type {Error | null} */ (null))
  const startupRetryTimerRef = useRef(/** @type {ReturnType<typeof setTimeout> | null} */ (null))
  const startupRetryAttemptRef = useRef(0)
  const dtoCountRef = useRef(0)

  const clearStartupRetry = useCallback(() => {
    if (startupRetryTimerRef.current) {
      clearTimeout(startupRetryTimerRef.current)
      startupRetryTimerRef.current = null
    }
    startupRetryAttemptRef.current = 0
  }, [])

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

  const auditOperation = useCallback(
    (
      /** @type {string} */ action,
      /** @type {string} */ detail,
      /** @type {Record<string, unknown>} */ meta = {},
    ) => {
      recordOperationAudit({
        action,
        actorRole: user?.role ?? 'UNKNOWN',
        actorName: user?.fullName ?? 'Bilinmeyen Kullanici',
        detail,
        meta,
      })
    },
    [user?.role, user?.fullName],
  )

  const refreshOrders = useCallback(
    async (/** @type {{ mergeCreated?: SalesOrderListItemDto, includeDomainEvents?: boolean } | undefined} */ options) => {
      setError(null)
      setIsRefreshing(true)
      const requestStartedAt = Date.now()
      let forceReleased = false
      const forceReleaseTimer = setTimeout(() => {
        forceReleased = true
        setError(new Error('Veri alınamadı'))
        setIsRefreshing(false)
        console.error('HOME API ERROR', {
          source: 'OrdersProvider.refreshOrders',
          durationMs: Date.now() - requestStartedAt,
          message: 'Request guard timeout (3000ms)',
        })
      }, 3000)
      console.info('HOME API START', {
        source: 'OrdersProvider.refreshOrders',
        apiMode,
        includeDomainEvents: Boolean(options?.includeDomainEvents),
      })
      try {
        assertProductionDataSource()
        const next = await withApiRetry(
          () => operationsRepository.loadSnapshot({ includeDomainEvents: options?.includeDomainEvents }),
          { maxAttempts: 2 },
        )
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
        setDataPipeline({
          layer: next.layer,
          hasApiBase: next.meta.hasApiBase,
          usedFallback: next.meta.usedFallback,
          fetchedAt: next.meta.fetchedAt,
          layerError: next.meta.layerError,
        })
        clearStartupRetry()
        await cacheOrders(salesOrderListItemDtos)
        console.info('HOME API RESPONSE', {
          source: 'OrdersProvider.refreshOrders',
          durationMs: Date.now() - requestStartedAt,
          layer: next.layer,
          orders: salesOrderListItemDtos.length,
          shipments: Array.isArray(next.shipmentQueueRows) ? next.shipmentQueueRows.length : 0,
          tasks: Array.isArray(next.operationalTasks) ? next.operationalTasks.length : 0,
        })
      } catch (e) {
        if (isOfflineMode()) {
          try {
            const cached = await readCachedOrders()
            if (cached.length > 0) {
              setSalesOrderListItemDtos(cached)
              setShipmentQueueRows(cached.map((dto) => mapListItemToShipmentRowVM(dto)))
              setDataPipeline((prev) => ({
                ...prev,
                layer: 'cache',
                usedFallback: true,
              }))
            }
          } catch {
            // ignore cache fallback failures
          }
        }
        const message = formatApiErrorMessage(e)
        const canTryWake =
          apiMode &&
          !isOfflineMode() &&
          dtoCountRef.current === 0 &&
          isStartupWakeError(message) &&
          startupRetryAttemptRef.current < STARTUP_RETRY_MAX_ATTEMPTS

        if (canTryWake) {
          startupRetryAttemptRef.current += 1
          setError(new Error(STARTUP_MESSAGE))
          if (!startupRetryTimerRef.current) {
            startupRetryTimerRef.current = setTimeout(() => {
              startupRetryTimerRef.current = null
              void refreshOrders({ includeDomainEvents: false })
            }, STARTUP_RETRY_INTERVAL_MS)
          }
        } else {
          setError(new Error(message))
        }
        setDataPipeline((prev) => ({
          ...prev,
          usedFallback: true,
          fetchedAt: new Date().toISOString(),
          layerError: canTryWake ? STARTUP_MESSAGE : message,
        }))
        console.error('HOME API ERROR', {
          source: 'OrdersProvider.refreshOrders',
          durationMs: Date.now() - requestStartedAt,
          message: canTryWake ? STARTUP_MESSAGE : message,
        })
      } finally {
        clearTimeout(forceReleaseTimer)
        if (!forceReleased) {
          setIsRefreshing(false)
        }
      }
    },
    [cacheOrders, apiMode, clearStartupRetry],
  )

  useEffect(() => {
    dtoCountRef.current = salesOrderListItemDtos.length
  }, [salesOrderListItemDtos.length])

  useEffect(
    () => () => {
      if (startupRetryTimerRef.current) {
        clearTimeout(startupRetryTimerRef.current)
        startupRetryTimerRef.current = null
      }
    },
    [],
  )

  useEffect(() => {
    if (apiMode) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrap: mock getOrders
    void refreshOrders({ includeDomainEvents: false })
  }, [apiMode, refreshOrders])

  useEffect(() => {
    if (!apiMode) return
    void refreshOrders({ includeDomainEvents: false })
  }, [apiMode, user?.id, refreshOrders])

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
            onlineExecutor: () => operationsRepository.createOrder(draft),
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
            auditOperation('CREATE_ORDER_QUEUED_OFFLINE', `Siparis offline kuyruğa alindi: ${optimistic.id}`, {
              orderId: optimistic.id,
              queueId: queued.id,
            })
            await refreshSnapshot()
            return listItemDtoToLegacyOrder(optimistic)
          }
        }
        const result = await operationsRepository.createOrder(draft)
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
        auditOperation('CREATE_ORDER', `Siparis olusturuldu: ${result.created.id}`, {
          orderId: result.created.id,
        })
        return result.created
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [refreshOrders, refreshSnapshot, auditOperation],
  )

  const updateOrder = useCallback(async (/** @type {string} */ id, /** @type {Partial<Order>} */ patch) => {
    setMutating(true)
    setError(null)
    try {
      const result = await operationsRepository.updateOrder(id, patch)
      const nextDtos = Array.isArray(result.salesOrderListItemDtos) ? result.salesOrderListItemDtos : []
      setSalesOrderListItemDtos((prev) => {
        const serverDto = nextDtos.find((d) => d.id === id)
        if (!serverDto) return nextDtos.length ? nextDtos : prev
        return prev.map((d) => (d.id === id ? serverDto : d))
      })
      setDomainEvents(result.domainEvents)
      setOperationalTasks(result.operationalTasks)
      auditOperation('UPDATE_ORDER', `Siparis guncellendi: ${id}`, { orderId: id })
    } catch (e) {
      const err = new Error(formatApiErrorMessage(e))
      setError(err)
      try {
        const rolled = await operationsRepository.rollbackState()
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
  }, [auditOperation])

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
            onlineExecutor: () => operationsRepository.postOrderPayment(orderId, body),
          })
          if ('queued' in queued) {
            auditOperation('POST_PAYMENT_QUEUED_OFFLINE', `Tahsilat offline kuyruğa alindi: ${orderId}`, {
              orderId,
              queueId: queued.id,
              amount: body.amount,
            })
            await refreshSnapshot()
            return
          }
        }
        const result = await operationsRepository.postOrderPayment(orderId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
        auditOperation('POST_PAYMENT', `Tahsilat kaydedildi: ${orderId}`, {
          orderId,
          amount: body.amount,
          method: body.method,
        })
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [refreshSnapshot, auditOperation],
  )

  const patchOrderTermin = useCallback(
    async (
      /** @type {string} */ orderId,
      /** @type {{ committedShipBy: string, reason: string }} */ body,
    ) => {
      setMutating(true)
      setError(null)
      try {
        const result = await operationsRepository.patchOrderTermin(orderId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
        auditOperation('PATCH_TERMIN', `Termin guncellendi: ${orderId}`, {
          orderId,
          committedShipBy: body.committedShipBy,
        })
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [auditOperation],
  )

  const postOrderMissingItem = useCallback(
    async (
      /** @type {string} */ orderId,
      /** @type {{ title: string, quantity: number, reason: string, supplierNote?: string }} */ body,
    ) => {
      setMutating(true)
      setError(null)
      try {
        const result = await operationsRepository.postOrderMissingItem(orderId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
        auditOperation('POST_MISSING_ITEM', `Eksik urun olusturuldu: ${orderId}`, {
          orderId,
          missingItemId: result.missingItem.id,
        })
        return { missingItem: result.missingItem }
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [auditOperation],
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
        const result = await operationsRepository.patchMissingItemStatus(orderId, missingItemId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
        auditOperation('PATCH_MISSING_ITEM_STATUS', `Eksik urun durumu guncellendi: ${orderId}`, {
          orderId,
          missingItemId,
          status: body.status,
        })
        return { missingItem: result.missingItem }
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [auditOperation],
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
        const result = await operationsRepository.markMissingItemReadyForShipment(orderId, missingItemId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
        auditOperation('MISSING_ITEM_READY_FOR_SHIPMENT', `Eksik urun sevke hazir: ${orderId}`, {
          orderId,
          missingItemId,
        })
        return { missingItem: result.missingItem }
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [auditOperation],
  )

  const postOrderShipment = useCallback(
    async (
      /** @type {string} */ orderId,
      /** @type {{ plannedDate: string, crewName?: string, vehicleNote?: string, note?: string }} */ body,
    ) => {
      setMutating(true)
      setError(null)
      try {
        if (isOfflineMode()) {
          const queued = await runWithOfflineQueue({
            type: OFFLINE_MUTATION_TYPE.POST_SHIPMENT,
            payload: { orderId, body },
            entityKey: orderId,
            onlineExecutor: () => operationsRepository.postOrderShipment(orderId, body),
          })
          if ('queued' in queued) {
            auditOperation('POST_SHIPMENT_QUEUED_OFFLINE', `Sevkiyat plani offline kuyruğa alindi: ${orderId}`, {
              orderId,
              queueId: queued.id,
            })
            await refreshSnapshot()
            return { shipment: /** @type {import('../contracts/v1/shipment.js').ShipmentDto} */ ({ id: `offline-${queued.id}` }) }
          }
        }
        const result = await operationsRepository.postOrderShipment(orderId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setShipmentQueueRows(result.shipmentQueueRows)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
        auditOperation('POST_SHIPMENT', `Sevkiyat plani olusturuldu: ${orderId}`, {
          orderId,
          plannedDate: body.plannedDate,
        })
        return { shipment: result.shipment }
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [auditOperation, refreshSnapshot],
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
        if (isOfflineMode()) {
          const queued = await runWithOfflineQueue({
            type: OFFLINE_MUTATION_TYPE.PATCH_SHIPMENT_STATUS,
            payload: { orderId, shipmentId, body },
            entityKey: orderId,
            onlineExecutor: () => operationsRepository.patchShipmentStatus(orderId, shipmentId, body),
          })
          if ('queued' in queued) {
            auditOperation('PATCH_SHIPMENT_STATUS_QUEUED_OFFLINE', `Sevkiyat durumu offline kuyruğa alindi: ${orderId}`, {
              orderId,
              shipmentId,
              status: body.status,
              queueId: queued.id,
            })
            await refreshSnapshot()
            return { shipment: /** @type {import('../contracts/v1/shipment.js').ShipmentDto} */ ({ id: shipmentId, status: body.status }) }
          }
        }
        const result = await operationsRepository.patchShipmentStatus(orderId, shipmentId, body)
        setSalesOrderListItemDtos(result.salesOrderListItemDtos)
        setShipmentQueueRows(result.shipmentQueueRows)
        setDomainEvents(result.domainEvents)
        setOperationalTasks(result.operationalTasks)
        auditOperation('PATCH_SHIPMENT_STATUS', `Sevkiyat durumu guncellendi: ${orderId}`, {
          orderId,
          shipmentId,
          status: body.status,
        })
        return { shipment: result.shipment }
      } catch (e) {
        const err = new Error(formatApiErrorMessage(e))
        setError(err)
        throw err
      } finally {
        setMutating(false)
      }
    },
    [auditOperation, refreshSnapshot],
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
      dataPipeline,
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
      dataPipeline,
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
