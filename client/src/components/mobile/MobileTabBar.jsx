import { MOBILE_TAB_ITEMS, isMobileMenuTabActive } from '../../constants/mobileNavigation.js'

/**
 * @param {{
 *   page: string
 *   sidebarOpen?: boolean
 *   onNavigate: (id: string) => void
 *   onOpenMenu?: () => void
 * }} props
 */
export default function MobileTabBar({ page, sidebarOpen = false, onNavigate, onOpenMenu }) {
  function handleTabClick(item) {
    if (item.action === 'menu') {
      onOpenMenu?.()
      return
    }
    onNavigate(item.id)
  }

  return (
    <nav className="mos-mobile-tabbar mos-mobile-tabbar--faz112" aria-label="Mobil ana menü">
      <ul className="mos-mobile-tabbar__list">
        {MOBILE_TAB_ITEMS.map((item) => {
          const isMenu = item.action === 'menu'
          const active = isMenu ? isMobileMenuTabActive(sidebarOpen) : page === item.id

          return (
            <li key={item.id} className="mos-mobile-tabbar__item">
              <button
                type="button"
                className="mos-mobile-tabbar__btn"
                data-active={active ? 'true' : 'false'}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label}
                onClick={() => handleTabClick(item)}
              >
                <span className="mos-mobile-tabbar__icon" aria-hidden>
                  {item.icon}
                </span>
                <span className="mos-mobile-tabbar__label">{item.shortLabel}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}


