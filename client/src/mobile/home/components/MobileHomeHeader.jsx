import { IconBell } from '../../../components/Icons.jsx'

const PRESS_STYLE = { transition: 'transform 150ms ease' }

/**
 * @param {{
 *   greeting: string
 *   name: string
 *   unreadCount: number
 *   onOpenNotifications?: () => void
 * }} props
 */
export default function MobileHomeHeader({ greeting, name, unreadCount, onOpenNotifications }) {
  return (
    <header className="evtrend-native-home__header" aria-label="Mobil ana sayfa basligi">
      <div className="evtrend-native-home__header-copy">
        <p className="evtrend-native-home__greeting">{greeting}</p>
        <h1 className="evtrend-native-home__name">{name}</h1>
      </div>
      <button
        type="button"
        className="evtrend-native-home__notify evtrend-native-home__pressable"
        aria-label="Bildirimler"
        onClick={() => onOpenNotifications?.()}
        style={PRESS_STYLE}
      >
        <span className="evtrend-native-home__notify-icon" aria-hidden>
          <IconBell />
        </span>
        {unreadCount > 0 ? <span className="evtrend-native-home__notify-badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
      </button>
    </header>
  )
}
