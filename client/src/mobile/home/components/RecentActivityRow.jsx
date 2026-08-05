import { IconChevronRight } from '../../../components/Icons.jsx'

const PRESS_STYLE = { transition: 'transform 150ms ease' }

/**
 * @param {{
 *   title: string
 *   category: string
 *   time: string
 *   icon: import('react').ReactNode
 *   tone: 'collection' | 'shipment' | 'service' | 'orders' | 'customers' | 'reports'
 *   onPress: () => void
 * }} props
 */
export default function RecentActivityRow({ title, category, time, icon, tone, onPress }) {
  return (
    <button
      type="button"
      className="evtrend-native-home__recent-row evtrend-native-home__pressable"
      onClick={onPress}
      aria-label={title}
      style={PRESS_STYLE}
    >
      <span className={`evtrend-native-home__recent-icon evtrend-native-home__recent-icon--${tone}`} aria-hidden>
        {icon}
      </span>
      <span className="evtrend-native-home__recent-copy">
        <strong>{title}</strong>
        <span>{category}</span>
      </span>
      <span className="evtrend-native-home__recent-side">
        <span className="evtrend-native-home__recent-time">{time}</span>
        <span className="evtrend-native-home__recent-chevron" aria-hidden>
          <IconChevronRight />
        </span>
      </span>
    </button>
  )
}
