import { IconDashboard, IconMenu, IconOrders, IconPlus, IconUsers } from '../../components/Icons.jsx'

const ITEMS = [
  { id: 'home', label: 'Ana Sayfa', icon: IconDashboard, action: 'home' },
  { id: 'orders', label: 'Siparişler', icon: IconOrders, action: 'orders' },
  { id: 'create', label: '', icon: IconPlus, action: 'create' },
  { id: 'customers', label: 'Müşteriler', icon: IconUsers, action: 'customers' },
  { id: 'menu', label: 'Menü', icon: IconMenu, action: 'menu' },
]

/**
 * @param {{
 *   page: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'reports'
 *   onNavigate: (page: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'reports') => void
 *   onOpenOrderModal?: () => void
 * }} props
 */
export default function BottomTab({ page, onNavigate, onOpenOrderModal }) {
  return (
    <nav className="mos-mobile-tabbar mos-mobile-tabbar--faz112" aria-label="Mobile navigation">
      <ul className="mos-mobile-tabbar__list">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const ordersScopeActive =
            page === 'orders' || page === 'collection' || page === 'shipment' || page === 'service' || page === 'reports'
          const active =
            item.id === 'home'
              ? page === 'home'
              : item.id === 'orders'
                ? ordersScopeActive
                : item.id === 'customers'
                  ? page === 'customers'
                  : item.id === 'menu'
                    ? page === 'menu'
                    : false
          return (
            <li
              key={item.id}
              className={`mos-mobile-tabbar__item ${item.action === 'create' ? 'mos-mobile-tabbar__item--create' : ''}`}
            >
              <button
                type="button"
                className="mos-mobile-tabbar__btn"
                data-active={active ? 'true' : 'false'}
                aria-current={active ? 'page' : undefined}
                aria-label={item.label || 'Create'}
                onClick={() => {
                  if (item.action === 'home') onNavigate('home')
                  if (item.action === 'orders') onNavigate('orders')
                  if (item.action === 'customers') onNavigate('customers')
                  if (item.action === 'menu') onNavigate('menu')
                  if (item.action === 'create') onOpenOrderModal?.()
                }}
              >
                <span className="mos-mobile-tabbar__icon" aria-hidden>
                  <Icon />
                </span>
                <span className="mos-mobile-tabbar__label">{item.label}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
