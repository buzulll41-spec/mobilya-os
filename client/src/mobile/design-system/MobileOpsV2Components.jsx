import { IconBell, IconChevronRight, IconClose, IconDashboard, IconMenu, IconOrders, IconPlus, IconSearch, IconUsers } from '../../components/Icons.jsx'

const PRESS_STYLE = { transition: 'transform var(--evm-v2-motion-base) var(--evm-v2-motion-ease)' }

function stateAttrs({
  theme = 'light',
  selected = false,
  loading = false,
  pressed = false,
  hovered = false,
}) {
  return {
    'data-theme': theme,
    'data-selected': selected ? 'true' : 'false',
    'data-loading': loading ? 'true' : 'false',
    'data-pressed': pressed ? 'true' : 'false',
    'data-hovered': hovered ? 'true' : 'false',
  }
}

/** @param {{ label: string, tone?: 'blue' | 'green' | 'orange' | 'red' | 'gray', count?: number, theme?: 'light' | 'dark', selected?: boolean, loading?: boolean, pressed?: boolean, hovered?: boolean, className?: string }} props */
export function StatusBadge({ label, tone = 'gray', count, theme = 'light', selected = false, loading = false, pressed = false, hovered = false, className = '' }) {
  return (
    <span className={`evm-v2-badge evm-v2-badge--${tone} ${className}`.trim()} {...stateAttrs({ theme, selected, loading, pressed, hovered })}>
      <span>{label}</span>
      {Number.isFinite(count) && Number(count) > 0 ? <small>{count > 99 ? '99+' : Math.round(Number(count))}</small> : null}
    </span>
  )
}

export const Badge = StatusBadge
export const MetricBadge = StatusBadge
export const PriorityBadge = StatusBadge

/** @param {{ title: string, subtitle?: string, onAction?: () => void, actionLabel?: string, theme?: 'light' | 'dark', selected?: boolean, loading?: boolean, pressed?: boolean, hovered?: boolean }} props */
export function SectionHeader({ title, subtitle, onAction, actionLabel = 'Tumunu gor', theme = 'light', selected = false, loading = false, pressed = false, hovered = false }) {
  return (
    <header className="evm-v2-section-head" {...stateAttrs({ theme, selected, loading, pressed, hovered })}>
      <div className="evm-v2-section-head__copy">
        <h2>{title}</h2>
        {subtitle ? <p>{subtitle}</p> : null}
      </div>
      {onAction ? (
        <button type="button" className="evm-v2-link-btn evm-v2-pressable" onClick={onAction} style={PRESS_STYLE}>
          {actionLabel}
        </button>
      ) : null}
    </header>
  )
}

export function SectionTitle(props) {
  return <SectionHeader {...props} />
}

/** @param {{ value: string, onValueChange?: (v: string) => void, placeholder?: string, onRefresh?: () => void, loading?: boolean, clearLabel?: string }} props */
export function SearchHeader({
  value,
  onValueChange,
  placeholder = 'Musteri, telefon veya siparis no ara',
  onRefresh,
  loading = false,
  clearLabel = 'Aramayi temizle',
  theme = 'light',
  selected = false,
  pressed = false,
  hovered = false,
}) {
  const hasValue = String(value ?? '').length > 0
  return (
    <div className="evm-v2-search-head" role="search" {...stateAttrs({ theme, selected, loading, pressed, hovered })}>
      <label className="evm-v2-search-head__field" aria-label="Arama">
        <span className="evm-v2-search-head__icon" aria-hidden>
          <IconSearch />
        </span>
        <input value={value} onChange={(event) => onValueChange?.(event.target.value)} placeholder={placeholder} type="search" />
        {hasValue ? (
          <button
            type="button"
            className="evm-v2-search-head__clear evm-v2-pressable"
            aria-label={clearLabel}
            onClick={() => onValueChange?.('')}
            style={PRESS_STYLE}
          >
            <IconClose />
          </button>
        ) : null}
      </label>
      <div className="evm-v2-search-head__actions" aria-live="polite">
        {loading ? <small className="evm-v2-search-head__loading">Yukleniyor</small> : null}
        {onRefresh ? (
          <button type="button" className="evm-v2-search-head__icon-btn evm-v2-pressable" onClick={onRefresh} style={PRESS_STYLE} aria-label="Listeyi yenile">
            ↻
          </button>
        ) : null}
      </div>
    </div>
  )
}

export function SearchBar(props) {
  return <SearchHeader {...props} />
}

export function PrimarySearch(props) {
  return <SearchBar {...props} />
}

export function SearchField(props) {
  return <SearchHeader {...props} />
}

/** @param {{ initials?: string, label?: string, theme?: 'light' | 'dark', selected?: boolean, loading?: boolean, pressed?: boolean, hovered?: boolean, className?: string }} props */
export function Avatar({ initials = 'MO', label = 'Profil', theme = 'light', selected = false, loading = false, pressed = false, hovered = false, className = '' }) {
  return <span className={`evm-v2-avatar ${className}`.trim()} aria-label={label} {...stateAttrs({ theme, selected, loading, pressed, hovered })}>{initials}</span>
}

/** @param {{ count?: number }} props */
export function ChipBadge({ count = 0 }) {
  return <small className="evm-v2-chip-badge">{count > 99 ? '99+' : Math.max(0, Math.round(count))}</small>
}

/** @param {{ icon: import('react').ReactNode, label: string, badgeCount?: number, onPress?: () => void, theme?: 'light' | 'dark', selected?: boolean, loading?: boolean, pressed?: boolean, hovered?: boolean, disabled?: boolean, className?: string }} props */
export function ActionIcon({ icon, label, badgeCount = 0, onPress, theme = 'light', selected = false, loading = false, pressed = false, hovered = false, disabled = false, className = '' }) {
  return (
    <button type="button" className={`evm-v2-action-icon evm-v2-pressable ${className}`.trim()} onClick={onPress} style={PRESS_STYLE} aria-label={label} disabled={disabled} {...stateAttrs({ theme, selected, loading, pressed, hovered })}>
      {icon}
      {badgeCount > 0 ? <span className="evm-v2-action-icon__badge">{badgeCount > 99 ? '99+' : badgeCount}</span> : null}
    </button>
  )
}

export function NotificationButton({ badgeCount = 0, onPress, ...rest }) {
  return <ActionIcon icon={<IconBell />} label="Bildirimler ve menu" badgeCount={badgeCount} onPress={onPress} {...rest} />
}

/** @param {{ title: string, subtitle?: string, eyebrow?: string, meta?: string, unreadCount?: number, initials?: string, onOpenMenu?: () => void, aside?: import('react').ReactNode }} props */
export function ScreenHeader({ title, subtitle, eyebrow, meta, unreadCount = 0, initials, onOpenMenu, aside }) {
  const actionNode = aside ?? (initials ? (
    <div className="evm-v2-screen-head__actions">
      <button type="button" className="evm-v2-screen-head__notify evm-v2-pressable" onClick={onOpenMenu} style={PRESS_STYLE} aria-label="Bildirimler ve menu">
        <IconBell />
        {unreadCount > 0 ? <span className="evm-v2-screen-head__notify-badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
      </button>
      <button type="button" className="evm-v2-screen-head__profile evm-v2-pressable" onClick={onOpenMenu} style={PRESS_STYLE} aria-label="Profil">
        {initials}
      </button>
    </div>
  ) : null)

  return (
    <header className="evm-v2-screen-head">
      <div className="evm-v2-screen-head__identity">
        {eyebrow ? <p className="evm-v2-screen-head__eyebrow">{eyebrow}</p> : null}
        <h1>{title}</h1>
        {subtitle ? <p>{subtitle}</p> : null}
        {meta ? <p className="evm-v2-screen-head__meta">{meta}</p> : null}
      </div>
      {actionNode ? <div className="evm-v2-screen-head__aside">{actionNode}</div> : null}
    </header>
  )
}

export function AppHeader(props) {
  return <ScreenHeader {...props} />
}

export function UserHeader(props) {
  return <AppHeader {...props} />
}

/** @param {{ items: Array<{ id: string, label: string, count?: number }>, activeId: string, onSelect?: (id: string) => void, ariaLabel?: string }} props */
export function FilterChips({ items, activeId, onSelect, ariaLabel = 'Filtreler' }) {
  return (
    <div className="evm-v2-chip-bar" role="tablist" aria-label={ariaLabel}>
      {items.map((item) => {
        const active = item.id === activeId
        return (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={active}
            className={`evm-v2-chip${active ? ' is-active' : ''}`}
            onClick={() => onSelect?.(item.id)}
          >
            <span>{item.label}</span>
            {Number.isFinite(item.count) ? <small>{Math.round(Number(item.count))}</small> : null}
          </button>
        )
      })}
    </div>
  )
}

export function SegmentFilter(props) {
  return <FilterChips {...props} />
}

/** @param {{ children?: import('react').ReactNode }} props */
export function SafeArea({ children }) {
  return <div className="evm-v2-safe-area">{children}</div>
}

export function AppShell(props) {
  return <MobileScreenShell {...props} />
}

/** @param {{
 *  title: string,
 *  subtitle: string,
 *  metaLeft?: string,
 *  metaRight?: string,
 *  badge?: import('react').ReactNode,
 *  trailing?: import('react').ReactNode,
 *  className?: string,
 *  onPress?: () => void,
 *  style?: import('react').CSSProperties,
 *  buttonProps?: import('react').ButtonHTMLAttributes<HTMLButtonElement>,
 * }} props */
export function PrimaryListRow({
  title,
  subtitle,
  metaLeft,
  metaRight,
  badge,
  trailing,
  className = '',
  onPress,
  style,
  buttonProps,
}) {
  const ariaLabel =
    buttonProps?.['aria-label'] ??
    `${title}${subtitle ? `, ${subtitle}` : ''}${metaRight ? `, ${metaRight}` : ''}`

  return (
    <button
      type="button"
      className={`evm-v2-primary-row evm-v2-pressable ${className}`.trim()}
      onClick={onPress}
      aria-label={ariaLabel}
      style={{ ...PRESS_STYLE, ...style }}
      {...buttonProps}
    >
      <div className="evm-v2-primary-row__copy">
        <div className="evm-v2-primary-row__title-line">
          <strong>{title}</strong>
          {badge}
        </div>
        <p className="evm-v2-primary-row__subtitle">{subtitle}</p>
        {(metaLeft || metaRight) ? (
          <div className="evm-v2-primary-row__meta">
            <span>{metaLeft}</span>
            <span>{metaRight}</span>
          </div>
        ) : null}
      </div>
      <div className="evm-v2-primary-row__right">
        {trailing ?? (
          <span className="evm-v2-primary-row__chevron" aria-hidden>
            <IconChevronRight />
          </span>
        )}
      </div>
    </button>
  )
}

export function PrimaryListItem(props) {
  return <PrimaryListRow {...props} />
}

/** @param {{
 *  title: string,
 *  subtitle: string,
 *  priority: string,
 *  priorityTone?: 'blue' | 'green' | 'orange' | 'red' | 'gray',
 *  relatedPerson?: string,
 *  amountLabel?: string | null,
 *  dueDateLabel?: string | null,
 *  onPress?: () => void,
 *  buttonProps?: import('react').ButtonHTMLAttributes<HTMLButtonElement>,
 * }} props */
export function PrimaryActionCard({
  title,
  subtitle,
  priority,
  priorityTone = 'blue',
  relatedPerson = 'Atama bekliyor',
  amountLabel = null,
  dueDateLabel = null,
  onPress,
  buttonProps,
}) {
  return (
    <button
      type="button"
      className="evm-v2-action-card evm-v2-pressable"
      onClick={onPress}
      style={PRESS_STYLE}
      {...buttonProps}
    >
      <div className="evm-v2-action-card__head">
        <Badge label={priority} tone={priorityTone} />
        <div className="evm-v2-action-card__head-right">
          <span className="evm-v2-action-card__due" aria-label="Son tarih">
            {dueDateLabel || 'Plan'}
          </span>
          <span className="evm-v2-action-card__chevron" aria-hidden>
            <IconChevronRight />
          </span>
        </div>
      </div>
      <strong className="evm-v2-action-card__title">{title}</strong>
      <p className="evm-v2-action-card__subtitle">{subtitle}</p>
      <dl className="evm-v2-action-card__meta" aria-label="Operasyon ozeti">
        <div>
          <dt>Ilgili Kisi</dt>
          <dd>{relatedPerson || 'Atama bekliyor'}</dd>
        </div>
        {amountLabel ? (
          <div>
            <dt>Tutar</dt>
            <dd>{amountLabel}</dd>
          </div>
        ) : null}
      </dl>
    </button>
  )
}

export function OperationCard(props) {
  return <PrimaryActionCard {...props} />
}

export function SecondaryListItem(props) {
  return <ListRow {...props} />
}

export function ListItem(props) {
  return <PrimaryListItem {...props} />
}

export function ChevronRow(props) {
  return <ListRow {...props} />
}

/** @param {{ actionsLeft?: import('react').ReactNode, actionsRight?: import('react').ReactNode, children?: import('react').ReactNode }} props */
export function SwipeListItem({ actionsLeft, actionsRight, children }) {
  return (
    <div className="evm-v2-swipe-item">
      {actionsLeft ? <div className="evm-v2-swipe-item__side is-left">{actionsLeft}</div> : null}
      <div className="evm-v2-swipe-item__body">{children}</div>
      {actionsRight ? <div className="evm-v2-swipe-item__side is-right">{actionsRight}</div> : null}
    </div>
  )
}

/** @param {{ title?: string, children?: import('react').ReactNode }} props */
export function PrimaryCard({ title, children }) {
  return (
    <article className="evm-v2-card evm-v2-card--primary">
      {title ? <strong className="evm-v2-card__title">{title}</strong> : null}
      {children}
    </article>
  )
}

export function CardSurface(props) {
  return <PrimaryCard {...props} />
}

/** @param {{ title: string, value: string, detail?: string }} props */
export function MetricCard({ title, value, detail }) {
  return (
    <article className="evm-v2-card evm-v2-card--metric">
      <span className="evm-v2-card__eyebrow">{title}</span>
      <strong className="evm-v2-card__metric">{value}</strong>
      {detail ? <p className="evm-v2-card__detail">{detail}</p> : null}
    </article>
  )
}

/** @param {{ label: string, value: string, tone?: 'blue' | 'green' | 'orange' | 'red' | 'gray', onPress?: () => void }} props */
export function MetricRow({ label, value, tone = 'gray', onPress }) {
  return (
    <button type="button" className="evm-v2-metric-row evm-v2-pressable" onClick={onPress} style={PRESS_STYLE}>
      <span>{label}</span>
      <strong className={`evm-v2-metric-row__value evm-v2-metric-row__value--${tone}`}>{value}</strong>
    </button>
  )
}

/** @param {{ title?: string, description?: string }} props */
export function SectionDescription({ title, description }) {
  return (
    <div className="evm-v2-section-description">
      {title ? <strong>{title}</strong> : null}
      {description ? <p>{description}</p> : null}
    </div>
  )
}

/** @param {{ title: string, description: string, actionLabel?: string, onAction?: () => void }} props */
export function ErrorCard({ title, description, actionLabel = 'Tekrar dene', onAction }) {
  return (
    <div className="evm-v2-error-card" role="alert">
      <div className="evm-v2-error-card__copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {onAction ? <button type="button" className="evm-v2-error-card__action" onClick={onAction}>{actionLabel}</button> : null}
    </div>
  )
}

export function ErrorState(props) {
  return <ErrorCard {...props} />
}

/** @param {{ title: string, description: string, actionLabel?: string, onAction?: () => void }} props */
export function OfflineState({ title, description, actionLabel = 'Senkronize et', onAction }) {
  return (
    <div className="evm-v2-offline-card" role="status">
      <div className="evm-v2-error-card__copy">
        <strong>{title}</strong>
        <p>{description}</p>
      </div>
      {onAction ? <button type="button" className="evm-v2-error-card__action" onClick={onAction}>{actionLabel}</button> : null}
    </div>
  )
}

/** @param {import('react').ButtonHTMLAttributes<HTMLButtonElement>} props */
export function PrimaryButton({ className = '', ...props }) {
  return <button type="button" className={`evm-v2-btn evm-v2-btn--primary ${className}`.trim()} {...props} />
}

/** @param {import('react').ButtonHTMLAttributes<HTMLButtonElement>} props */
export function SecondaryButton({ className = '', ...props }) {
  return <button type="button" className={`evm-v2-btn evm-v2-btn--secondary ${className}`.trim()} {...props} />
}

export function ListDivider() {
  return <div className="evm-v2-list-divider" aria-hidden />
}

/** @param {{ children?: import('react').ReactNode }} props */
export function ActionRow({ children, theme = 'light', selected = false, loading = false, pressed = false, hovered = false, className = '' }) {
  return <div className={`evm-v2-inline-actions ${className}`.trim()} {...stateAttrs({ theme, selected, loading, pressed, hovered })}>{children}</div>
}

/** @param {{ label: string, icon?: import('react').ReactNode, onPress?: () => void, ariaLabel?: string }} props */
export function FloatingActionButton({ label, icon, onPress, ariaLabel }) {
  return (
    <button type="button" className="evm-v2-fab evm-v2-pressable" onClick={onPress} style={PRESS_STYLE} aria-label={ariaLabel ?? label}>
      <span className="evm-v2-fab__icon" aria-hidden>{icon ?? '+'}</span>
      <small>{label}</small>
    </button>
  )
}

/** @param {{
 *  className?: string,
 *  header?: import('react').ReactNode,
 *  search?: import('react').ReactNode,
 *  filter?: import('react').ReactNode,
 *  primary?: import('react').ReactNode,
 *  secondary?: import('react').ReactNode,
 *  fab?: import('react').ReactNode,
 *  children?: import('react').ReactNode,
 * }} props */
export function MobileScreenShell({ className = '', header, search, filter, primary, secondary, fab, children }) {
  return (
    <section className={`evm-v2-screen-shell ${className}`.trim()}>
      {header ? <div className="evm-v2-screen-shell__header">{header}</div> : null}
      {search ? <div className="evm-v2-screen-shell__search">{search}</div> : null}
      {filter ? <div className="evm-v2-screen-shell__filter">{filter}</div> : null}
      {primary ? <div className="evm-v2-screen-shell__primary">{primary}</div> : null}
      {secondary ? <div className="evm-v2-screen-shell__secondary">{secondary}</div> : null}
      {children}
      {fab}
    </section>
  )
}

/** @param {{ rows?: number }} props */
export function ListSkeletonRows({ rows = 6 }) {
  return (
    <div className="evm-v2-list-skeleton" aria-hidden>
      {Array.from({ length: rows }, (_, index) => (
        <div key={`evm-v2-sk-${index}`} className="evm-v2-list-skeleton__row" />
      ))}
    </div>
  )
}

export function LoadingSkeleton(props) {
  return <ListSkeletonRows {...props} />
}

export function Skeleton(props) {
  return <LoadingSkeleton {...props} />
}

/** @param {{ visible: boolean, label?: string }} props */
export function LoadingOverlay({ visible, label = 'Yukleniyor' }) {
  if (!visible) return null
  return <div className="evm-v2-loading-overlay" role="status" aria-live="polite">{label}</div>
}

/** @param {{ message?: string }} props */
export function Toast({ message = 'Bilgi guncellendi', theme = 'light', selected = false, loading = false, pressed = false, hovered = false }) {
  return <div className="evm-v2-toast" role="status" {...stateAttrs({ theme, selected, loading, pressed, hovered })}>{message}</div>
}

/** @param {{ open: boolean, title?: string, onClose?: () => void, children?: import('react').ReactNode }} props */
export function BottomSheet({ open, title, onClose, children, theme = 'light', selected = false, loading = false, pressed = false, hovered = false }) {
  if (!open) return null
  return (
    <div className="evm-v2-sheet-backdrop" role="presentation" onClick={() => onClose?.()}>
      <div className="evm-v2-sheet" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} {...stateAttrs({ theme, selected, loading, pressed, hovered })}>
        <span className="evm-v2-sheet__handle" aria-hidden />
        <div className="evm-v2-sheet__head">
          {title ? <strong className="evm-v2-sheet__title">{title}</strong> : null}
          {onClose ? (
            <button type="button" className="evm-v2-sheet__close evm-v2-pressable" aria-label="Kapat" onClick={() => onClose()} style={PRESS_STYLE}>
              <IconClose />
            </button>
          ) : null}
        </div>
        {children}
      </div>
    </div>
  )
}

/** @param {{ open: boolean, title?: string, children?: import('react').ReactNode }} props */
export function Modal({ open, title, children }) {
  if (!open) return null
  return (
    <div className="evm-v2-modal" role="dialog" aria-modal="true">
      <div className="evm-v2-modal__surface">
        {title ? <strong className="evm-v2-sheet__title">{title}</strong> : null}
        {children}
      </div>
    </div>
  )
}

/** @param {{ open: boolean, title: string, description: string, onConfirm?: () => void, onCancel?: () => void }} props */
export function ConfirmationDialog({ open, title, description, onConfirm, onCancel }) {
  return (
    <Modal open={open} title={title}>
      <p className="evm-v2-card__detail">{description}</p>
      <ActionRow>
        <SecondaryButton onClick={onCancel}>Vazgec</SecondaryButton>
        <PrimaryButton onClick={onConfirm}>Onayla</PrimaryButton>
      </ActionRow>
    </Modal>
  )
}

export function ConfirmDialog(props) {
  return <ConfirmationDialog {...props} />
}

/** @param {{ label: string, children?: import('react').ReactNode }} props */
export function FormField({ label, children }) {
  return (
    <label className="evm-v2-form-field">
      <span>{label}</span>
      {children}
    </label>
  )
}

/** @param {import('react').SelectHTMLAttributes<HTMLSelectElement> & { label?: string }} props */
export function Dropdown({ label, children, ...props }) {
  const node = <select className="evm-v2-input" {...props}>{children}</select>
  return label ? <FormField label={label}>{node}</FormField> : node
}

/** @param {import('react').InputHTMLAttributes<HTMLInputElement> & { label?: string }} props */
export function DatePicker({ label, ...props }) {
  const node = <input type="date" className="evm-v2-input" {...props} />
  return label ? <FormField label={label}>{node}</FormField> : node
}

/** @param {{ items: Array<{ id: string, label: string }>, activeId: string, onSelect?: (id: string) => void }} props */
export function Tabs({ items, activeId, onSelect }) {
  return (
    <div className="evm-v2-tabs" role="tablist">
      {items.map((item) => (
        <button key={item.id} type="button" role="tab" aria-selected={item.id === activeId} className={`evm-v2-tab${item.id === activeId ? ' is-active' : ''}`} onClick={() => onSelect?.(item.id)}>
          {item.label}
        </button>
      ))}
    </div>
  )
}

/** @param {{ value: number }} props */
export function ProgressBar({ value }) {
  const safe = Math.max(0, Math.min(100, Math.round(value)))
  return <div className="evm-v2-progress" aria-label={`Ilerleme ${safe}%`}><span style={{ width: `${safe}%` }} /></div>
}

export const StatusPill = Badge

/** @param {{
 *   page: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'ssh' | 'warehouse' | 'reports'
 *   onNavigate: (page: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'ssh' | 'warehouse' | 'reports') => void
 *   onPrimaryAction?: () => void
 * }} props */
export function BottomNavigation({ page, onNavigate, onPrimaryAction }) {
  const items = [
    { id: 'home', label: 'Ana Sayfa', icon: IconDashboard, action: 'home' },
    { id: 'orders', label: 'Siparişler', icon: IconOrders, action: 'orders' },
    { id: 'create', label: '', icon: IconPlus, action: 'create' },
    { id: 'customers', label: 'Müşteriler', icon: IconUsers, action: 'customers' },
    { id: 'menu', label: 'Menü', icon: IconMenu, action: 'menu' },
  ]

  return (
    <nav className="mos-mobile-tabbar mos-mobile-tabbar--faz112" aria-label="Mobile navigation">
      <ul className="mos-mobile-tabbar__list">
        {items.map((item) => {
          const Icon = item.icon
          const ordersScopeActive =
            page === 'orders' || page === 'collection' || page === 'shipment' || page === 'service' || page === 'reports'
          const active =
            item.id === 'home'
              ? page === 'home'
              : item.id === 'orders'
                ? ordersScopeActive || page === 'ssh'
                : item.id === 'customers'
                  ? page === 'customers'
                  : item.id === 'menu'
                    ? page === 'menu'
                    : false
          return (
            <li key={item.id} className={`mos-mobile-tabbar__item ${item.action === 'create' ? 'mos-mobile-tabbar__item--create' : ''}`}>
              <button
                type="button"
                className="mos-mobile-tabbar__btn"
                data-active={active ? 'true' : 'false'}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label || 'Create'}
                onClick={() => {
                  if (item.action === 'home') onNavigate('home')
                  if (item.action === 'orders') onNavigate('orders')
                  if (item.action === 'customers') onNavigate('customers')
                  if (item.action === 'menu') onNavigate('menu')
                  if (item.action === 'create') onPrimaryAction?.()
                }}
              >
                <span className="mos-mobile-tabbar__icon" aria-hidden>
                  <Icon />
                </span>
                <span className="mos-mobile-tabbar__label">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** @param {{ title: string, value: string, subtitle: string, badge?: import('react').ReactNode, onPress?: () => void }} props */
export function SummaryCard({ title, value, subtitle, badge, onPress }) {
  const body = (
    <>
      <div className="evm-v2-summary__head">
        <strong>{title}</strong>
        {badge}
      </div>
      <p className="evm-v2-summary__value">{value}</p>
      <p className="evm-v2-summary__sub">{subtitle}</p>
    </>
  )

  if (!onPress) return <article className="evm-v2-summary">{body}</article>

  return (
    <button type="button" className="evm-v2-summary evm-v2-summary--btn evm-v2-pressable" onClick={onPress} style={PRESS_STYLE}>
      {body}
    </button>
  )
}

/** @param {{ icon: import('react').ReactNode, label: string, tone?: 'blue' | 'green' | 'orange' | 'red', onPress?: () => void }} props */
export function ActionTile({ icon, label, tone = 'blue', onPress }) {
  return (
    <button type="button" className={`evm-v2-action-tile evm-v2-action-tile--${tone} evm-v2-pressable`} onClick={onPress} style={PRESS_STYLE}>
      <span className="evm-v2-action-tile__icon" aria-hidden>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

/** @param {{ title: string, subtitle: string, right?: import('react').ReactNode, badge?: import('react').ReactNode, onPress?: () => void, className?: string, buttonProps?: import('react').ButtonHTMLAttributes<HTMLButtonElement> }} props */
export function ListRow({ title, subtitle, right, badge, onPress, className = '', buttonProps }) {
  return (
    <button type="button" className={`evm-v2-list-row evm-v2-pressable ${className}`.trim()} onClick={onPress} style={PRESS_STYLE} {...buttonProps}>
      <div className="evm-v2-list-row__copy">
        <div className="evm-v2-list-row__title-line">
          <strong>{title}</strong>
          {badge}
        </div>
        <p>{subtitle}</p>
      </div>
      <div className="evm-v2-list-row__right">
        {right ?? (
          <span className="evm-v2-list-row__chevron" aria-hidden>
            <IconChevronRight />
          </span>
        )}
      </div>
    </button>
  )
}

/** @param {{ title: string, summary: string, metricLabel?: string, metricValue?: string, badge?: import('react').ReactNode, onPress?: () => void }} props */
export function SummaryRow({ title, summary, metricLabel = 'Durum', metricValue = '—', badge, onPress }) {
  return (
    <ListRow
      title={title}
      subtitle={summary}
      badge={badge}
      right={
        <span className="evm-v2-metric" aria-label={metricLabel}>
          <small>{metricLabel}</small>
          <strong>{metricValue}</strong>
        </span>
      }
      onPress={onPress}
    />
  )
}

/** @param {{ title: string, detail: string, stateLabel?: string, tone?: 'blue' | 'green' | 'orange' | 'red' | 'gray', onPress?: () => void }} props */
export function TaskRow({ title, detail, stateLabel = 'Aksiyon', tone = 'blue', onPress }) {
  return (
    <ListRow
      title={title}
      subtitle={detail}
      badge={<StatusBadge label={stateLabel} tone={tone} />}
      onPress={onPress}
    />
  )
}

/** @param {{ title: string, detail: string, timeLabel: string, badge?: import('react').ReactNode, onPress?: () => void }} props */
export function TimelineRow({ title, detail, timeLabel, badge, onPress }) {
  return (
    <ListRow
      title={title}
      subtitle={detail}
      badge={badge}
      right={<span className="evm-v2-time">{timeLabel}</span>}
      onPress={onPress}
    />
  )
}

/** @param {{ title: string, description: string, actionLabel?: string, onAction?: () => void }} props */
export function EmptyState({ title, description, actionLabel = 'Yeniden dene', onAction }) {
  return (
    <div className="evm-v2-empty" role="status" aria-live="polite">
      <span className="evm-v2-empty__icon" aria-hidden>○</span>
      <strong>{title}</strong>
      <p>{description}</p>
      {onAction ? <button type="button" onClick={onAction}>{actionLabel}</button> : null}
    </div>
  )
}
