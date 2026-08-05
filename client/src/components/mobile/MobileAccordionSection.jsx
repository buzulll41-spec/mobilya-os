/**
 * @param {{
 *   id: string
 *   label: string
 *   open: boolean
 *   onOpen: (id: string) => void
 *   children: import('react').ReactNode
 *   className?: string
 * }} props
 */
export default function MobileAccordionSection({
  id,
  label,
  open,
  onOpen,
  children,
  className = '',
}) {
  return (
    <details
      className={`mos-mobile-accordion__section ${className}`.trim()}
      open={open}
      onToggle={(event) => {
        if (event.currentTarget.open) onOpen(id)
      }}
    >
      <summary>
        <span className="mos-mobile-accordion__label">{label}</span>
        <span className="mos-mobile-accordion__chevron" aria-hidden>▾</span>
      </summary>
      <div className="mos-mobile-accordion__content">{children}</div>
    </details>
  )
}
