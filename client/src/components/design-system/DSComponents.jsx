import { useState } from 'react'
import { IconChevronRight, IconClose, IconMenu, IconSearch } from '../Icons.jsx'

function cx(...values) {
  return values.filter(Boolean).join(' ')
}

function LoadingDot() {
  return <span className="ds-loader" aria-hidden />
}

function BaseButton({
  variant = 'primary',
  block = false,
  loading = false,
  active = false,
  icon,
  iconTrailing,
  className = '',
  children,
  disabled,
  ...rest
}) {
  const isDisabled = disabled || loading
  return (
    <button
      {...rest}
      className={cx(
        'ds-button',
        `ds-button--${variant}`,
        block && 'ds-button--block',
        loading && 'ds-is-loading',
        className,
      )}
      data-active={active ? 'true' : 'false'}
      disabled={isDisabled}
      aria-busy={loading || undefined}
    >
      {loading ? <LoadingDot /> : null}
      {!loading && icon ? <span className="ds-button__icon">{icon}</span> : null}
      <span className="ds-button__label">{children}</span>
      {!loading && iconTrailing ? <span className="ds-button__icon">{iconTrailing}</span> : null}
    </button>
  )
}

export function PrimaryButton(props) {
  return <BaseButton {...props} variant="primary" />
}

export function SecondaryButton(props) {
  return <BaseButton {...props} variant="secondary" />
}

export function GhostButton(props) {
  return <BaseButton {...props} variant="ghost" />
}

export function IconButton({ label, children, active = false, className = '', ...rest }) {
  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      className={cx('ds-icon-button', className)}
      data-active={active ? 'true' : 'false'}
      aria-label={label}
    >
      {children}
    </button>
  )
}

export function TextInput({ label, hint, error, className = '', inputClassName = '', ...rest }) {
  return (
    <label className={cx('ds-field', className)}>
      {label ? <span className="ds-field__label">{label}</span> : null}
      <input {...rest} className={cx('ds-input', error && 'ds-input--danger', inputClassName)} />
      {hint ? <span className="ds-field__hint ds-caption">{hint}</span> : null}
      {error ? <span className="ds-field__error ds-caption">{error}</span> : null}
    </label>
  )
}

export function SearchInput({ className = '', inputClassName = '', action, ...rest }) {
  return (
    <label className={cx('ds-search', className)}>
      <span className="ds-search__icon" aria-hidden>
        <IconSearch />
      </span>
      <input {...rest} className={cx(inputClassName)} />
      {action ? <span className="ds-search__action">{action}</span> : null}
    </label>
  )
}

export function PasswordInput({ label, hint, error, className = '', inputClassName = '', ...rest }) {
  const [visible, setVisible] = useState(false)
  return (
    <label className={cx('ds-field', className)}>
      {label ? <span className="ds-field__label">{label}</span> : null}
      <span className={cx('ds-password', error && 'ds-password--danger')}>
        <input
          {...rest}
          type={visible ? 'text' : 'password'}
          className={cx('ds-input', 'ds-password__input', error && 'ds-input--danger', inputClassName)}
        />
        <button
          type="button"
          className="ds-password__toggle"
          onClick={() => setVisible((value) => !value)}
          aria-label={visible ? 'Şifreyi gizle' : 'Şifreyi göster'}
        >
          {visible ? 'Gizle' : 'Göster'}
        </button>
      </span>
      {hint ? <span className="ds-field__hint ds-caption">{hint}</span> : null}
      {error ? <span className="ds-field__error ds-caption">{error}</span> : null}
    </label>
  )
}

export function Card({ className = '', children, ...rest }) {
  return (
    <section {...rest} className={cx('ds-card', 'ds-card--panel', className)}>
      {children}
    </section>
  )
}

export function StatCard({ eyebrow, title, value, meta, trend, className = '', children, ...rest }) {
  return (
    <Card {...rest} className={cx('ds-card--stat', className)}>
      {eyebrow ? <p className="ds-eyebrow ds-card__eyebrow">{eyebrow}</p> : null}
      {title ? <h3 className="ds-heading-3 ds-card__title">{title}</h3> : null}
      {value ? <p className="ds-card__value ds-heading-2">{value}</p> : null}
      {meta || trend ? (
        <div className="ds-card__meta-row">
          {meta ? <span className="ds-body-small">{meta}</span> : null}
          {trend ? <Badge tone="success">{trend}</Badge> : null}
        </div>
      ) : null}
      {children}
    </Card>
  )
}

export function ActionCard({ title, body, action, icon, className = '', active = false, ...rest }) {
  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      className={cx('ds-card', 'ds-card--panel', 'ds-action-card', className)}
      data-active={active ? 'true' : 'false'}
    >
      <span className="ds-action-card__inner">
        <span className="ds-action-card__head">
          {icon ? <span className="ds-action-card__icon">{icon}</span> : null}
          <span className="ds-action-card__copy">
            <span className="ds-heading-3">{title}</span>
            {body ? <span className="ds-body-small">{body}</span> : null}
          </span>
        </span>
        <span className="ds-action-card__action">
          {action ?? <IconChevronRight />}
        </span>
      </span>
    </button>
  )
}

export function Avatar({ initials, src, alt = '', size = 'md', className = '' }) {
  const sizeClass = size === 'sm' ? 'ds-avatar--sm' : size === 'lg' ? 'ds-avatar--lg' : 'ds-avatar--md'
  return (
    <span className={cx('ds-avatar', sizeClass, className)}>
      {src ? <img src={src} alt={alt} className="ds-avatar__image" /> : <span>{initials}</span>}
    </span>
  )
}

export function Badge({ tone = 'neutral', children, className = '' }) {
  return <span className={cx('ds-badge', tone !== 'neutral' && `ds-badge--${tone}`, className)}>{children}</span>
}

export function Chip({ active = false, children, className = '', ...rest }) {
  return (
    <button {...rest} type={rest.type ?? 'button'} className={cx('ds-chip', className)} data-active={active ? 'true' : 'false'}>
      {children}
    </button>
  )
}

export function Tag({ active = false, children, className = '', ...rest }) {
  return (
    <button {...rest} type={rest.type ?? 'button'} className={cx('ds-tag', className)} data-active={active ? 'true' : 'false'}>
      {children}
    </button>
  )
}

export function Alert({ tone = 'warning', title, children, action, className = '', ...rest }) {
  return (
    <div {...rest} className={cx('ds-alert', `ds-alert--${tone}`, className)} role={rest.role ?? 'alert'}>
      {title ? <strong className="ds-alert__title">{title}</strong> : null}
      {children ? <div className="ds-alert__body ds-body-small">{children}</div> : null}
      {action ? <div className="ds-alert__action">{action}</div> : null}
    </div>
  )
}

export function Toast({ tone = 'neutral', title, children, action, className = '' }) {
  return (
    <div className={cx('ds-toast', tone !== 'neutral' && `ds-toast--${tone}`, className)} role="status" aria-live="polite">
      <div className="ds-toast__copy">
        {title ? <strong className="ds-toast__title">{title}</strong> : null}
        {children ? <span className="ds-body-small">{children}</span> : null}
      </div>
      {action ? <div className="ds-toast__action">{action}</div> : null}
    </div>
  )
}

export function Modal({ open = false, title, children, footer, className = '', onClose }) {
  if (!open) return null
  return (
    <div className="ds-modal-shell" role="presentation">
      <div className="ds-modal-backdrop" onClick={onClose} />
      <section className={cx('ds-modal', className)} role="dialog" aria-modal="true">
        <header className="ds-modal__head">
          <div>
            {title ? <h2 className="ds-heading-3 ds-modal__title">{title}</h2> : null}
          </div>
          {onClose ? (
            <IconButton label="Kapat" onClick={onClose}>
              <IconClose />
            </IconButton>
          ) : null}
        </header>
        <div className="ds-modal__body">{children}</div>
        {footer ? <footer className="ds-modal__footer">{footer}</footer> : null}
      </section>
    </div>
  )
}

export function BottomSheet({ open = false, title, children, footer, className = '', onClose }) {
  if (!open) return null
  return (
    <div className="ds-modal-shell" role="presentation">
      <div className="ds-modal-backdrop" onClick={onClose} />
      <section className={cx('ds-bottom-sheet', className)} role="dialog" aria-modal="true">
        <header className="ds-bottom-sheet__head">
          <span className="ds-bottom-sheet__handle" aria-hidden />
          {title ? <h2 className="ds-heading-3 ds-bottom-sheet__title">{title}</h2> : null}
        </header>
        <div className="ds-bottom-sheet__body">{children}</div>
        {footer ? <footer className="ds-bottom-sheet__footer">{footer}</footer> : null}
      </section>
    </div>
  )
}

export function Drawer({ open = false, side = 'right', title, children, footer, className = '', onClose }) {
  if (!open) return null
  return (
    <div className="ds-modal-shell" role="presentation">
      <div className="ds-modal-backdrop" onClick={onClose} />
      <aside className={cx('ds-drawer', `ds-drawer--${side}`, className)} role="dialog" aria-modal="true">
        <header className="ds-drawer__head">
          {title ? <h2 className="ds-heading-3 ds-drawer__title">{title}</h2> : null}
          {onClose ? (
            <IconButton label="Kapat" onClick={onClose}>
              <IconClose />
            </IconButton>
          ) : null}
        </header>
        <div className="ds-drawer__body">{children}</div>
        {footer ? <footer className="ds-drawer__footer">{footer}</footer> : null}
      </aside>
    </div>
  )
}

export function TopAppBar({ title, subtitle, leading, trailing, className = '' }) {
  return (
    <header className={cx('ds-top-bar', className)}>
      <div className="ds-top-bar__leading">
        {leading ?? (
          <IconButton label="Menü">
            <IconMenu />
          </IconButton>
        )}
        <div className="ds-top-bar__copy">
          <strong className="ds-heading-3">{title}</strong>
          {subtitle ? <span className="ds-caption">{subtitle}</span> : null}
        </div>
      </div>
      {trailing ? <div className="ds-top-bar__trailing">{trailing}</div> : null}
    </header>
  )
}

export function BottomNavigation({ items = [], activeId, className = '' }) {
  return (
    <nav className={cx('ds-bottom-nav', className)} aria-label="Alt gezinme">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          className="ds-bottom-nav__item"
          data-active={item.id === activeId ? 'true' : 'false'}
          onClick={() => item.onSelect?.(item.id)}
        >
          {item.icon ? <span className="ds-bottom-nav__icon">{item.icon}</span> : null}
          <span className="ds-caption">{item.label}</span>
        </button>
      ))}
    </nav>
  )
}

export function Sidebar({ brand, items = [], activeId, footer, className = '' }) {
  return (
    <aside className={cx('ds-sidebar', className)}>
      <div className="ds-sidebar__brand">{brand}</div>
      <nav className="ds-sidebar__nav" aria-label="Yan gezinme">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className="ds-sidebar__item"
            data-active={item.id === activeId ? 'true' : 'false'}
            onClick={() => item.onSelect?.(item.id)}
          >
            {item.icon ? <span className="ds-sidebar__item-icon">{item.icon}</span> : null}
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      {footer ? <div className="ds-sidebar__footer">{footer}</div> : null}
    </aside>
  )
}

export function ListItem({ title, body, meta, icon, action, active = false, className = '', ...rest }) {
  return (
    <button
      {...rest}
      type={rest.type ?? 'button'}
      className={cx('ds-list-item', className)}
      data-active={active ? 'true' : 'false'}
    >
      {icon ? <span className="ds-list-item__icon">{icon}</span> : null}
      <span className="ds-list-item__copy">
        <span className="ds-body-large ds-list-item__title">{title}</span>
        {body ? <span className="ds-body-small ds-list-item__body">{body}</span> : null}
      </span>
      {meta ? <span className="ds-caption ds-list-item__meta">{meta}</span> : null}
      {action ? <span className="ds-list-item__action">{action}</span> : null}
    </button>
  )
}

export function SectionHeader({ eyebrow, title, body, action, className = '' }) {
  return (
    <header className={cx('ds-section-header', className)}>
      <div className="ds-section-header__copy">
        {eyebrow ? <p className="ds-eyebrow">{eyebrow}</p> : null}
        <h2 className="ds-heading-2 ds-section-header__title">{title}</h2>
        {body ? <p className="ds-body ds-section-header__body">{body}</p> : null}
      </div>
      {action ? <div className="ds-section-header__action">{action}</div> : null}
    </header>
  )
}

export function Divider({ className = '' }) {
  return <hr className={cx('ds-divider', className)} />
}
