/** @typedef {import('../../../contracts/v1/collectionRowVm.js').CollectionRowVM} CollectionRowVM */
/** @typedef {import('./collectionOpsCenterUi.js').OpsRightPanelSection} OpsRightPanelSection */

/** @type {Record<string, { label: string, tone: string }>} */
const SECTION_META = {
  today: { label: 'Bugünkü İşler', tone: 'slate' },
  calls: { label: 'Aranacak Müşteriler', tone: 'blue' },
  meetings: { label: 'Görüşme Planlanan', tone: 'amber' },
  whatsapp: { label: 'WhatsApp Gönderilecek', tone: 'teal' },
  overdue: { label: 'Gecikmiş Tahsilat', tone: 'rose' },
}

/**
 * @param {{
 *   sections: OpsRightPanelSection[]
 *   selectedRowId: string | null
 *   onSelectRow: (row: CollectionRowVM) => void
 * }} props
 */
export default function CollectionOpsRightPanel({ sections, selectedRowId, onSelectRow }) {
  return (
    <aside className="coll-ops-right" aria-label="Günlük operasyon planı">
      <div className="coll-ops-right__grid">
        {sections.map((section) => {
          const meta = SECTION_META[section.id] ?? { label: section.title, tone: 'slate' }
          const preview = section.items[0]
          const hasSelection = section.items.some((item) => item.row.id === selectedRowId)

          return (
            <button
              key={section.id}
              type="button"
              className={`coll-ops-right__stat coll-ops-right__stat--${meta.tone}${hasSelection ? ' is-highlight' : ''}`}
              onClick={() => {
                if (preview) onSelectRow(preview.row)
              }}
              disabled={section.items.length === 0}
            >
              <span className="coll-ops-right__stat-label">{meta.label}</span>
              <strong className="coll-ops-right__stat-count">{section.items.length}</strong>
              {preview ? (
                <span className="coll-ops-right__stat-preview">{preview.title}</span>
              ) : (
                <span className="coll-ops-right__stat-preview coll-ops-right__stat-preview--empty">
                  Kayıt yok
                </span>
              )}
              {section.items.length > 1 ? (
                <span className="coll-ops-right__stat-more">+{section.items.length - 1} kayıt</span>
              ) : null}
            </button>
          )
        })}
      </div>
    </aside>
  )
}
