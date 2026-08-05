/** @typedef {'OPEN' | 'IN_PROGRESS' | 'BLOCKED' | 'DONE' | 'CANCELLED'} TaskStatus */

export const TASK_STATUS = /** @type {const} */ ({
  OPEN: 'OPEN',
  IN_PROGRESS: 'IN_PROGRESS',
  BLOCKED: 'BLOCKED',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED',
})

/** @typedef {'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'} TaskPriority */

export const TASK_PRIORITY = /** @type {const} */ ({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
})
