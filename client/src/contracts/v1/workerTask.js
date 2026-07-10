/**
 * Digital Workforce — görev varlığı (FAZ 23A).
 *
 * @typedef {import('./digitalWorker.js').WorkerTaskStatus} WorkerTaskStatus
 * @typedef {import('./digitalWorker.js').WorkerPriorityLevel} WorkerPriorityLevel
 *
 * @typedef {Object} WorkerTask
 * @property {string} id
 * @property {string} workerId
 * @property {string} title
 * @property {string} description
 * @property {WorkerPriorityLevel} priority
 * @property {WorkerTaskStatus} status
 * @property {string | null} sourceModule
 * @property {string | null} targetModule
 * @property {string | null} relatedEntityId
 * @property {string} createdAt ISO instant
 * @property {string | null} startedAt ISO instant
 * @property {string | null} finishedAt ISO instant
 * @property {string | null} result
 * @property {string | null} [createdBy]
 * @property {string | null} [relatedModule] geri uyumluluk
 * @property {string | null} [completedAt] geri uyumluluk → finishedAt
 *
 * @typedef {WorkerTask & {
 *   durationMs: number
 *   durationLabel: string
 * }} WorkerTaskHistoryEntry
 *
 * @typedef {Object} WorkerPerformanceMetrics
 * @property {string} workerId
 * @property {number} totalTasks
 * @property {number} successfulTasks
 * @property {number} failedTasks
 * @property {number} averageDurationMs
 * @property {string} averageDurationLabel
 * @property {number} successRate 0-100
 */

export {}
