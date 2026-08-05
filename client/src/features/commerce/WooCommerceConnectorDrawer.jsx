import { useEffect, useMemo } from 'react'

/** @typedef {import('../../mappers/commerce/woocommerceConnectorModel.js').WooConnectorRowVm} WooConnectorRowVm */

/**
 * @param {'success' | 'warning' | 'critical' | 'info' | 'neutral'} tone
 */
function wooBadgeClass(tone) {
  if (tone === 'success') return 'mos-woo-drawer__badge--success'
  if (tone === 'warning') return 'mos-woo-drawer__badge--warning'
  if (tone === 'critical') return 'mos-woo-drawer__badge--critical'
  if (tone === 'info') return 'mos-woo-drawer__badge--info'
  return 'mos-woo-drawer__badge--neutral'
}

/**
 * @param {{
 *   open: boolean
 *   row: WooConnectorRowVm | null
 *   onClose: () => void
 * }} props
 */
export default function WooCommerceConnectorDrawer({ open, row, onClose }) {
  useEffect(() => {
    if (!open) return
    function onKey(e) {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  const groupedFields = useMemo(() => {
    if (!row) return []
    const groups = /** @type {Record<string, typeof row.sendFields>} */ ({})
    for (const field of row.sendFields) {
      if (!groups[field.group]) groups[field.group] = []
      groups[field.group].push(field)
    }
    return Object.entries(groups)
  }, [row])

  if (!open || !row) return null

  return (
    <>
      <button
        type="button"
        className="mos-woo-drawer__scrim"
        aria-label="WooCommerce detayını kapat"
        onClick={onClose}
      />
      <aside className="mos-woo-drawer" role="complementary" aria-label="WooCommerce senkron detayı">
        <header className="mos-woo-drawer__hero">
          <div className="mos-woo-drawer__head-row">
            <div>
              <h2 className="mos-woo-drawer__title">{row.name}</h2>
              <span className="mos-woo-drawer__sub">
                {row.productCode} · EVTREND WooCommerce
              </span>
            </div>
            <button type="button" className="mos-woo-drawer__close" aria-label="Kapat" onClick={onClose}>
              ×
            </button>
          </div>
          <div className="mos-woo-drawer__tags">
            <span className={`mos-woo-drawer__badge ${wooBadgeClass(row.wooStatusTone)}`}>
              {row.wooStatusLabel}
            </span>
            <span className="mos-erp-tag mos-erp-tag--info">{row.publishStatusLabel}</span>
          </div>
        </header>

        <div className="mos-woo-drawer__body">
          <section className="mos-woo-drawer__section" aria-label="Ürün özeti">
            <h3 className="mos-woo-drawer__section-title">Ürün Özeti</h3>
            <dl className="mos-woo-drawer__kv">
              <div className="mos-woo-drawer__kv-row">
                <dt>Ürün adı</dt>
                <dd>{row.name}</dd>
              </div>
              <div className="mos-woo-drawer__kv-row">
                <dt>Ürün kodu</dt>
                <dd>{row.productCode}</dd>
              </div>
              <div className="mos-woo-drawer__kv-row">
                <dt>Yayın durumu</dt>
                <dd>{row.publishStatusLabel}</dd>
              </div>
              <div className="mos-woo-drawer__kv-row">
                <dt>Woo durumu</dt>
                <dd>{row.wooStatusLabel}</dd>
              </div>
              <div className="mos-woo-drawer__kv-row">
                <dt>Son senkron</dt>
                <dd>{row.lastSync}</dd>
              </div>
              <div className="mos-woo-drawer__kv-row">
                <dt>Senkron detayı</dt>
                <dd>{row.lastSyncDetail}</dd>
              </div>
            </dl>
          </section>

          <section className="mos-woo-drawer__section" aria-label="Gönderilecek alanlar">
            <h3 className="mos-woo-drawer__section-title">Gönderilecek Alanlar</h3>
            <p className="mos-woo-drawer__hint-block">
              Ürün Master · Medya Merkezi · E-Ticaret Yayın verileri birleştirildi
            </p>
            {groupedFields.map(([group, fields]) => (
              <div key={group} className="mos-woo-drawer__group">
                <h4 className="mos-woo-drawer__group-title">{group}</h4>
                <ul className="mos-woo-drawer__fields">
                  {fields.map((field) => (
                    <li
                      key={`${group}-${field.label}`}
                      className={`mos-woo-drawer__field${field.ready ? ' is-ready' : ' is-miss'}`}
                    >
                      <span className="mos-woo-drawer__field-label">{field.label}</span>
                      <span className="mos-woo-drawer__field-value">{field.value}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>

        <footer className="mos-woo-drawer__foot">
          <span className="mos-woo-drawer__hint">
            Mock WooCommerce REST · gerçek bağlantı sonraki faz
          </span>
        </footer>
      </aside>
    </>
  )
}
