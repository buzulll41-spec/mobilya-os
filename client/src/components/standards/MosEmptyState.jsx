import EmptyState from '../EmptyState.jsx'
import { UI_STANDARDS } from '../../constants/uiStandards.js'

/** @typedef {import('../../constants/uiStandards.js').EmptyStatePreset} EmptyStatePreset */

const PRESETS = {
  default: {
    icon: '📋',
    title: 'Kayıt bulunamadı',
    body: 'Bu bölümde gösterilecek veri henüz yok.',
  },
  search: {
    icon: '🔍',
    title: 'Arama sonucu yok',
    body: 'Farklı bir anahtar kelime deneyin veya filtreleri genişletin.',
  },
  table: {
    icon: '📊',
    title: 'Liste boş',
    body: 'Filtrelere uyan kayıt bulunamadı. Yeni kayıt ekleyebilir veya filtreyi sıfırlayabilirsiniz.',
  },
  dashboard: {
    icon: '📈',
    title: 'Gösterge verisi yok',
    body: 'Dashboard kartları veri geldiğinde otomatik dolacaktır.',
  },
}

/**
 * Standart boş durum bileşeni.
 * @param {{
 *   preset?: EmptyStatePreset
 *   icon?: string
 *   title?: string
 *   body?: string
 *   actionLabel?: string
 *   onAction?: () => void
 *   secondaryLabel?: string
 *   onSecondary?: () => void
 *   className?: string
 * }} props
 */
export default function MosEmptyState({
  preset = 'default',
  icon,
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  className = '',
}) {
  const base = PRESETS[preset] ?? PRESETS.default
  void UI_STANDARDS.emptyState

  return (
    <EmptyState
      className={`mos-empty-standard ${className}`.trim()}
      icon={icon ?? base.icon}
      title={title ?? base.title}
      body={body ?? base.body}
      actionLabel={actionLabel}
      onAction={onAction}
      secondaryLabel={secondaryLabel}
      onSecondary={onSecondary}
    />
  )
}

export { PRESETS as MOS_EMPTY_PRESETS }
