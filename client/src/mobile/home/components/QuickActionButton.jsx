const PRESS_STYLE = { transition: 'transform 150ms ease' }

/**
 * @param {{
 *   label: string
 *   icon: import('react').ReactNode
 *   onPress: () => void
 * }} props
 */
export default function QuickActionButton({ label, icon, onPress }) {
  return (
    <button
      type="button"
      className="evtrend-native-home__quick-action evtrend-native-home__pressable"
      onClick={onPress}
      aria-label={label}
      style={PRESS_STYLE}
    >
      <span className="evtrend-native-home__quick-icon" aria-hidden>
        {icon}
      </span>
      <span className="evtrend-native-home__quick-label">{label}</span>
    </button>
  )
}
