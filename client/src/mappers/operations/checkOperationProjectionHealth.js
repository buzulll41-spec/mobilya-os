/** @typedef {import('../../contracts/v1/domainEvent.js').DomainEventDto} DomainEventDto */
/** @typedef {import('../../contracts/v1/task.js').TaskDto} TaskDto */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/**
 * @typedef {Object} OperationHealthIssue
 * @property {'warning' | 'error'} severity
 * @property {string} code
 * @property {string} message
 * @property {string} [orderId]
 */

/**
 * @typedef {Object} OperationProjectionHealth
 * @property {boolean} ok
 * @property {OperationHealthIssue[]} issues
 * @property {{ taskCount: number, duplicateTaskKeys: number, orphanEvents: number, emptyTimelineOrders: number }} stats
 */

/**
 * @param {{
 *   dtos: SalesOrderListItemDto[]
 *   events: DomainEventDto[]
 *   tasks: TaskDto[]
 *   projectTasks?: (input: { dtos: SalesOrderListItemDto[], events: DomainEventDto[], todayIso: string }) => TaskDto[]
 *   todayIso: string
 * }} input
 * @returns {OperationProjectionHealth}
 */
export function checkOperationProjectionHealth(input) {
  const { dtos, events, tasks, todayIso } = input
  /** @type {OperationHealthIssue[]} */
  const issues = []

  const orderIds = new Set(dtos.map((d) => d.id))
  const dedupeKeys = tasks.map((t) => t.dedupeKey)
  const duplicateTaskKeys = dedupeKeys.length - new Set(dedupeKeys).size
  if (duplicateTaskKeys > 0) {
    issues.push({
      severity: 'warning',
      code: 'duplicate_tasks',
      message: `${duplicateTaskKeys} yinelenen görev anahtarı`,
    })
  }

  const orphanEvents = events.filter((e) => e.aggregateType === 'SalesOrder' && !orderIds.has(e.aggregateId))
    .length
  if (orphanEvents > 0) {
    issues.push({
      severity: 'warning',
      code: 'orphan_events',
      message: `${orphanEvents} siparişsiz domain event`,
    })
  }

  let emptyTimelineOrders = 0
  for (const dto of dtos) {
    const hasEvent = events.some((e) => e.aggregateId === dto.id)
    if (!hasEvent) emptyTimelineOrders += 1
  }
  if (emptyTimelineOrders > 0 && dtos.length > 0) {
    issues.push({
      severity: 'warning',
      code: 'empty_timeline',
      message: `${emptyTimelineOrders} siparişte domain event yok`,
    })
  }

  if (input.projectTasks) {
    try {
      const replayed = input.projectTasks({ dtos, events, todayIso })
      if (replayed.length !== tasks.length) {
        issues.push({
          severity: 'warning',
          code: 'stale_projection',
          message: `Görev sayısı uyuşmuyor: cache ${tasks.length}, replay ${replayed.length}`,
        })
      }
    } catch (err) {
      issues.push({
        severity: 'error',
        code: 'projection_crash',
        message: err instanceof Error ? err.message : 'Projection motoru hata verdi',
      })
    }
  }

  const errors = issues.filter((i) => i.severity === 'error')
  return {
    ok: errors.length === 0,
    issues,
    stats: {
      taskCount: tasks.length,
      duplicateTaskKeys,
      orphanEvents,
      emptyTimelineOrders,
    },
  }
}
