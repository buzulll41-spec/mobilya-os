import './MobileDesignSystem.css'

/**
 * @param {{
 *   value: string
 *   onChange: (next: string) => void
 *   onSubmit?: () => void
 *   placeholder?: string
 *   className?: string
 *   leadingIcon?: import('react').ReactNode
 *   trailingAction?: import('react').ReactNode
 * }} props
 */
export default function MobileSearchBar({
  value,
  onChange,
  onSubmit,
  placeholder = 'Ara',
  className = '',
  leadingIcon = '🔎',
  trailingAction = null,
}) {
  return (
    <form
      className={`mos-mobile-ds mos-mds-search ${className}`.trim()}
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit?.()
      }}
      role="search"
    >
      <span aria-hidden>{leadingIcon}</span>
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
      {trailingAction}
    </form>
  )
}
