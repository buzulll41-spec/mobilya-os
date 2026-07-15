import { navigateWithOpsFilter } from '../../lib/opsDeepLink.js'
import MobileCardShell from './MobileCardShell.jsx'
import { getMobileUiIcon } from './MobileUiTokens.jsx'
import '../../styles/mobile-card-shell.css'

/** @type {{ id: import('../../mappers/mobile/mobileOperationHubModel.js').MobileOperationTaskFilterId, label: string }[]} */
const MOBILE_TASK_FILTERS = [
  { id: 'all', label: 'Tumu' },
  { id: 'today', label: 'Bugun' },
  { id: 'critical', label: 'Kritik' },
  { id: 'delayed', label: 'Geciken' },
  { id: 'assigned', label: 'Bana Atanan' },
  { id: 'orders', label: 'Siparis' },
  { id: 'collection', label: 'Tahsilat' },
  { id: 'shipment', label: 'Sevk' },
  { id: 'service', label: 'Servis' },
  { id: 'missing', label: 'Eksik Parca' },
  { id: 'supply', label: 'Tedarik' },
]

/**
 * @param {{
 *   cards: import('../../mappers/mobile/mobileOperationHubModel.js').MobileOperationHubCard[]
 *   pendingSyncCount?: number
 *   notificationUnreadCount?: number
 *   onOpenNotifications?: () => void
 *   onNavigate?: (page: string, ctx?: { opsFilter?: import('../../lib/opsDeepLink.js').OpsDeepLinkFilterId }) => void
 *   taskFilter?: import('../../mappers/mobile/mobileOperationHubModel.js').MobileOperationTaskFilterId
 *   onTaskFilterChange?: (next: import('../../mappers/mobile/mobileOperationHubModel.js').MobileOperationTaskFilterId) => void
 *   tasks?: import('../../mappers/mobile/mobileOperationHubModel.js').MobileOperationCenterTask[]
 *   onOpenTask?: (task: import('../../mappers/mobile/mobileOperationHubModel.js').MobileOperationCenterTask) => void
 * }} props
 */
export default function MobileOperationHub({
  cards,
  pendingSyncCount = 0,
  notificationUnreadCount = 0,
  onOpenNotifications,
  onNavigate,
  taskFilter = 'all',
  onTaskFilterChange,
  tasks = [],
  onOpenTask,
}) {
  /** @param {import('../../mappers/mobile/mobileOperationHubModel.js').MobileOperationHubCard} card */
  function openCard(card) {
    if (card.id === 'notifications') {
      onOpenNotifications?.()
      return
    }
    if (!onNavigate) return
    if (card.navFilter) {
      navigateWithOpsFilter(card.navTarget, card.navFilter, onNavigate)
      return
    }
    onNavigate(card.navTarget)
  }

  function openTask(task) {
    if (onOpenTask) {
      onOpenTask(task)
      return
    }
    if (!onNavigate) return
    if (task.navFilter) {
      navigateWithOpsFilter(task.navTarget, task.navFilter, onNavigate)
      return
    }
    onNavigate(task.navTarget)
  }

  return (
    <section className="mos-mobile-operation-hub" aria-label="Mobil operasyon hub">
      <header className="mos-mobile-operation-hub__head">
        <p className="mos-mobile-operation-hub__eyebrow">Mobile Operation Hub</p>
        <div className="mos-mobile-operation-hub__title-row">
          <h2 className="mos-mobile-operation-hub__title">
            Operasyon Merkezleri
            {pendingSyncCount > 0 ? (
              <span className="mos-mobile-operation-hub__sync-badge">{pendingSyncCount}</span>
            ) : null}
          </h2>
          <button
            type="button"
            className="mos-mobile-operation-hub__notif-btn"
            aria-label={`Bildirim merkezi${notificationUnreadCount > 0 ? `, ${notificationUnreadCount} okunmamis` : ''}`}
            onClick={onOpenNotifications}
          >
            <span aria-hidden>🔔</span>
            {notificationUnreadCount > 0 ? (
              <span className="mos-mobile-operation-hub__notif-badge">
                {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
              </span>
            ) : null}
          </button>
        </div>
      </header>

      <div className="mos-mobile-operation-hub__grid">
        {cards.map((card) => (
          <MobileCardShell
            key={card.id}
            title={card.title}
            icon={card.icon || getMobileUiIcon(card.id)}
            summary={card.statusSummary}
            pendingCount={card.pendingCount}
            criticalCount={card.criticalCount}
            lastActionLabel={card.lastActionLabel}
            onClick={() => openCard(card)}
            ariaLabel={card.title}
          >
          </MobileCardShell>
        ))}
      </div>

      <section className="mos-mobile-operation-hub__tasks" aria-label="Mobil operasyon gorevleri">
        <header className="mos-mobile-operation-hub__tasks-head">
          <h3 className="mos-mobile-operation-hub__tasks-title">Is Listesi</h3>
          <span className="mos-mobile-operation-hub__tasks-count">{tasks.length}</span>
        </header>
        <div className="mos-mobile-operation-hub__filters" role="tablist" aria-label="Mobil operasyon filtreleri">
          {MOBILE_TASK_FILTERS.map((filter) => {
            const active = filter.id === taskFilter
            return (
              <button
                key={filter.id}
                type="button"
                role="tab"
                aria-selected={active}
                className="mos-mobile-operation-hub__filter"
                data-active={active ? 'true' : 'false'}
                onClick={() => onTaskFilterChange?.(filter.id)}
              >
                {filter.label}
              </button>
            )
          })}
        </div>

        <ul className="mos-mobile-operation-hub__task-list">
          {tasks.length === 0 ? (
            <li className="mos-mobile-operation-hub__task-empty">Bu filtrede kayit yok.</li>
          ) : (
            tasks.slice(0, 24).map((task) => (
              <li key={task.id}>
                <button
                  type="button"
                  className="mos-mobile-operation-hub__task"
                  data-critical={task.isCritical ? 'true' : 'false'}
                  onClick={() => openTask(task)}
                >
                  <div className="mos-mobile-operation-hub__task-row">
                    <strong>{task.moduleType}</strong>
                    <span>{task.priority}</span>
                  </div>
                  <p>{task.party}</p>
                  <p>{task.summary}</p>
                  <div className="mos-mobile-operation-hub__task-meta">
                    <span>Termin: <strong>{task.dueDate}</strong></span>
                    <span>Durum: <strong>{task.status}</strong></span>
                    <span>Sorumlu: <strong>{task.assignee}</strong></span>
                    <span>Son islem: <strong>{task.lastAction}</strong></span>
                  </div>
                </button>
              </li>
            ))
          )}
        </ul>
      </section>
    </section>
  )
}
