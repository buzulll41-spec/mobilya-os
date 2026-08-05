/**
 * Digital Workforce — dijital çalışan kaydı (FAZ 23A).
 *
 * @typedef {'PREPARING' | 'WAITING' | 'RUNNING' | 'HUMAN_APPROVAL' | 'COMPLETED' | 'FAILED' | 'PAUSED'} DigitalWorkerStatus
 * @typedef {'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL'} WorkerPriorityLevel
 *
 * @typedef {Object} DigitalWorker
 * @property {string} id
 * @property {string} name
 * @property {string} code
 * @property {string} role
 * @property {string} department
 * @property {DigitalWorkerStatus} status
 * @property {WorkerPriorityLevel} priority
 * @property {boolean} enabled
 * @property {string} avatar
 * @property {string} description
 * @property {string} icon
 * @property {string | null} lastRun ISO instant
 * @property {string} createdAt ISO instant
 * @property {string} updatedAt ISO instant
 */

export const DIGITAL_WORKER_STATUS = /** @type {const} */ ({
  PREPARING: 'PREPARING',
  WAITING: 'WAITING',
  RUNNING: 'RUNNING',
  HUMAN_APPROVAL: 'HUMAN_APPROVAL',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  PAUSED: 'PAUSED',
})

/** @typedef {DigitalWorkerStatus} WorkerTaskStatus */

/** @type {Record<DigitalWorkerStatus, string>} */
export const DIGITAL_WORKER_STATUS_LABEL = {
  PREPARING: 'Hazırlanıyor',
  WAITING: 'Bekliyor',
  RUNNING: 'Çalışıyor',
  HUMAN_APPROVAL: 'İnsan Onayı Bekliyor',
  COMPLETED: 'Tamamlandı',
  FAILED: 'Başarısız',
  PAUSED: 'Duraklatıldı',
}

/** @type {Record<DigitalWorkerStatus, 'muted' | 'info' | 'warning' | 'success' | 'critical'>} */
export const DIGITAL_WORKER_STATUS_TONE = {
  PREPARING: 'muted',
  WAITING: 'info',
  RUNNING: 'warning',
  HUMAN_APPROVAL: 'critical',
  COMPLETED: 'success',
  FAILED: 'critical',
  PAUSED: 'muted',
}

export const WORKER_PRIORITY = /** @type {const} */ ({
  LOW: 'LOW',
  NORMAL: 'NORMAL',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
})

/** @type {Record<WorkerPriorityLevel, string>} */
export const WORKER_PRIORITY_LABEL = {
  LOW: 'Düşük',
  NORMAL: 'Normal',
  HIGH: 'Yüksek',
  CRITICAL: 'Kritik',
}

export {}
