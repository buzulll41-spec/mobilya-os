/** YYYY-MM-DD veya null/undefined → null */
export function optionalIsoDate(d: Date | null | undefined): string | null {
  if (!d) return null
  return d.toISOString().slice(0, 10)
}

/** YYYY-MM-DD */
export function toIsoDateString(d: Date): string {
  return d.toISOString().slice(0, 10)
}

export function parseIsoDateOnly(value: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim())
  if (!m) {
    throw new Error('Invalid date')
  }
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])))
}

export function isIsoDateString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}
