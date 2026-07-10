import { UI_STANDARDS, TOAST_EVENT } from '../constants/uiStandards.js'

/** @typedef {import('../constants/uiStandards.js').ToastPayload} ToastPayload */

/**
 * @param {ToastPayload} payload
 */
export function pushToast(payload) {
  if (typeof globalThis === 'undefined' || !globalThis.dispatchEvent) return
  globalThis.dispatchEvent(new CustomEvent(TOAST_EVENT, { detail: payload }))
}

/**
 * @param {string} message
 * @param {import('../constants/uiStandards.js').ToastTone} [tone]
 */
export function toastInfo(message, tone = 'info') {
  pushToast({ message, tone })
}

export function toastSuccess(message) {
  pushToast({ message, tone: 'success' })
}

export function toastWarning(message) {
  pushToast({ message, tone: 'warning' })
}

export function toastError(message) {
  pushToast({ message, tone: 'error', durationMs: UI_STANDARDS.toast.defaultDurationMs + 1200 })
}
