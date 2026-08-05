import { IconChevronRight } from '../../../components/Icons.jsx'

const PRESS_STYLE = { transition: 'transform 150ms ease' }

/**
 * @param {{
 *   title: string
 *   badge: number
 *   icon: import('react').ReactNode
 *   tone: 'collection' | 'shipment' | 'service'
 *   onPress: () => void
 * }} props
 */
export default function CriticalActionCard({ title, badge, icon, tone, onPress }) {
  return (
    <button
      type="button"
      className={`evtrend-native-home__critical-card evtrend-native-home__critical-card--${tone} evtrend-native-home__pressable`}
      onClick={onPress}
      aria-label={title}
      style={PRESS_STYLE}
    >
      <span className="evtrend-native-home__critical-head">
        <span className="evtrend-native-home__critical-icon" aria-hidden>
          {icon}
        </span>
        {badge > 0 ? <span className="evtrend-native-home__critical-badge">{badge > 99 ? '99+' : badge}</span> : null}
      </span>
      <strong className="evtrend-native-home__critical-title">{title}</strong>
      <span className="evtrend-native-home__critical-go" aria-hidden>
        <IconChevronRight />
      </span>
    </button>
  )
}
