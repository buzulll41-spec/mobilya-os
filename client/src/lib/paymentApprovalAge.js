import { DEMO_TODAY } from '../data/constants.js'

/** @typedef {'normal' | 'warning' | 'critical'} PaymentApprovalAgeTier */

const MS_PER_HOUR = 3_600_000

/**
 * @param {string | undefined | null} occurredAtIso
 * @param {string | Date} [now]
 * @returns {number}
 */
export function pendingPaymentAgeHours(occurredAtIso, now = `${DEMO_TODAY}T12:00:00.000Z`) {
  if (!occurredAtIso) return 0
  const start = Date.parse(occurredAtIso)
  const end = now instanceof Date ? now.getTime() : Date.parse(now)
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return 0
  return (end - start) / MS_PER_HOUR
}

/**
 * @param {string | undefined | null} occurredAtIso
 * @param {string | Date} [now]
 * @returns {PaymentApprovalAgeTier}
 */
export function resolvePaymentApprovalAgeTier(occurredAtIso, now = `${DEMO_TODAY}T12:00:00.000Z`) {
  const hours = pendingPaymentAgeHours(occurredAtIso, now)
  if (hours >= 24) return 'critical'
  if (hours >= 2) return 'warning'
  return 'normal'
}

/**
 * @param {PaymentApprovalAgeTier} tier
 * @returns {string | null}
 */
export function paymentApprovalAgeHint(tier) {
  if (tier === 'critical') return '24 saatten uzun süredir onay bekliyor'
  if (tier === 'warning') return '2 saatten uzun süredir onay bekliyor'
  return null
}
