/**
 * FAZ 113 — mobil parmak dostu tarih alanı (native date picker).
 * @param {{
 *   label?: string
 *   value: string
 *   onChange: (value: string) => void
 *   disabled?: boolean
 *   className?: string
 *   id?: string
 *   min?: string
 *   max?: string
 *   required?: boolean
 * }} props
 */
export default function MobileDateField({
  label,
  value,
  onChange,
  disabled = false,
  className = '',
  id,
  min,
  max,
  required = false,
}) {
  return (
    <label className={`mos-mobile-date-field ${className}`.trim()}>
      {label ? <span className="mos-mobile-date-field__label">{label}</span> : null}
      <input
        id={id}
        type="date"
        className="mos-mobile-date-field__input"
        value={value}
        min={min}
        max={max}
        required={required}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value)}
      />
    </label>
  )
}
