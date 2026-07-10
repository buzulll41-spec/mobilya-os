import { TASK_PRIORITY, TASK_STATUS } from '../../contracts/v1/taskEnums.js'

/** @typedef {import('../../contracts/v1/task.js').TaskDto} TaskDto */

/** @param {import('../../contracts/v1/taskEnums.js').TaskStatus} s */
export function taskStatusLabelTr(s) {
  switch (s) {
    case TASK_STATUS.OPEN:
      return 'Açık'
    case TASK_STATUS.IN_PROGRESS:
      return 'Devam ediyor'
    case TASK_STATUS.BLOCKED:
      return 'Blokeli'
    case TASK_STATUS.DONE:
      return 'Tamamlandı'
    case TASK_STATUS.CANCELLED:
      return 'İptal'
    default:
      return s
  }
}

/** @param {import('../../contracts/v1/taskEnums.js').TaskPriority} p */
export function taskPriorityLabelTr(p) {
  switch (p) {
    case TASK_PRIORITY.LOW:
      return 'Düşük'
    case TASK_PRIORITY.MEDIUM:
      return 'Orta'
    case TASK_PRIORITY.HIGH:
      return 'Yüksek'
    case TASK_PRIORITY.CRITICAL:
      return 'Kritik'
    default:
      return p
  }
}

/**
 * @param {TaskDto} t
 */
export function mapTaskDtoToDrawerRow(t) {
  return {
    ...t,
    statusLabel: taskStatusLabelTr(t.status),
    priorityLabel: taskPriorityLabelTr(t.priority),
    severity: t.severity ?? (t.priority === 'CRITICAL' ? 'critical' : 'info'),
    subtitle: t.subtitle ?? t.description ?? null,
    suggestedAction: t.suggestedAction ?? null,
  }
}
