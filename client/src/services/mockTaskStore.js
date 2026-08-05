/** @typedef {import('../contracts/v1/task.js').TaskDto} TaskDto */

function cloneTasks(/** @type {TaskDto[]} */ rows) {
  return rows.map((t) => ({ ...t }))
}

/**
 * @param {TaskDto} t
 */
function taskStableFingerprint(t) {
  return [
    t.id,
    t.salesOrderId,
    t.title,
    t.description ?? '',
    t.status,
    t.priority,
    t.dedupeKey,
    t.source,
    t.relatedDomainEventId ?? '',
    t.relatedEventType ?? '',
    t.timelineHint ?? '',
    t.createdAt,
    t.updatedAt,
  ].join('\u001e')
}

/**
 * @param {TaskDto[]} a
 * @param {TaskDto[]} b
 */
function sameTaskSnapshots(a, b) {
  if (a.length !== b.length) return false
  const fa = [...a].map(taskStableFingerprint).sort()
  const fb = [...b].map(taskStableFingerprint).sort()
  for (let i = 0; i < fa.length; i++) {
    if (fa[i] !== fb[i]) return false
  }
  return true
}

/** @type {TaskDto[]} */
let memoryTasks = []

export function resetMockTaskStore() {
  memoryTasks = []
}

/**
 * @param {TaskDto[]} tasks
 */
export function replaceAllTasks(tasks) {
  const incoming = cloneTasks(tasks)
  if (sameTaskSnapshots(memoryTasks, incoming)) {
    return
  }
  memoryTasks = incoming
}

/** @returns {TaskDto[]} */
export function getAllTasksSnapshot() {
  return cloneTasks(memoryTasks)
}

/**
 * @param {string} salesOrderId
 * @returns {TaskDto[]}
 */
export function getTasksForSalesOrder(salesOrderId) {
  return memoryTasks.filter((t) => t.salesOrderId === salesOrderId)
}
