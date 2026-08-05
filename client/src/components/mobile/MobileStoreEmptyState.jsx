/** @typedef {'orders' | 'collection' | 'shipment' | 'dashboard' | 'search'} MobileEmptyContext */

const COPY = {
  orders: {
    icon: '📦',
    title: 'Sipariş bulunamadı',
    body: 'Yeni sipariş başlatabilir veya filtreleri genişletebilirsiniz.',
    primary: 'Yeni Sipariş',
    secondary: 'Filtreyi sıfırla',
  },
  collection: {
    icon: '💰',
    title: 'Bekleyen tahsilat yok',
    body: 'Açık bakiyeli siparişler burada listelenir. Sipariş arayarak tahsilat girebilirsiniz.',
    primary: 'Sipariş ara',
    secondary: 'Tüm dosyalar',
  },
  shipment: {
    icon: '🚚',
    title: 'Sevk kaydı yok',
    body: 'Bugün veya yarın için planlanan sevkler burada görünür. Sevk planlamak için sipariş seçin.',
    primary: 'Sevk planla',
    secondary: 'Tüm sevkler',
  },
  dashboard: {
    icon: '📈',
    title: 'Bugün için kayıt yok',
    body: 'Sipariş, tahsilat veya sevk ekranından işlem başlatabilirsiniz.',
    primary: 'Siparişlere git',
    secondary: null,
  },
  search: {
    icon: '🔍',
    title: 'Arama sonucu yok',
    body: 'Telefon numarası, müşteri adı veya sipariş numarası ile tekrar deneyin.',
    primary: 'Aramayı temizle',
    secondary: null,
  },
}

/**
 * @param {{
 *   context?: MobileEmptyContext
 *   title?: string
 *   body?: string
 *   icon?: string
 *   primaryLabel?: string
 *   secondaryLabel?: string
 *   onPrimary?: () => void
 *   onSecondary?: () => void
 *   className?: string
 * }} props
 */
export default function MobileStoreEmptyState({
  context = 'orders',
  title,
  body,
  icon,
  primaryLabel,
  secondaryLabel,
  onPrimary,
  onSecondary,
  className = '',
}) {
  const preset = COPY[context] ?? COPY.orders

  return (
    <div className={`mos-mobile-store-empty ${className}`.trim()} role="status">
      <span className="mos-mobile-store-empty__icon" aria-hidden>
        {icon ?? preset.icon}
      </span>
      <h3 className="mos-mobile-store-empty__title">{title ?? preset.title}</h3>
      <p className="mos-mobile-store-empty__body">{body ?? preset.body}</p>
      <div className="mos-mobile-store-empty__actions">
        {onPrimary ? (
          <button type="button" className="mos-mobile-store-empty__btn is-primary" onClick={onPrimary}>
            {primaryLabel ?? preset.primary}
          </button>
        ) : null}
        {onSecondary && (secondaryLabel ?? preset.secondary) ? (
          <button type="button" className="mos-mobile-store-empty__btn" onClick={onSecondary}>
            {secondaryLabel ?? preset.secondary}
          </button>
        ) : null}
      </div>
    </div>
  )
}
