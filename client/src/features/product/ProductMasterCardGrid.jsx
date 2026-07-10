import PilotRecordBadge from '../../components/pilot/PilotRecordBadge.jsx'
import { PUBLISH_STATUS_LABELS } from '../../mappers/product/productMasterCenterModel.js'
import { getProductPilotKind } from '../../lib/pilotRecordHeuristics.js'
import ProductMasterHealthBadge from './ProductMasterHealthBadge.jsx'
import ProductMasterThumbnail from './ProductMasterThumbnail.jsx'

/** @typedef {import('../../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} ProductMasterCenterRowVm */
/** @typedef {import('../../mappers/product/productMasterCenterModel.js').PublishStatus} PublishStatus */

/**
 * @param {PublishStatus} status
 */
function statusPillClass(status) {
  if (status === 'PUBLISHED') return 'mos-pmc-status mos-pmc-status--published'
  if (status === 'DRAFT') return 'mos-pmc-status mos-pmc-status--draft'
  return 'mos-pmc-status mos-pmc-status--passive'
}

/**
 * @param {{
 *   items: ProductMasterCenterRowVm[]
 *   drafts?: Record<string, Partial<ProductMasterCenterRowVm>>
 *   selectedId?: string | null
 *   isManagerView?: boolean
 *   onSelect: (id: string) => void
 * }} props
 */
export default function ProductMasterCardGrid({
  items,
  drafts = {},
  selectedId = null,
  isManagerView = false,
  onSelect,
}) {
  if (items.length === 0) {
    return <p className="mos-pmc-cards__empty">Bu filtrede ürün bulunamadı.</p>
  }

  return (
    <div className="mos-pmc-cards" role="list" aria-label="Ürün kartları">
      {items.map((p) => {
        const draft = drafts[p.id] ?? {}
        const status = /** @type {PublishStatus} */ (draft.publishStatus ?? p.publishStatus)
        const pilotKind = getProductPilotKind(p)
        const thumbUrl = p.media?.mainImageUrl ?? p.thumbnailUrl
        const isSelected = selectedId === p.id

        return (
          <article
            key={p.id}
            role="listitem"
            className={`mos-pmc-card${isSelected ? ' is-selected' : ''}${pilotKind ? ' is-pilot-record' : ''}`}
            onClick={() => onSelect(p.id)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelect(p.id)
              }
            }}
            tabIndex={0}
          >
            <div className="mos-pmc-card__media">
              <ProductMasterThumbnail name={draft.name ?? p.name} url={thumbUrl} size="lg" />
            </div>
            <div className="mos-pmc-card__body">
              <h3 className="mos-pmc-card__title">
                {draft.name ?? p.name}
                <PilotRecordBadge kind={pilotKind} />
              </h3>
              <p className="mos-pmc-card__meta">{p.productCode}</p>
              <div className="mos-pmc-card__row">
                <span className={statusPillClass(status)}>{PUBLISH_STATUS_LABELS[status]}</span>
                <ProductMasterHealthBadge product={p} compact />
              </div>
              <p className="mos-pmc-card__price">
                {isManagerView ? p.salePriceFormatted : p.listPriceFormatted}
              </p>
            </div>
          </article>
        )
      })}
    </div>
  )
}
