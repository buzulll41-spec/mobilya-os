/**
 * @param {{
 *   title: string
 *   icon: string
 *   summary: string
 *   pendingCount: number
 *   criticalCount: number
 *   lastActionLabel: string
 *   children?: import('react').ReactNode
 *   onClick?: () => void
 *   ariaLabel?: string
 * }} props
 */
export default function MobileCardShell({
  title,
  icon,
  summary,
  pendingCount,
  criticalCount,
  lastActionLabel,
  children,
  onClick,
  ariaLabel,
}) {
  const body = (
    <>
      <div className="mos-mobile-card-shell__head">
        <span className="mos-mobile-card-shell__icon" aria-hidden>{icon}</span>
        <strong className="mos-mobile-card-shell__title">{title}</strong>
      </div>
      <p className="mos-mobile-card-shell__summary">{summary}</p>
      <div className="mos-mobile-card-shell__meta">
        <span>Bekleyen: <strong>{pendingCount}</strong></span>
        <span>Kritik: <strong>{criticalCount}</strong></span>
        <span>Son işlem: <strong>{lastActionLabel}</strong></span>
      </div>
      {children}
    </>
  )

  if (!onClick) {
    return <article className="mos-mobile-card-shell" aria-label={ariaLabel}>{body}</article>
  }

  return (
    <button type="button" className="mos-mobile-card-shell mos-mobile-card-shell--button" onClick={onClick} aria-label={ariaLabel}>
      {body}
    </button>
  )
}
