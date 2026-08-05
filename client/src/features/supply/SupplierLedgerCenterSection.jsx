import { useCallback, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../../components/erp-ops/ErpOpsSummaryStrip.jsx'
import SupplierLedgerDetailPanel from './SupplierLedgerDetailPanel.jsx'
import SupplierPaymentModal from './SupplierPaymentModal.jsx'
import LoadingBlock from '../../components/LoadingBlock.jsx'
import {
  buildSupplierLedgerCenterSummary,
  buildSupplierLedgerReports,
  supplierLedgerCenterTableRow,
} from './supplierLedgerCenterUi.js'
import { getDataSourceDisplay } from '../../config/dataSource.js'
import * as suppliersClient from '../../services/suppliersClient.js'
import * as supplyOpsClient from '../../services/supplyOperationsClient.js'
import { formatApiErrorMessage } from '../../utils/apiErrorMessage.js'
import { useAuth } from '../../state/AuthProvider.jsx'
import { USER_ROLE } from '../../contracts/v1/user.js'
import '../../styles/supplier-ledger-center.css'

/** @typedef {import('../../contracts/v1/supplierLedgerCenter.js').SupplierLedgerCenterDto} SupplierLedgerCenterDto */
/** @typedef {import('../../contracts/v1/supplier.js').SupplierDetailDto} SupplierDetailDto */
/** @typedef {import('../../contracts/v1/supplierLedgerEntry.js').SupplierLedgerEntryDto} SupplierLedgerEntryDto */
/** @typedef {import('../../contracts/v1/supplierOperations.js').SupplierOperationsDetailDto} SupplierOperationsDetailDto */

const SORT_OPTIONS = [
  { value: 'risk_desc', label: 'Toplam risk (yüksek → düşük)' },
  { value: 'balance_desc', label: 'Cari borç (yüksek → düşük)' },
  { value: 'overdue_desc', label: 'Vadesi geçmiş (yüksek → düşük)' },
  { value: 'balance_asc', label: 'Cari borç (düşük → yüksek)' },
  { value: 'name', label: 'Tedarikçi adı' },
]

function canPostSupplierPayment(role) {
  return role === USER_ROLE.ADMIN || role === USER_ROLE.MANAGER || role === USER_ROLE.FINANCE
}

/**
 * Tedarik & Gelen Ürün ekranı içinde gömülü tedarikçi cari merkezi.
 *
 * @param {{ onPayOpenChange?: (open: boolean) => void }} props
 */
export default function SupplierLedgerCenterSection({ onPayOpenChange }) {
  const { user } = useAuth()
  const [center, setCenter] = useState(/** @type {SupplierLedgerCenterDto | null} */ (null))
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))
  const [detail, setDetail] = useState(/** @type {SupplierDetailDto | null} */ (null))
  const [ledger, setLedger] = useState(/** @type {SupplierLedgerEntryDto[]} */ ([]))
  const [operations, setOperations] = useState(/** @type {SupplierOperationsDetailDto | null} */ (null))
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [search, setSearch] = useState('')
  const [sort, setSort] = useState('risk_desc')
  const [showInactive, setShowInactive] = useState(true)
  const [payOpen, setPayOpen] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [formError, setFormError] = useState(/** @type {string | null} */ (null))

  const dataSource = getDataSourceDisplay()
  const canPay = canPostSupplierPayment(user?.role)

  const listQuery = useMemo(
    () => ({
      q: search.trim() || undefined,
      sort,
      activeOnly: !showInactive,
    }),
    [search, sort, showInactive],
  )

  const loadCenter = useCallback(async () => {
    setError(null)
    const dto = await supplyOpsClient.getSupplierLedgerCenter(listQuery)
    setCenter(dto)
    setSelectedId((prev) => {
      if (prev && dto.suppliers.some((r) => r.id === prev)) return prev
      return dto.suppliers[0]?.id ?? null
    })
  }, [listQuery])

  const loadDetail = useCallback(async (supplierId) => {
    const [d, l, ops] = await Promise.all([
      suppliersClient.getSupplier(supplierId),
      suppliersClient.listSupplierLedger(supplierId),
      supplyOpsClient.getSupplierOperations(supplierId),
    ])
    setDetail(d)
    setLedger(l)
    setOperations(ops)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await loadCenter()
      } catch (err) {
        if (!cancelled) setError(formatApiErrorMessage(err))
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadCenter])

  useEffect(() => {
    if (!selectedId) {
      setDetail(null)
      setLedger([])
      setOperations(null)
      return
    }
    let cancelled = false
    ;(async () => {
      setDetailLoading(true)
      try {
        await loadDetail(selectedId)
      } catch (err) {
        if (!cancelled) setError(formatApiErrorMessage(err))
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [selectedId, loadDetail])

  useEffect(() => {
    onPayOpenChange?.(payOpen)
  }, [payOpen, onPayOpenChange])

  const tableRows = useMemo(
    () => (center?.suppliers ?? []).map(supplierLedgerCenterTableRow),
    [center?.suppliers],
  )

  const summaryMetrics = useMemo(
    () => buildSupplierLedgerCenterSummary(center?.kpis ?? null),
    [center?.kpis],
  )

  const reports = useMemo(
    () => buildSupplierLedgerReports(center?.reports),
    [center?.reports],
  )

  const selectedRow = center?.suppliers.find((s) => s.id === selectedId) ?? null

  async function handlePayment(body) {
    if (!selectedId) return
    setFormError(null)
    setActionBusy(true)
    try {
      const result = await suppliersClient.postSupplierPayment(selectedId, body)
      setPayOpen(false)
      setDetail(result.supplier)
      setLedger(await suppliersClient.listSupplierLedger(selectedId))
      await loadCenter()
    } catch (err) {
      setFormError(formatApiErrorMessage(err))
    } finally {
      setActionBusy(false)
    }
  }

  if (loading && !center) {
    return <LoadingBlock title="Tedarikçi cari yükleniyor" />
  }

  return (
    <div className="mos-supplier-ledger-center">
      <p className="mos-erp-ops__sub mos-supplier-ledger-center__embedded-meta">
        {center?.suppliers.length ?? 0} tedarikçi · {dataSource.label}
      </p>

      {error ? (
        <p className="mos-erp-ops__alert" role="alert">
          {error}
        </p>
      ) : null}

      <ErpOpsSummaryStrip metrics={summaryMetrics} ariaLabel="Tedarikçi cari özeti" />

      <div className="mos-erp-ops__workspace">
        <aside className="mos-erp-filters" aria-label="Tedarikçi cari filtreleri">
          <input
            type="search"
            className="mos-erp-filters__search"
            placeholder="Tedarikçi ara…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tedarikçi ara"
          />
          <select
            className="mos-erp-filters__field"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sıralama"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <label className="mos-erp-filters__check">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Pasif tedarikçileri göster
          </label>
        </aside>

        <div className="mos-erp-ops__main">
          <div className="mos-erp-tbl-wrap mos-supplier-ledger-center__table-wrap">
            <table className="mos-erp-tbl mos-supplier-ledger-center__table">
              <thead>
                <tr>
                  <th>Firma</th>
                  <th className="is-num">Cari Borç</th>
                  <th className="is-num">Bekleyen Sipariş</th>
                  <th className="is-num">Bekleyen Ürün</th>
                  <th className="is-num">Toplam Risk</th>
                  <th>Son İşlem Tarihi</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr className="mos-erp-tbl-empty">
                    <td colSpan={6}>Kayıtlı tedarikçi bulunamadı.</td>
                  </tr>
                ) : (
                  tableRows.map((row) => (
                    <tr
                      key={row.id}
                      className={[
                        'mos-erp-tbl-row',
                        selectedId === row.id ? 'is-selected' : '',
                        row.tone === 'critical' ? 'is-critical' : '',
                        row.tone === 'warning' ? 'is-warning' : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                      onClick={() => setSelectedId(row.id)}
                      tabIndex={0}
                      role="button"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          setSelectedId(row.id)
                        }
                      }}
                    >
                      <td className="mos-erp-tbl-td">{row.companyName}</td>
                      <td className="mos-erp-tbl-td is-num">{row.totalDebt}</td>
                      <td className="mos-erp-tbl-td is-num">{row.pendingOrderDebt}</td>
                      <td className="mos-erp-tbl-td is-num">{row.pendingProductCount}</td>
                      <td className={`mos-erp-tbl-td is-num mos-supplier-ledger-center__risk-cell${row.totalRiskTone ? ` is-${row.totalRiskTone}` : ''}`}>
                        {row.totalRisk}
                      </td>
                      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{row.lastMovement}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <section className="mos-supplier-ledger-reports" aria-label="Tedarikçi cari raporları">
            <ReportCard title="En Riskli 10 Tedarikçi" rows={reports.topRisk} onSelect={setSelectedId} />
            <ReportCard title="Bu Ay Ödenen Tedarikçiler" rows={reports.monthPaid} onSelect={setSelectedId} />
            <ReportCard title="Vadesi Geçmiş Borçlar" rows={reports.overdue} onSelect={setSelectedId} tone="critical" />
            <ReportCard
              title="Mail Order Dağılımı"
              rows={reports.mailOrder.map((r) => ({ ...r, sub: `${r.count} işlem` }))}
              onSelect={setSelectedId}
            />
          </section>

          {selectedRow ? (
            <div className="mos-erp-ops__subpanel">
              <SupplierLedgerDetailPanel
                detail={detail}
                selectedRow={selectedRow}
                operations={operations}
                ledger={ledger}
                loading={detailLoading}
                onPay={canPay ? () => { setFormError(null); setPayOpen(true) } : undefined}
              />
            </div>
          ) : null}
        </div>
      </div>

      {payOpen && selectedId ? (
        <SupplierPaymentModal
          open={payOpen}
          supplierName={selectedRow?.companyName ?? detail?.companyName ?? ''}
          openBalance={detail?.openBalance ?? selectedRow?.totalDebt ?? '0'}
          saving={actionBusy}
          error={formError}
          onClose={() => {
            setPayOpen(false)
            setFormError(null)
          }}
          onSubmit={handlePayment}
        />
      ) : null}
    </div>
  )
}

/**
 * @param {{
 *   title: string
 *   rows: { id: string, label: string, value: string, sub?: string, tone?: 'success' | 'warning' | 'critical' }[]
 *   onSelect: (id: string) => void
 *   tone?: 'critical'
 * }} props
 */
function ReportCard({ title, rows, onSelect, tone }) {
  return (
    <article className={`mos-supplier-ledger-report${tone === 'critical' ? ' is-critical' : ''}`}>
      <h3 className="mos-supplier-ledger-report__title">{title}</h3>
      {rows.length === 0 ? (
        <p className="mos-supplier-ledger-report__empty">Veri yok</p>
      ) : (
        <ul className="mos-supplier-ledger-report__list">
          {rows.slice(0, 10).map((row) => (
            <li key={row.id}>
              <button type="button" className="mos-supplier-ledger-report__row" onClick={() => onSelect(row.id)}>
                <span className="mos-supplier-ledger-report__label">{row.label}</span>
                <span className={`mos-supplier-ledger-report__value${row.tone ? ` is-${row.tone}` : ''}`}>
                  {row.value}
                  {row.sub ? <span className="mos-supplier-ledger-report__sub">{row.sub}</span> : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </article>
  )
}

export { canPostSupplierPayment as canPostSupplierPaymentFromCari }
