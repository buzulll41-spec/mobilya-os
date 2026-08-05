import { BUILD_STATUS } from '../../constants/buildStatus.js'

/**
 * @param {{
 *   userName?: string
 *   userRole?: string
 *   userInitials?: string
 *   onLogout?: () => void
 * }} props
 */
export default function UserProfileCard({
  userName = 'Kullanıcı',
  userRole = '—',
  userInitials = 'K',
  onLogout,
}) {
  return (
    <div className="mos-user-card">
      <div className="mos-user-card__identity">
        <span className="mos-user-card__avatar" aria-hidden>
          {userInitials}
        </span>
        <div className="mos-user-card__meta">
          <span className="mos-user-card__name">{userName}</span>
          <span className="mos-user-card__role">{userRole}</span>
          <span className="mos-user-card__about">
            {BUILD_STATUS.version} · {BUILD_STATUS.build} · {BUILD_STATUS.deliveryDate}
          </span>
        </div>
      </div>
      <button type="button" className="mos-user-card__logout" onClick={onLogout} title="Çıkış yap">
        Çıkış
      </button>
    </div>
  )
}
