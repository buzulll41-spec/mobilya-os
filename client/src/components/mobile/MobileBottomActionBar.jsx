import { resolveMobileBottomActions } from '../../constants/mobileBottomActions.js'
import {
  IconDashboard,
  IconOrders,
  IconTruck,
  IconWallet,
  IconService,
  IconProducts,
  IconSupply,
  IconSearch,
  IconPlus,
  IconCalendar,
} from '../Icons.jsx'

const ACTION_ICON_MAP = {
  'new-order': IconPlus,
  collection: IconWallet,
  payment: IconWallet,
  shipment: IconTruck,
  plan: IconTruck,
  week: IconCalendar,
  ssh: IconService,
  'new-case': IconService,
  'customer-search': IconSearch,
  products: IconProducts,
  incoming: IconSupply,
  supplier: IconSupply,
  ceo: IconDashboard,
  workforce: IconDashboard,
  'operation-map': IconDashboard,
  copilot: IconDashboard,
}

/**
 * @param {{
 *   page: string
 *   userRoleKey?: import('../../contracts/v1/user.js').UserRole
 *   onQuickAction?: (action: import('../../lib/quickActions.js').QuickActionDef) => void
 *   onNavigate: (pageId: string) => void
 * }} props
 */
export default function MobileBottomActionBar({ page, userRoleKey, onQuickAction, onNavigate }) {
  const actions = resolveMobileBottomActions(page, userRoleKey)

  if (!actions.length) return null

  function run(action) {
    if (action.action && onQuickAction) {
      onQuickAction(action)
      return
    }
    if (action.page) onNavigate(action.page)
  }

  /** @param {import('../../lib/quickActions.js').QuickActionDef} action */
  function resolveActionIcon(action) {
    const byId = ACTION_ICON_MAP[action.id]
    if (byId) return byId
    if (action.page === 'orders') return IconOrders
    if (action.page === 'shipment-ops') return IconTruck
    if (action.page === 'collection') return IconWallet
    if (action.page === 'ssh-service') return IconService
    return IconDashboard
  }

  return (
    <div className="mos-mobile-action-bar" role="toolbar" aria-label="Hızlı işlemler">
      {actions.map((action) => {
        const Icon = resolveActionIcon(action)
        const isCurrentPage = Boolean(action.page && action.page === page)
        return (
          <button
            key={action.id}
            type="button"
            className={`mos-mobile-action-bar__btn${isCurrentPage ? ' is-active' : ''}`}
            onClick={() => run(action)}
            aria-current={isCurrentPage ? 'page' : undefined}
          >
            <span className="mos-mobile-action-bar__icon" aria-hidden>
              <Icon />
            </span>
            <span className="mos-mobile-action-bar__label">{action.label}</span>
          </button>
        )
      })}
    </div>
  )
}
