const PRESS_STYLE = { transition: 'transform 150ms ease' }

/**
 * @param {{
 *   title: string
 *   value: string
 *   subtitle: string
 *   badge?: number
 *   icon: import('react').ReactNode
 *   tone: 'collection' | 'shipment' | 'service' | 'orders' | 'customers' | 'reports'
 *   onPress: () => void
 * }} props
 */
export default function ModuleCard({ title, value, subtitle, badge = 0, icon, tone, onPress }) {
  return (
    <button
      type="button"
      className={`evtrend-native-home__module-card evtrend-native-home__module-card--${tone} evtrend-native-home__pressable`}
      onClick={onPress}
      aria-label={`${title} modulu`}
      style={PRESS_STYLE}
    >
      <span className="evtrend-native-home__module-head">
        <span className="evtrend-native-home__module-icon" aria-hidden>
          {icon}
        </span>
        {badge > 0 ? <span className="evtrend-native-home__module-badge">{badge > 99 ? '99+' : badge}</span> : null}
      </span>
      <span className="evtrend-native-home__module-title">{title}</span>
      <strong className="evtrend-native-home__module-value">{value}</strong>
      <span className="evtrend-native-home__module-subtitle">{subtitle}</span>
    </button>
  )
}
