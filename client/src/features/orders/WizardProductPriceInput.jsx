import MosCurrencyInput from '../../components/MosCurrencyInput.jsx'

/**
 * @param {{
 *   value: string
 *   onChange: (value: string) => void
 *   disabled?: boolean
 *   className?: string
 *   'aria-label'?: string
 *   'aria-invalid'?: boolean
 *   placeholder?: string
 * }} props
 */
export default function WizardProductPriceInput({
  value,
  onChange,
  disabled = false,
  className = 'now-pl-input',
  'aria-label': ariaLabel = 'Birim fiyat',
  'aria-invalid': ariaInvalid,
  placeholder = '0,00 ₺',
}) {
  return (
    <MosCurrencyInput
      className={className}
      value={value}
      onChange={onChange}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={ariaInvalid}
      placeholder={placeholder}
      integerOnly
    />
  )
}
