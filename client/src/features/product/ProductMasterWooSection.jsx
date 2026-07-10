import { WOO_STATUS_LABELS, wooStatusToneClass } from '../../lib/calculateWooReadiness.js'

/** @typedef {import('../../contracts/v1/productMaster.js').ProductMasterWooDto} ProductMasterWooDto */

/**
 * @param {{
 *   woo: ProductMasterWooDto | null | undefined
 *   canPrepare?: boolean
 *   canPublishDraft?: boolean
 *   saving?: boolean
 *   onPrepare?: () => void
 *   onPublishDraft?: () => void
 * }} props
 */
export default function ProductMasterWooSection({
  woo,
  canPrepare = false,
  canPublishDraft = false,
  saving = false,
  onPrepare,
  onPublishDraft,
}) {
  if (!woo) {
    return <p className="mos-pmc-drawer__hint">WooCommerce bilgisi yüklenemedi.</p>
  }

  const readinessChecks = [
    { key: 'category', label: 'Kategori', ok: !woo.readinessMissingLabels.includes('Kategori') },
    { key: 'hero', label: 'Hero görsel', ok: !woo.readinessMissingLabels.includes('Hero görsel') },
    { key: 'seo', label: 'SEO başlık', ok: !woo.readinessMissingLabels.includes('SEO başlık') },
    { key: 'desc', label: 'Açıklama', ok: !woo.readinessMissingLabels.includes('Açıklama') },
    { key: 'price', label: 'Fiyat', ok: !woo.readinessMissingLabels.includes('Fiyat') },
    { key: 'variant', label: 'Varyant', ok: !woo.readinessMissingLabels.includes('Varyant') },
  ]

  return (
    <div className="mos-pmc-woo-section">
      <p className="mos-pmc-drawer__hint">
        WooCommerce sync — ürünler yalnızca DRAFT (taslak) olarak gönderilir. Canlı publish bu
        fazda yok.
      </p>

      <div className="mos-pmc-woo-readiness">
        <span className={`mos-pmc-woo-badge ${wooStatusToneClass(woo.status)}`}>
          {woo.statusLabel || WOO_STATUS_LABELS[woo.status]}
        </span>
        <span className="mos-pmc-woo-readiness__label">
          Readiness: {woo.readiness}
        </span>
      </div>

      {woo.readinessMissingLabels.length > 0 ? (
        <p className="mos-pmc-woo-missing">Eksik: {woo.readinessMissingLabels.join(' · ')}</p>
      ) : (
        <p className="mos-pmc-woo-missing mos-pmc-woo-missing--ok">Woo sync için veri hazır</p>
      )}

      <dl className="mos-pmc-drawer__kv mos-pmc-woo-kv">
        <div className="mos-pmc-drawer__kv-row">
          <dt>Woo Product ID</dt>
          <dd>{woo.productId ?? '—'}</dd>
        </div>
        <div className="mos-pmc-drawer__kv-row">
          <dt>Woo Durumu</dt>
          <dd>{woo.statusLabel}</dd>
        </div>
        <div className="mos-pmc-drawer__kv-row">
          <dt>Son Sync</dt>
          <dd>{woo.lastSyncAt ? new Date(woo.lastSyncAt).toLocaleString('tr-TR') : '—'}</dd>
        </div>
        <div className="mos-pmc-drawer__kv-row">
          <dt>Son Hata</dt>
          <dd>{woo.lastError ?? '—'}</dd>
        </div>
        <div className="mos-pmc-drawer__kv-row">
          <dt>Sync Bekliyor</dt>
          <dd>{woo.syncRequired ? 'Evet' : 'Hayır'}</dd>
        </div>
        <div className="mos-pmc-drawer__kv-row">
          <dt>Woo Kategori ID</dt>
          <dd>{woo.categoryId ?? '—'}</dd>
        </div>
      </dl>

      <ul className="mos-pmc-health-checks">
        {readinessChecks.map((c) => (
          <li key={c.key} className={c.ok ? 'is-ok' : 'is-miss'}>
            {c.label}
          </li>
        ))}
      </ul>

      {canPrepare && woo.readiness === 'READY' && woo.status !== 'SYNC_PENDING' ? (
        <div className="mos-pmc-drawer__actions">
          <button
            type="button"
            className="mos-erp-ops__btn mos-erp-ops__btn--primary"
            disabled={saving}
            onClick={() => onPrepare?.()}
          >
            Sync&apos;e Hazırla
          </button>
        </div>
      ) : null}

      {canPublishDraft && woo.readiness === 'READY' && woo.status === 'SYNC_PENDING' ? (
        <div className="mos-pmc-drawer__actions">
          <button
            type="button"
            className="mos-erp-ops__btn mos-erp-ops__btn--primary"
            disabled={saving}
            onClick={() => onPublishDraft?.()}
          >
            Woo&apos;ya Taslak Gönder
          </button>
        </div>
      ) : null}
    </div>
  )
}
