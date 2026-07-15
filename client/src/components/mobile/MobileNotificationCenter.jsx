import MosBottomSheet from './MosBottomSheet.jsx'
import MobileCardShell from './MobileCardShell.jsx'
import { getMobileUiIcon } from './MobileUiTokens.jsx'
import '../../styles/mobile-card-shell.css'

/**
 * @param {{
 *   open: boolean
 *   unreadCount: number
 *   notifications: import('../../services/mobile/mobileNotificationCenterStore.js').MobileLiveNotification[]
 *   preferences: import('../../services/mobile/mobileNotificationCenterStore.js').MobileNotificationPreferences
 *   onClose: () => void
 *   onMarkAllRead: () => void
 *   onOpenNotification: (item: import('../../services/mobile/mobileNotificationCenterStore.js').MobileLiveNotification) => void
 *   onPreferenceChange: (next: import('../../services/mobile/mobileNotificationCenterStore.js').MobileNotificationPreferences) => void
 * }} props
 */
export default function MobileNotificationCenter({
  open,
  unreadCount,
  notifications,
  preferences,
  onClose,
  onMarkAllRead,
  onOpenNotification,
  onPreferenceChange,
}) {
  return (
    <MosBottomSheet
      open={open}
      onClose={onClose}
      title="Bildirim Merkezi"
      subtitle={unreadCount > 0 ? `${unreadCount} okunmamis bildirim` : 'Tum bildirimler okundu'}
      ariaLabel="Mobil bildirim merkezi"
    >
      <div className="mos-mobile-notification-center">
        <div className="mos-mobile-notification-center__prefs">
          <label>
            <input
              type="checkbox"
              checked={preferences.vibrationEnabled}
              onChange={(event) => onPreferenceChange({ ...preferences, vibrationEnabled: event.target.checked })}
            />
            Titresim
          </label>
          <label>
            <input
              type="checkbox"
              checked={preferences.soundEnabled}
              onChange={(event) => onPreferenceChange({ ...preferences, soundEnabled: event.target.checked })}
            />
            Ses
          </label>
          <button type="button" onClick={onMarkAllRead}>Tumunu okundu yap</button>
        </div>

        {notifications.length === 0 ? (
          <p className="mos-mobile-notification-center__empty">Bildirim yok</p>
        ) : (
          <ul className="mos-mobile-notification-center__list">
            {notifications.map((item) => (
              <li key={item.id}>
                <MobileCardShell
                  title={item.title}
                  icon={getMobileUiIcon(item.type)}
                  summary={item.body}
                  pendingCount={1}
                  criticalCount={item.type === 'collection' ? 1 : 0}
                  lastActionLabel={new Date(item.createdAt).toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
                  onClick={() => onOpenNotification(item)}
                  ariaLabel={item.title}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </MosBottomSheet>
  )
}
