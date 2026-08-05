/**
 * MOBILYA OS Design System V1 — ortak operasyon tablosu satırı
 *
 * @typedef {'critical' | 'warning' | 'success' | 'neutral'} ErpRowTone
 *
 * @typedef {Object} ErpOpsTableRow
 * @property {string} id
 * @property {string} orderNo
 * @property {string} customer
 * @property {string} [category]
 * @property {string} statusLabel
 * @property {string} [dateLabel]
 * @property {string} [lastActionLabel]
 * @property {string} [nextActionLabel]
 * @property {string} [actionButtonLabel]
 * @property {ErpRowTone} [tone]
 * @property {number | null} [priorityRank]
 * @property {'critical' | 'termin' | 'ssh' | 'normal'} [rowAccent]
 * @property {boolean} [isManagerCritical]
 * @property {import('../lib/pilotRecordHeuristics.js').PilotRecordKind | null} [pilotKind]
 * @property {string} [headerSummary] Tek satır kart özeti (SSH vb.)
 */

export {}
