export type Money = { amount: string; currency: string }

export function moneyToNumber(m: Money): number {
  const n = Number.parseFloat(m.amount)
  return Number.isFinite(n) ? n : 0
}

export function numberToMoney(value: number, currency: string): Money {
  return { amount: value.toFixed(2), currency }
}

export function decimalToNumber(v: unknown): number {
  if (v == null) return 0
  if (typeof v === 'number') return v
  const s = typeof v === 'object' && v !== null && 'toString' in v ? (v as { toString(): string }).toString() : String(v)
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
