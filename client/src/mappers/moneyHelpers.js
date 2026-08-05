/** @param {import('../contracts/v1/money.js').Money | null | undefined} m */
export function moneyToNumber(m) {
  if (!m || typeof m !== 'object' || m.amount == null) return 0
  const n = Number.parseFloat(String(m.amount))
  return Number.isFinite(n) ? n : 0
}

/**
 * @param {number} value
 * @param {string} currency
 * @returns {import('../contracts/v1/money.js').Money}
 */
export function numberToMoney(value, currency) {
  return {
    amount: value.toFixed(2),
    currency,
  }
}
