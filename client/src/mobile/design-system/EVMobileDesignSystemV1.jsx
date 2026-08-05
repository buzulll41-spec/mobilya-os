import { IconChevronRight, IconSearch } from '../../components/Icons.jsx'
import './EVMobileDesignSystemV1.css'

const PRESS_STYLE = { transition: 'transform var(--duration-fast) var(--ease-out)' }

function toneClass(tone) {
  if (tone === 'success') return 'evds-tone-success'
  if (tone === 'warning') return 'evds-tone-warning'
  if (tone === 'danger') return 'evds-tone-danger'
  if (tone === 'primary') return 'evds-tone-primary'
  return 'evds-tone-neutral'
}

export function SafeArea({ children }) {
  return <div className="evds-safe-area">{children}</div>
}

export function Page({ stickyHeader, bottomNavigation, children, className = '' }) {
  return (
    <div className={`evds-page ${className}`.trim()}>
      {stickyHeader}
      <main className="evds-page__content">{children}</main>
      {bottomNavigation}
    </div>
  )
}

export function Section({ title, subtitle, action, actionLabel = 'Tumunu gor', children, ariaLabel }) {
  return (
    <section className="evds-section" aria-label={ariaLabel || title}>
      {(title || subtitle || action) ? (
        <header className="evds-section__head">
          <div>
            {title ? <H2>{title}</H2> : null}
            {subtitle ? <Caption>{subtitle}</Caption> : null}
          </div>
          {action ? <Button variant="secondary" size="sm" onClick={action}>{actionLabel}</Button> : null}
        </header>
      ) : null}
      {children}
    </section>
  )
}

export function StickyHeader({ children }) {
  return <header className="evds-sticky-header">{children}</header>
}

/**
 * @param {{
 *   items: Array<{ id: string, label: string, icon: import('react').ReactNode, role?: 'default' | 'create' }>,
 *   activeId?: string,
 *   onSelect?: (id: string) => void
 * }} props
 */
export function BottomNavigation({ items, activeId, onSelect }) {
  return (
    <nav className="evds-bottom-nav" aria-label="Mobile navigation">
      <ul className="evds-bottom-nav__list">
        {items.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className="evds-bottom-nav__btn evds-pressable"
              style={PRESS_STYLE}
              data-active={activeId === item.id ? 'true' : 'false'}
              data-role={item.role === 'create' ? 'create' : 'default'}
              aria-current={activeId === item.id ? 'page' : undefined}
              aria-label={item.label}
              onClick={() => onSelect?.(item.id)}
            >
              <span className="evds-bottom-nav__icon" aria-hidden>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          </li>
        ))}
      </ul>
    </nav>
  )
}

export function SearchHeader({ value, onValueChange, placeholder = 'Ara', onRefresh }) {
  return (
    <div className="evds-search-header" role="search">
      <SearchInput value={value} onValueChange={onValueChange} placeholder={placeholder} />
      {onRefresh ? <Button variant="secondary" onClick={onRefresh}>Yenile</Button> : null}
    </div>
  )
}

export function Display({ children }) {
  return <p className="evds-typography-display">{children}</p>
}

export function H1({ children }) {
  return <h1 className="evds-typography-h1">{children}</h1>
}

export function H2({ children }) {
  return <h2 className="evds-typography-h2">{children}</h2>
}

export function Body({ children }) {
  return <p className="evds-typography-body">{children}</p>
}

export function Caption({ children }) {
  return <p className="evds-typography-caption">{children}</p>
}

export function Label({ children }) {
  return <p className="evds-typography-label">{children}</p>
}

export function Badge({ label, tone = 'neutral', count }) {
  return (
    <span className={`evds-badge ${toneClass(tone)}`}>
      <span>{label}</span>
      {Number.isFinite(count) && Number(count) > 0 ? <small>{count > 99 ? '99+' : Math.round(Number(count))}</small> : null}
    </span>
  )
}

export function StatusChip({ label, tone = 'neutral', count }) {
  return <Badge label={label} tone={tone} count={count} />
}

export function ListRow({ title, subtitle, right, badge, onPress }) {
  return (
    <button type="button" className="evds-list-row evds-pressable" onClick={onPress} style={PRESS_STYLE}>
      <div className="evds-list-row__copy">
        <div className="evds-list-row__title-line">
          <strong>{title}</strong>
          {badge}
        </div>
        <p>{subtitle}</p>
      </div>
      <div>
        {right ?? <IconChevronRight aria-hidden />}
      </div>
    </button>
  )
}

export function SummaryRow({ title, summary, metricLabel = 'Durum', metricValue = '—', badge, onPress }) {
  return (
    <ListRow
      title={title}
      subtitle={summary}
      badge={badge}
      right={
        <span className="evds-summary-row__metric" aria-label={metricLabel}>
          <small>{metricLabel}</small>
          <strong>{metricValue}</strong>
        </span>
      }
      onPress={onPress}
    />
  )
}

export function TaskRow({ title, detail, stateLabel = 'Aksiyon', tone = 'primary', onPress }) {
  return (
    <ListRow
      title={title}
      subtitle={detail}
      badge={<StatusChip label={stateLabel} tone={tone} />}
      onPress={onPress}
    />
  )
}

export function ActionTile({ icon, label, tone = 'neutral', onPress }) {
  return (
    <button type="button" className="evds-action-tile evds-pressable" style={PRESS_STYLE} onClick={onPress}>
      <span className={`evds-action-tile__icon ${toneClass(tone)}`} aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

export function Button({ children, variant = 'primary', size = 'md', onClick, type = 'button' }) {
  const className = variant === 'secondary' ? 'evds-button evds-button--secondary' : variant === 'danger' ? 'evds-button evds-button--danger' : 'evds-button evds-button--primary'
  const minHeight = size === 'sm' ? 36 : 44
  return <button type={type} className={`${className} evds-pressable`} style={{ ...PRESS_STYLE, minHeight }} onClick={onClick}>{children}</button>
}

export function IconButton({ icon, label, onClick }) {
  return (
    <button type="button" className="evds-icon-button evds-pressable" style={PRESS_STYLE} onClick={onClick} aria-label={label}>
      {icon}
    </button>
  )
}

export function SearchInput({ value, onValueChange, placeholder = 'Ara' }) {
  return (
    <label className="evds-search-input" aria-label="Arama">
      <span aria-hidden>
        <IconSearch />
      </span>
      <input type="search" value={value} onChange={(event) => onValueChange?.(event.target.value)} placeholder={placeholder} />
    </label>
  )
}

export function Avatar({ initials }) {
  return <span className="evds-avatar" aria-hidden>{initials}</span>
}

export function Divider() {
  return <div className="evds-divider" aria-hidden />
}

export function EmptyState({ title, description, actionLabel = 'Yeniden dene', onAction }) {
  return (
    <div className="evds-state" role="status" aria-live="polite">
      <strong>{title}</strong>
      <p>{description}</p>
      {onAction ? <Button onClick={onAction}>{actionLabel}</Button> : null}
    </div>
  )
}

export function LoadingState({ rows = 3 }) {
  return (
    <div className="evds-section" aria-label="Yukleniyor">
      {Array.from({ length: rows }, (_, index) => <div key={`loading-${index}`} className="evds-loading-row" aria-hidden />)}
    </div>
  )
}

export function ErrorState({ title, description, onRetry }) {
  return (
    <div className="evds-state" role="alert">
      <strong>{title}</strong>
      <p>{description}</p>
      {onRetry ? <Button variant="danger" onClick={onRetry}>Tekrar dene</Button> : null}
    </div>
  )
}
