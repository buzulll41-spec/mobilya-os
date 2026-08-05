import { useState } from 'react'
import {
  formatCurrencyInputDisplay,
  normalizeCurrencyStorage,
  sanitizeCurrencyTyping,
} from '../lib/formatCurrencyInput.js'

/**
 * Türkçe para giriş alanı — yazarken binlik ayraç, blur'da 100.000,00 ₺.
 * value/onChange ham sayı stringi ("100000") ile çalışır.
 *
 * @param {{
 *   value: string
 *   onChange: (value: string) => void
 *   disabled?: boolean
 *   className?: string
 *   placeholder?: string
 *   integerOnly?: boolean
 *   'aria-label'?: string
 *   'aria-invalid'?: boolean
 *   id?: string
 *   name?: string
 *   required?: boolean
 * }} props
 */
export default function MosCurrencyInput({
  value,
  onChange,
  disabled = false,
  className = 'mos-input',
  placeholder = '0,00 ₺',
  integerOnly = false,
  'aria-label': ariaLabel,
  'aria-invalid': ariaInvalid,
  id,
  name,
  required = false,
}) {
  const [focused, setFocused] = useState(false)
  const display = formatCurrencyInputDisplay(value, focused)

  return (
    <input
      id={id}
      name={name}
      className={className}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      placeholder={placeholder}
      value={display}
      disabled={disabled}
      required={required}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false)
        onChange(normalizeCurrencyStorage(value, { integerOnly }))
      }}
      onChange={(e) => onChange(sanitizeCurrencyTyping(e.target.value))}
    />
  )
}
