/** @typedef {import('../../mappers/dashboard/computeDashboardControlTower.js').DashboardActionRow} DashboardActionRow */

/**
 * @param {{
 *   title: string
 *   emptyMessage: string
 *   rows: DashboardActionRow[]
 *   onOpenRow: (row: DashboardActionRow) => void
 * }} props
 */
function ActionListBlock({ title, emptyMessage, rows, onOpenRow }) {
  return (
    <section className="dct-action-block">
      <h3 className="dct-action-title">{title}</h3>
      {rows.length === 0 ? (
        <p className="dct-empty dct-empty--ok">{emptyMessage}</p>
      ) : (
        <ul className="dct-action-list">
          {rows.map((row) => (
            <li key={`${title}-${row.orderId}`}>
              <div className="dct-action-row">
                <div className="dct-action-main">
                  <strong className="dct-action-customer">{row.customer}</strong>
                  <span className="dct-action-status">{row.statusLabel}</span>
                  <span className="dct-action-date">{row.dateLabel}</span>
                </div>
                <button
                  type="button"
                  className="dct-action-btn"
                  onClick={() => onOpenRow(row)}
                >
                  {row.actionLabel}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * @param {{
 *   lists: {
 *     pendingShipments: DashboardActionRow[]
 *     installationPending: DashboardActionRow[]
 *     criticalCustomers: DashboardActionRow[]
 *     openService: DashboardActionRow[]
 *   }
 *   onOpenRow: (row: DashboardActionRow) => void
 * }} props
 */
export default function DashboardActionLists({ lists, onOpenRow }) {
  return (
    <section className="dct-actions" aria-label="Aksiyon listeleri">
      <header className="dct-actions-head">
        <h2 className="dct-section-title">Bugün kapatılacak işler</h2>
        <p className="dct-section-sub">Kimin işi bekliyor? Hangi müşteri takip istiyor?</p>
      </header>
      <div className="dct-actions-grid">
        <ActionListBlock
          title="Bekleyen sevkler"
          emptyMessage="Bugün sevk planı yok — harika."
          rows={lists.pendingShipments}
          onOpenRow={onOpenRow}
        />
        <ActionListBlock
          title="Montaj bekleyenler"
          emptyMessage="Montaj bekleyen sipariş yok."
          rows={lists.installationPending}
          onOpenRow={onOpenRow}
        />
        <ActionListBlock
          title="Kritik müşteriler"
          emptyMessage="Bugün açık kritik risk yok."
          rows={lists.criticalCustomers}
          onOpenRow={onOpenRow}
        />
        <ActionListBlock
          title="Açık servis kayıtları"
          emptyMessage="Açık servis kaydı yok."
          rows={lists.openService}
          onOpenRow={onOpenRow}
        />
      </div>
    </section>
  )
}
