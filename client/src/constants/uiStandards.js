/** FAZ 111 Sprint 2 — UI standart sözleşmeleri (yeni modül değil). */

/** @typedef {'info' | 'success' | 'warning' | 'error'} ToastTone */

/** @typedef {'table' | 'block' | 'card-grid' | 'inline'} SkeletonVariant */

/** @typedef {'default' | 'search' | 'table' | 'dashboard'} EmptyStatePreset */

export const UI_STANDARDS = {
  skeleton: {
    minDurationMs: 200,
    tableDefaultRows: 5,
    tableDefaultCols: 4,
    cardGridDefaultCount: 4,
  },
  toast: {
    defaultDurationMs: 4200,
    maxVisible: 4,
  },
  emptyState: {
    presets: /** @type {EmptyStatePreset[]} */ (['default', 'search', 'table', 'dashboard']),
  },
}

export const TOAST_EVENT = 'mobilya:toast'

/**
 * @typedef {Object} ToastPayload
 * @property {string} message
 * @property {ToastTone} [tone]
 * @property {number} [durationMs]
 */

export {}
