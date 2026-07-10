import { resolveMobileBottomActions } from '../../constants/mobileBottomActions.js'

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

  return (
    <div className="mos-mobile-action-bar" role="toolbar" aria-label="Hızlı işlemler">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          className="mos-mobile-action-bar__btn"
          onClick={() => run(action)}
        >
          {action.label}
        </button>
      ))}
    </div>
  )
}
