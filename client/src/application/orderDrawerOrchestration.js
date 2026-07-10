import { resolveOrderPanelTab } from '../mappers/order/orderOperationPanelModel.js'
import { resolveEffectiveDrawerTab } from '../constants/orderDrawerPermissions.js'

/** @typedef {import('../contracts/orderDrawer.js').OpenOrderDrawerOptions} OpenOrderDrawerOptions */
/** @typedef {import('../contracts/orderDrawer.js').OrderDrawerQueueContext} OrderDrawerQueueContext */
/** @typedef {import('../contracts/orderDrawer.js').OrderDrawerTab} OrderDrawerTab */
/** @typedef {import('../contracts/v1/user.js').UserRole} UserRole */
/** @typedef {import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @param {OpenOrderDrawerOptions | undefined} options
 * @param {UserRole | undefined} role
 * @param {SalesOrderListItemDto | undefined} dto
 */
export function resolveOpenDrawerTab(options, role, dto) {
  const legacyTab = resolveOrderPanelTab(options?.tab, options?.section)
  return resolveEffectiveDrawerTab(
    role,
    /** @type {OrderDrawerTab} */ (legacyTab),
    options?.source ?? options?.queue?.source ?? null,
    dto,
  )
}

/**
 * @param {OrderDrawerQueueContext | null} queue
 * @param {1 | -1} direction
 * @returns {{ orderId: string, nextQueue: OrderDrawerQueueContext } | null}
 */
export function navigateQueueOrder(queue, direction) {
  if (!queue?.rowIds?.length) return null
  const nextIndex = queue.activeIndex + direction
  if (nextIndex < 0 || nextIndex >= queue.rowIds.length) return null
  const orderId = queue.rowIds[nextIndex]
  if (!orderId) return null
  return {
    orderId,
    nextQueue: { ...queue, activeIndex: nextIndex },
  }
}

/**
 * @param {OrderDrawerQueueContext | null} queue
 */
export function canNavigateQueuePrev(queue) {
  return Boolean(queue && queue.activeIndex > 0)
}

/**
 * @param {OrderDrawerQueueContext | null} queue
 */
export function canNavigateQueueNext(queue) {
  return Boolean(queue && queue.activeIndex < (queue.rowIds?.length ?? 0) - 1)
}

/**
 * @param {string} orderId
 * @param {OpenOrderDrawerOptions} options
 * @returns {OrderDrawerQueueContext | null}
 */
/**
 * @param {{
 *   queueId: string
 *   filterSnapshot?: Record<string, unknown>
 *   sort?: string
 *   rowIds: string[]
 *   activeOrderId: string
 *   source?: import('../contracts/orderDrawer.js').OrderDrawerSource
 * }} params
 * @returns {OrderDrawerQueueContext}
 */
export function buildDrawerQueue(params) {
  const activeIndex = Math.max(0, params.rowIds.indexOf(params.activeOrderId))
  return {
    queueId: params.queueId,
    filterSnapshot: params.filterSnapshot ?? {},
    sort: params.sort ?? 'default',
    rowIds: params.rowIds,
    activeIndex,
    source: params.source,
  }
}

export function normalizeQueueContext(orderId, options) {
  const q = options.queue
  if (!q?.rowIds?.length) return null
  let activeIndex = q.activeIndex
  if (!Number.isFinite(activeIndex) || activeIndex < 0) {
    activeIndex = q.rowIds.indexOf(orderId)
  }
  if (activeIndex < 0) activeIndex = 0
  return {
    queueId: q.queueId,
    filterSnapshot: q.filterSnapshot ?? {},
    sort: q.sort ?? 'default',
    rowIds: q.rowIds,
    activeIndex,
    source: q.source ?? options.source,
  }
}
