import {
  mosButtonClass,
  resolveActionButtonVariant,
} from '../lib/actionButtonVariants.js'

/** @typedef {'primary' | 'success' | 'warning' | 'danger' | 'info'} MosButtonTone */
/** @typedef {'head' | 'detail' | 'table' | 'modal' | 'inline'} MosButtonContext */

/**
 * MOBILYA OS standart aksiyon butonu (FAZ 16A).
 *
 * Ton otomatik: etiket metnine göre primary / success / warning / danger / info.
 *
 * @param {{
 *   children?: import('react').ReactNode
 *   label?: string
 *   tone?: MosButtonTone
 *   context?: MosButtonContext
 *   className?: string
 *   type?: 'button' | 'submit'
 *   disabled?: boolean
 *   title?: string
 *   onClick?: import('react').MouseEventHandler<HTMLButtonElement>
 *   onKeyDown?: import('react').KeyboardEventHandler<HTMLButtonElement>
 * }} props
 */
export default function MosButton({
  children,
  label,
  tone,
  context = 'head',
  className = '',
  type = 'button',
  disabled,
  title,
  onClick,
  onKeyDown,
  ...rest
}) {
  const text = label ?? (typeof children === 'string' ? children : '')
  const resolvedContext =
    context === 'modal' || context === 'inline' ? 'head' : context
  const cls = mosButtonClass(resolvedContext, text, tone, className)

  return (
    <button
      type={type}
      className={cls}
      disabled={disabled}
      title={title}
      onClick={onClick}
      onKeyDown={onKeyDown}
      data-mos-tone={tone ?? resolveActionButtonVariant(text)}
      {...rest}
    >
      {children ?? label}
    </button>
  )
}
