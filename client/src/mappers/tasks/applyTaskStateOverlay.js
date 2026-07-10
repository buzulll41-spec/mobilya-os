import { TASK_STATUS } from '../../contracts/v1/taskEnums.js'

/** @typedef {import('../../contracts/v1/task.js').TaskDto} TaskDto */
/** @typedef {import('../../services/taskStateStore.js').TaskStateMap} TaskStateMap */
/** @typedef {import('../../services/taskStateStore.js').TaskOverlayStateKind} TaskOverlayStateKind */

/**
 * Projection görevlerine kullanıcı overlay uygular.
 * @param {TaskDto[]} tasks
 * @param {TaskStateMap} stateMap
 * @param {{ includeSnoozed?: boolean, includeCompleted?: boolean }} [opts]
 * @returns {TaskDto[]}
 */
export function applyTaskStateOverlay(tasks, stateMap, opts = {}) {
  const now = Date.now()
  return tasks
    .map((task) => {
      const entry = stateMap[task.dedupeKey]
      if (!entry) return task

      if (entry.state === 'dismissed') return null

      if (entry.state === 'snoozed') {
        const until = entry.snoozedUntil ? Date.parse(entry.snoozedUntil) : 0
        if (until > now) {
          if (!opts.includeSnoozed) return null
          return { ...task, status: 'SNOOZED', overlayState: 'snoozed' }
        }
        return task
      }

      if (entry.state === 'completed') {
        if (!opts.includeCompleted) return null
        return { ...task, status: TASK_STATUS.DONE, overlayState: 'completed' }
      }

      return task
    })
    .filter((t) => t != null)
}

/**
 * Bildirim / aksiyon listesi için yalnızca açık görevler.
 * @param {TaskDto[]} tasks
 * @param {TaskStateMap} stateMap
 */
export function filterActiveOperationalTasks(tasks, stateMap) {
  return applyTaskStateOverlay(tasks, stateMap, {
    includeSnoozed: false,
    includeCompleted: false,
  })
}

