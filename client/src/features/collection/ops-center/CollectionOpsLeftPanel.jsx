import {
  OPS_APPROVAL_FILTERS,
  OPS_DATE_FILTERS,
  OPS_MAIL_ORDER_FILTERS,
  OPS_QUICK_FILTERS,
  OPS_RISK_FILTERS,
} from './collectionOpsCenterUi.js'
import PilotScopeToggle from '../../../components/pilot/PilotScopeToggle.jsx'
import { listSuppliers } from '../../../services/suppliersClient.js'
import { useEffect, useState } from 'react'
/** @typedef {import('../../../mappers/collection/collectionCommandCenterModel.js').CollectionFilterId} CollectionFilterId */
/** @typedef {import('./collectionOpsCenterUi.js').OpsDateFilterId} OpsDateFilterId */
/** @typedef {import('../../../lib/pilotRecordHeuristics.js').PilotDataScope} PilotDataScope */

/**
 * @param {{
 *   activeFilter: CollectionFilterId
 *   dateFilter: OpsDateFilterId
 *   filterCounts: Record<string, number>
 *   onFilterChange: (id: CollectionFilterId) => void
 *   onDateFilterChange: (id: OpsDateFilterId) => void
 *   mailOrderSupplierId?: string
 *   onMailOrderSupplierChange?: (supplierId: string) => void
 *   pilotScope?: PilotDataScope
 *   onPilotScopeChange?: (scope: PilotDataScope) => void
 *   canTogglePilotScope?: boolean
 *   pilotModeHint?: string
 * }} props
 */
export default function CollectionOpsLeftPanel({
  activeFilter,
  dateFilter,
  filterCounts,
  onFilterChange,
  onDateFilterChange,
  mailOrderSupplierId = '',
  onMailOrderSupplierChange,
  pilotScope = 'real',
  onPilotScopeChange,
  canTogglePilotScope = false,
  pilotModeHint,
}) {
  const [suppliers, setSuppliers] = useState(/** @type {{ id: string, companyName: string }[]} */ ([]))

  useEffect(() => {
    let cancelled = false
    listSuppliers({ activeOnly: true })
      .then((rows) => {
        if (!cancelled) {
          setSuppliers(rows.map((s) => ({ id: s.id, companyName: s.companyName ?? s.id })))
        }
      })
      .catch(() => {
        if (!cancelled) setSuppliers([])
      })
    return () => {
      cancelled = true
    }
  }, [])

  return (
    <aside className="coll-ops-left" aria-label="Tahsilat filtreleri">
      <section className="coll-ops-left__group">
        <h2 className="coll-ops-left__title">Hızlı</h2>
        <ul className="coll-ops-left__list">
          {OPS_QUICK_FILTERS.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className={`coll-ops-left__btn${activeFilter === f.filterId ? ' is-active' : ''}`}
                onClick={() => onFilterChange(f.filterId)}
              >
                <span>{f.label}</span>
                <span className="coll-ops-left__count">
                  {Number(filterCounts[f.filterId]) || 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="coll-ops-left__group">
        <h2 className="coll-ops-left__title">Onay</h2>
        <ul className="coll-ops-left__list">
          {OPS_APPROVAL_FILTERS.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className={`coll-ops-left__btn${activeFilter === f.filterId ? ' is-active' : ''}`}
                onClick={() => onFilterChange(f.filterId)}
              >
                <span>{f.label}</span>
                <span className="coll-ops-left__count">
                  {Number(filterCounts[f.filterId]) || 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="coll-ops-left__group">
        <h2 className="coll-ops-left__title">Mail Order</h2>
        <ul className="coll-ops-left__list">
          {OPS_MAIL_ORDER_FILTERS.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className={`coll-ops-left__btn${activeFilter === f.filterId ? ' is-active' : ''}`}
                onClick={() => onFilterChange(f.filterId)}
              >
                <span>{f.label}</span>
                <span className="coll-ops-left__count">
                  {Number(filterCounts[f.filterId]) || 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
        <label className="coll-ops-left__supplier">
          <span className="coll-ops-left__supplier-label">Mail Order Tedarikçisi</span>
          <select
            className="coll-ops-left__supplier-select"
            value={mailOrderSupplierId}
            onChange={(e) => {
              onMailOrderSupplierChange?.(e.target.value)
              if (e.target.value) onFilterChange('mail-order')
            }}
            aria-label="Mail order tedarikçisi filtresi"
          >
            <option value="">Tüm tedarikçiler</option>
            {suppliers.map((s) => (
              <option key={s.id} value={s.id}>
                {s.companyName}
              </option>
            ))}
          </select>
        </label>
      </section>

      <section className="coll-ops-left__group">
        <h2 className="coll-ops-left__title">Risk</h2>
        <ul className="coll-ops-left__list">
          {OPS_RISK_FILTERS.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className={`coll-ops-left__btn${activeFilter === f.filterId ? ' is-active' : ''}`}
                onClick={() => onFilterChange(f.filterId)}
              >
                <span>{f.label}</span>
                <span className="coll-ops-left__count">
                  {Number(filterCounts[f.filterId]) || 0}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="coll-ops-left__group">
        <h2 className="coll-ops-left__title">Tarih</h2>
        <ul className="coll-ops-left__list">
          {OPS_DATE_FILTERS.map((f) => (
            <li key={f.id}>
              <button
                type="button"
                className={`coll-ops-left__btn${dateFilter === f.id ? ' is-active' : ''}`}
                onClick={() => onDateFilterChange(f.id)}
              >
                <span>{f.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="coll-ops-left__group coll-ops-left__group--pilot">
        <h2 className="coll-ops-left__title">Kayıt türü</h2>
        <PilotScopeToggle
          scope={pilotScope}
          onScopeChange={(id) => onPilotScopeChange?.(id)}
          canToggle={canTogglePilotScope}
          hint={pilotModeHint}
        />
      </section>
    </aside>
  )
}
