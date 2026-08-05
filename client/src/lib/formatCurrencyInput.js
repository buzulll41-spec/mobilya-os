/**
 * Para giriş alanları — Türkçe format: 1.234.567,89 ₺
 * UI formatlı gösterir; depolama / API ham sayıdır.
 */

/**
 * @param {string | number | null | undefined} value
 * @returns {number}
 */
export function parseCurrencyInput(value) {
  if (value == null || value === '') return Number.NaN
  const s = String(value).replace(/\s/g, '').replace(/₺/gi, '').trim()
  if (!s) return Number.NaN

  if (s.includes(',')) {
    const normalized = s.replace(/\./g, '').replace(',', '.')
    const n = Number(normalized)
    return Number.isFinite(n) ? n : Number.NaN
  }

  if (s.includes('.')) {
    const parts = s.split('.')
    if (parts.length === 2 && parts[1].length > 0 && parts[1].length <= 2) {
      const n = Number(s)
      if (Number.isFinite(n)) return n
    }
    const stripped = s.replace(/\./g, '')
    const n = Number(stripped)
    return Number.isFinite(n) ? n : Number.NaN
  }

  const n = Number(s)
  return Number.isFinite(n) ? n : Number.NaN
}

/**
 * Yazarken binlik ayraç (ondalık / sembol yok).
 * @param {string} storage Ham depolama ("100000" veya "100000,5")
 */
export function formatCurrencyInputTyping(storage) {
  const raw = String(storage ?? '').trim()
  if (!raw) return ''

  const commaIdx = raw.indexOf(',')
  const intRaw = commaIdx >= 0 ? raw.slice(0, commaIdx) : raw
  const decRaw = commaIdx >= 0 ? raw.slice(commaIdx + 1) : undefined
  const digits = intRaw.replace(/\D/g, '')

  if (!digits && decRaw === undefined) return ''
  if (!digits && decRaw !== undefined) {
    const dec = decRaw.replace(/\D/g, '').slice(0, 2)
    return dec.length ? `0,${dec}` : '0,'
  }

  const intFormatted = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 }).format(
    Number(digits),
  )

  if (decRaw !== undefined) {
    const dec = decRaw.replace(/\D/g, '').slice(0, 2)
    return `${intFormatted},${dec}`
  }
  return intFormatted
}

/**
 * Tam format — blur / salt okunur gösterim.
 * @param {string | number | null | undefined} value
 * @param {{ symbol?: boolean, decimals?: number }} [opts]
 */
export function formatCurrencyInput(value, opts = {}) {
  const { symbol = true, decimals = 2 } = opts
  const n = typeof value === 'number' ? value : parseCurrencyInput(value)
  if (!Number.isFinite(n)) return ''
  const formatted = new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(n)
  return symbol ? `${formatted} ₺` : formatted
}

/**
 * Kullanıcı girişini ham depolama stringine çevirir.
 * @param {string} raw
 */
export function sanitizeCurrencyTyping(raw) {
  let s = String(raw).replace(/[^\d,]/g, '')
  const commaIdx = s.indexOf(',')
  if (commaIdx >= 0) {
    const intPart = s.slice(0, commaIdx).replace(/,/g, '')
    const decPart = s.slice(commaIdx + 1).replace(/,/g, '').slice(0, 2)
    return decPart.length > 0 ? `${intPart},${decPart}` : `${intPart},`
  }
  return s.replace(/,/g, '')
}

/**
 * Blur sonrası ham depolama (API / state).
 * @param {string} storage
 * @param {{ integerOnly?: boolean }} [opts]
 */
export function normalizeCurrencyStorage(storage, opts = {}) {
  const n = parseCurrencyInput(storage)
  if (!Number.isFinite(n) || n < 0) return ''
  const rounded = opts.integerOnly ? Math.round(n) : Math.round(n * 100) / 100
  if (Number.isInteger(rounded)) return String(rounded)
  return String(rounded)
}

/**
 * Input görüntü değeri.
 * @param {string} storage
 * @param {boolean} focused
 */
export function formatCurrencyInputDisplay(storage, focused) {
  if (focused) return formatCurrencyInputTyping(storage)
  if (!String(storage ?? '').trim()) return ''
  return formatCurrencyInput(storage)
}
