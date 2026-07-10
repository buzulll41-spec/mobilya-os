/** @typedef {{ dialCode: string, label: string, localMaxDigits: number }} PhoneCountryOption */

export const PHONE_COUNTRY_OPTIONS = /** @type {PhoneCountryOption[]} */ ([
  { dialCode: '+90', label: 'Türkiye', localMaxDigits: 11 },
  { dialCode: '+49', label: 'Almanya', localMaxDigits: 11 },
  { dialCode: '+1', label: 'ABD/Kanada', localMaxDigits: 10 },
  { dialCode: '+44', label: 'İngiltere', localMaxDigits: 10 },
  { dialCode: '+33', label: 'Fransa', localMaxDigits: 9 },
  { dialCode: '+39', label: 'İtalya', localMaxDigits: 10 },
  { dialCode: '+31', label: 'Hollanda', localMaxDigits: 9 },
  { dialCode: '+32', label: 'Belçika', localMaxDigits: 9 },
  { dialCode: '+43', label: 'Avusturya', localMaxDigits: 10 },
  { dialCode: '+41', label: 'İsviçre', localMaxDigits: 9 },
  { dialCode: '+971', label: 'BAE', localMaxDigits: 9 },
  { dialCode: '+966', label: 'Suudi Arabistan', localMaxDigits: 9 },
])

const DEFAULT_COUNTRY = PHONE_COUNTRY_OPTIONS[0]

/**
 * @param {string} raw
 * @param {number} maxDigits
 */
export function digitsOnly(raw, maxDigits) {
  return String(raw ?? '').replace(/\D/g, '').slice(0, maxDigits)
}

/**
 * TR mobil: 05XX XXX XX XX
 * @param {string} digits
 */
export function formatTrMobileDisplay(digits) {
  const d = digitsOnly(digits, 11)
  if (!d) return ''
  if (d.length <= 4) return d
  if (d.length <= 7) return `${d.slice(0, 4)} ${d.slice(4)}`
  if (d.length <= 9) return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7)}`
  return `${d.slice(0, 4)} ${d.slice(4, 7)} ${d.slice(7, 9)} ${d.slice(9)}`
}

/**
 * @param {string} dialCode
 * @param {string} localDigits
 */
function normalizeLocalForE164(dialCode, localDigits) {
  const country = phoneCountryByDialCode(dialCode)
  let local = digitsOnly(localDigits, country.localMaxDigits)
  if (country.dialCode === '+90' && local.startsWith('0')) {
    local = local.slice(1)
  }
  return local
}

/**
 * @param {string} dialCode
 * @param {string} localDigits
 */
export function toE164Phone(dialCode, localDigits) {
  const code = dialCode?.trim() || DEFAULT_COUNTRY.dialCode
  const local = normalizeLocalForE164(code, localDigits)
  if (!local) return ''
  return `${code}${local}`
}

/**
 * @param {string | undefined | null} e164
 */
export function parseE164Phone(e164) {
  const raw = String(e164 ?? '').trim()
  if (!raw.startsWith('+')) {
    return { dialCode: DEFAULT_COUNTRY.dialCode, localDigits: digitsOnly(raw, 11) }
  }
  const match = PHONE_COUNTRY_OPTIONS.map((c) => c.dialCode)
    .sort((a, b) => b.length - a.length)
    .find((code) => raw.startsWith(code))
  if (!match) return { dialCode: DEFAULT_COUNTRY.dialCode, localDigits: digitsOnly(raw.slice(1), 11) }
  let localDigits = digitsOnly(raw.slice(match.length), 15)
  if (match === '+90' && localDigits.length === 10 && !localDigits.startsWith('0')) {
    localDigits = `0${localDigits}`
  }
  return { dialCode: match, localDigits }
}

/**
 * @param {string} dialCode
 */
export function phoneCountryByDialCode(dialCode) {
  return PHONE_COUNTRY_OPTIONS.find((c) => c.dialCode === dialCode) ?? DEFAULT_COUNTRY
}

/**
 * @param {string} dialCode
 * @param {string} localDigits
 */
export function formatPhoneDisplay(dialCode, localDigits) {
  const country = phoneCountryByDialCode(dialCode)
  const digits = digitsOnly(localDigits, country.localMaxDigits)
  if (country.dialCode === '+90') return formatTrMobileDisplay(digits)
  return digits.replace(/(\d{3})(?=\d)/g, '$1 ').trim()
}

/**
 * @param {string} dialCode
 * @param {string} rawInput
 */
export function sanitizePhoneLocalInput(dialCode, rawInput) {
  const country = phoneCountryByDialCode(dialCode)
  return digitsOnly(rawInput, country.localMaxDigits)
}

/**
 * @param {string | undefined | null} e164
 */
export function formatPhoneDisplayFromE164(e164) {
  const { dialCode, localDigits } = parseE164Phone(e164)
  return formatPhoneDisplay(dialCode, localDigits)
}
