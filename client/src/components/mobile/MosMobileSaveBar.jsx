/**
 * FAZ 113 — mobil form alt sabit kaydet/vazgeç bar.
 * @param {{
 *   onSave?: () => void
 *   onCancel?: () => void
 *   saveLabel?: string
 *   cancelLabel?: string
 *   disabled?: boolean
 *   busy?: boolean
 *   children?: import('react').ReactNode
 * }} props
 */
export default function MosMobileSaveBar({
  onSave,
  onCancel,
  saveLabel = 'Kaydet',
  cancelLabel = 'Vazgeç',
  disabled = false,
  busy = false,
  children,
}) {
  return (
    <div className="mos-mobile-save-bar" role="toolbar" aria-label="Form işlemleri">
      {onCancel ? (
        <button type="button" className="mos-mobile-save-bar__btn mos-mobile-save-bar__btn--ghost" onClick={onCancel}>
          {cancelLabel}
        </button>
      ) : null}
      {children}
      {onSave ? (
        <button
          type="button"
          className="mos-mobile-save-bar__btn mos-mobile-save-bar__btn--primary"
          onClick={onSave}
          disabled={disabled || busy}
        >
          {busy ? 'Kaydediliyor…' : saveLabel}
        </button>
      ) : null}
    </div>
  )
}
