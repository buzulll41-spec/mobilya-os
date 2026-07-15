import { useCallback, useEffect, useMemo, useState } from 'react'
import { getDataSourceDisplay } from '../config/dataSource.js'
import SupplierFormModal from '../features/supply/SupplierFormModal.jsx'
import SupplierPaymentModal from '../features/supply/SupplierPaymentModal.jsx'
import IncomingGoodsFormModal from '../features/supply/IncomingGoodsFormModal.jsx'
import SupplierOpsDetailPanel from '../features/supply/SupplierOpsDetailPanel.jsx'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import ErpOpsLeftFilters from '../components/erp-ops/ErpOpsLeftFilters.jsx'
import ErpOpsDetailStrip from '../components/erp-ops/ErpOpsDetailStrip.jsx'
import ErpOpsTable from '../components/erp-ops/ErpOpsTable.jsx'
import {
  SUPPLY_HEALTH_FILTERS,
  buildSupplyOpsSummary,
  countSupplyHealthFilter,
  filterSuppliersByHealth,
  supplierToErpTableRow,
} from '../features/supply/supplyOpsCenterUi.js'
import { DEMO_TODAY } from '../data/constants.js'
import {
  evaluateProcurementSpecialist,
  listAiProcurementSpecialistOrderIds,
} from '../services/aiProcurementSpecialistService.js'
import { getAllDomainEventsSnapshot } from '../services/mockDomainEventStore.js'
import LoadingBlock from '../components/LoadingBlock.jsx'
import PageRefreshBar from '../components/PageRefreshBar.jsx'
import { toastSuccess } from '../lib/toastBus.js'
import * as suppliersClient from '../services/suppliersClient.js'
import * as incomingGoodsClient from '../services/incomingGoodsClient.js'
import * as supplyOpsClient from '../services/supplyOperationsClient.js'
import { listWarehouseEntries } from '../services/warehouseEntriesClient.js'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import { formatShortDate } from '../utils/dates.js'
import { parseSupplyIncomingDeepLink, navigateSupplyIncomingTab } from '../lib/supplyIncomingNavigation.js'
import { useViewportTier } from '../hooks/useViewportTier.js'
import MosButton from '../components/MosButton.jsx'
import SectionErrorBoundary from '../components/SectionErrorBoundary.jsx'
import SupplierLedgerCenterSection from '../features/supply/SupplierLedgerCenterSection.jsx'
import SupplierOpsMobileWizardPanel from '../features/supply/SupplierOpsMobileWizardPanel.jsx'
import { useOrders } from '../state/useOrders.js'
import '../styles/mos-erp-ops.css'
import '../styles/supplier-ledger-center.css'

/** @typedef {import('../contracts/v1/supplierOperations.js').SupplierOpsListItemDto} SupplierOpsListItemDto */
/** @typedef {import('../contracts/v1/supplier.js').SupplierDetailDto} SupplierDetailDto */
/** @typedef {import('../contracts/v1/supplierLedgerEntry.js').SupplierLedgerEntryDto} SupplierLedgerEntryDto */
/** @typedef {import('../contracts/v1/incomingGoods.js').IncomingGoodsRecordDto} IncomingGoodsRecordDto */
/** @typedef {import('../contracts/v1/supplierOperations.js').SupplyOperationsKpisDto} SupplyOperationsKpisDto */
/** @typedef {import('../contracts/v1/supplierOperations.js').SupplierOperationsDetailDto} SupplierOperationsDetailDto */

/**
 * @param {string | null | undefined} qty
 */
function formatQtyLabel(qty) {
  const value = Number.parseFloat(String(qty ?? '0'))
  if (!Number.isFinite(value)) return '—'
  return value.toLocaleString('tr-TR', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })
}

export default function SupplyIncomingPage() {
  const [activeTab, setActiveTab] = useState(() => parseSupplyIncomingDeepLink().tab)
  const viewportTier = useViewportTier()
  const isPhone = viewportTier === 'phone'
  const [suppliers, setSuppliers] = useState(/** @type {SupplierOpsListItemDto[]} */ ([]))
  const [kpis, setKpis] = useState(/** @type {SupplyOperationsKpisDto | null} */ (null))
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))
  const [mobileSelectedId, setMobileSelectedId] = useState(/** @type {string | null} */ (null))
  const [mobileCardOpsBySupplier, setMobileCardOpsBySupplier] = useState(
    /** @type {Map<string, SupplierOperationsDetailDto>} */ (new Map()),
  )
  const [detail, setDetail] = useState(/** @type {SupplierDetailDto | null} */ (null))
  const [operations, setOperations] = useState(/** @type {SupplierOperationsDetailDto | null} */ (null))
  const [ledger, setLedger] = useState(/** @type {SupplierLedgerEntryDto[]} */ ([]))
  const [warehouseEntries, setWarehouseEntries] = useState(
    /** @type {import('../contracts/v1/warehouseEntry.js').WarehouseEntryDto[]} */ ([]),
  )
  const [loading, setLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [actionBusy, setActionBusy] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [search, setSearch] = useState('')
  const [cityFilter, setCityFilter] = useState('')
  const [healthFilterId, setHealthFilterId] = useState('all')
  const [sort, setSort] = useState('balance_desc')
  const [showInactive, setShowInactive] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const [incomingOpen, setIncomingOpen] = useState(false)
  const [incomingDeepLink, setIncomingDeepLink] = useState(() => parseSupplyIncomingDeepLink())
  const [incomingToday, setIncomingToday] = useState(/** @type {IncomingGoodsRecordDto[]} */ ([]))
  const [incomingLoading, setIncomingLoading] = useState(true)
  const [formError, setFormError] = useState(/** @type {string | null} */ (null))
  const [lastRefresh, setLastRefresh] = useState(/** @type {string | null} */ (null))

  const dataSource = getDataSourceDisplay()
  const { refreshOrders, orders, salesOrderListItemDtos } = useOrders()
  const activeSupplierId = isPhone ? mobileSelectedId : selectedId

  const aiProcurementOrderIds = useMemo(() => {
    const assessments = evaluateProcurementSpecialist(
      orders,
      salesOrderListItemDtos,
      DEMO_TODAY,
      getAllDomainEventsSnapshot(),
      [],
    )
    return listAiProcurementSpecialistOrderIds(assessments)
  }, [orders, salesOrderListItemDtos])

  const listQuery = useMemo(
    () => ({
      q: search.trim() || undefined,
      city: cityFilter.trim() || undefined,
      health: healthFilterId === 'all' ? undefined : healthFilterId,
      sort,
      activeOnly: healthFilterId === 'passive' ? false : !showInactive,
    }),
    [search, cityFilter, healthFilterId, sort, showInactive],
  )

  const loadIncoming = useCallback(async () => {
    const rows = await incomingGoodsClient.listIncomingGoods({ receivedAt: DEMO_TODAY })
    setIncomingToday(rows)
  }, [])

  const loadBoard = useCallback(async () => {
    setError(null)
    const board = await supplyOpsClient.getSupplyOperationsBoard(listQuery)
    setKpis(board.kpis)
    setSuppliers(board.suppliers)
    setSelectedId((prev) => {
      if (prev && board.suppliers.some((r) => r.id === prev)) return prev
      return board.suppliers[0]?.id ?? null
    })
  }, [listQuery])

  useEffect(() => {
    function syncIncomingDeepLink() {
      const link = parseSupplyIncomingDeepLink()
      setActiveTab(link.tab)
      setIncomingDeepLink(link)
      if (link.openIncoming && link.tab !== 'cari') setIncomingOpen(true)
    }
    syncIncomingDeepLink()
    window.addEventListener('hashchange', syncIncomingDeepLink)
    return () => window.removeEventListener('hashchange', syncIncomingDeepLink)
  }, [])

  const loadDetail = useCallback(async (supplierId) => {
    const [d, l, ops, warehouse] = await Promise.all([
      suppliersClient.getSupplier(supplierId),
      suppliersClient.listSupplierLedger(supplierId),
      supplyOpsClient.getSupplierOperations(supplierId),
      listWarehouseEntries({ supplierId }).catch(() => []),
    ])
    setDetail(d)
    setLedger(l)
    setOperations(ops)
    setWarehouseEntries(warehouse)
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      try {
        await Promise.all([loadBoard(), loadIncoming()])
      } catch (err) {
        if (!cancelled) setError(formatApiErrorMessage(err))
      } finally {
        if (!cancelled) {
          setLoading(false)
          setIncomingLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadBoard, loadIncoming])

  useEffect(() => {
    if (!activeSupplierId) {
      setDetail(null)
      setLedger([])
      setOperations(null)
      setWarehouseEntries([])
      setDetailLoading(false)
      return
    }
    let cancelled = false
    ;(async () => {
      setDetailLoading(true)
      try {
        await loadDetail(activeSupplierId)
      } catch (err) {
        if (!cancelled) setError(formatApiErrorMessage(err))
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [activeSupplierId, loadDetail])

  const displaySuppliers = useMemo(
    () => filterSuppliersByHealth(suppliers, healthFilterId),
    [suppliers, healthFilterId],
  )

  useEffect(() => {
    if (!isPhone || activeTab !== 'operasyon') return
    if (displaySuppliers.length === 0) {
      setMobileCardOpsBySupplier(new Map())
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const ids = displaySuppliers.map((supplier) => supplier.id)
        const batches = await Promise.all(
          ids.map(async (id) => {
            try {
              const ops = await supplyOpsClient.getSupplierOperations(id)
              return [id, ops]
            } catch {
              return [id, null]
            }
          }),
        )
        if (cancelled) return
        const next = new Map()
        for (const [id, ops] of batches) {
          if (ops) next.set(id, ops)
        }
        setMobileCardOpsBySupplier(next)
      } catch {
        if (!cancelled) setMobileCardOpsBySupplier(new Map())
      }
    })()

    return () => {
      cancelled = true
    }
  }, [isPhone, activeTab, displaySuppliers])

  const selectedListItem = suppliers.find((s) => s.id === activeSupplierId) ?? null

  const tableRows = useMemo(
    () => displaySuppliers.map(supplierToErpTableRow),
    [displaySuppliers],
  )

  const summaryMetrics = useMemo(
    () => buildSupplyOpsSummary(kpis, suppliers),
    [kpis, suppliers],
  )

  const filterCounts = useMemo(() => {
    /** @type {Record<string, number>} */
    const counts = {}
    for (const f of SUPPLY_HEALTH_FILTERS) {
      counts[f.id] = countSupplyHealthFilter(suppliers, f.id)
    }
    return counts
  }, [suppliers])

  const selectedRow = useMemo(
    () => tableRows.find((r) => r.id === activeSupplierId) ?? tableRows[0] ?? null,
    [tableRows, activeSupplierId],
  )

  const listSuppliersForModal = useMemo(
    () =>
      suppliers.map((s) => ({
        id: s.id,
        code: s.code,
        companyName: s.companyName,
        contactName: s.contactName,
        phone: s.phone,
        openBalance: s.openBalance,
        currency: s.currency,
        lastMovementAt: s.lastMovementAt,
        isActive: s.isActive,
      })),
    [suppliers],
  )

  async function handleCreate(body) {
    setFormError(null)
    setActionBusy(true)
    try {
      const created = await suppliersClient.createSupplier(body)
      setCreateOpen(false)
      await loadBoard()
      setSelectedId(created.id)
    } catch (err) {
      setFormError(formatApiErrorMessage(err))
    } finally {
      setActionBusy(false)
    }
  }

  async function handlePayment(body) {
    if (!activeSupplierId) return
    setFormError(null)
    setActionBusy(true)
    try {
      const result = await suppliersClient.postSupplierPayment(activeSupplierId, body)
      setPayOpen(false)
      setDetail(result.supplier)
      setLedger(await suppliersClient.listSupplierLedger(activeSupplierId))
      await Promise.all([loadBoard(), loadDetail(activeSupplierId)])
    } catch (err) {
      setFormError(formatApiErrorMessage(err))
    } finally {
      setActionBusy(false)
    }
  }

  async function handleCreateIncoming(body) {
    setFormError(null)
    setActionBusy(true)
    try {
      await incomingGoodsClient.createIncomingGoods(body)
      setIncomingOpen(false)
      await Promise.all([loadIncoming(), loadBoard(), refreshOrders()])
      if (activeSupplierId) await loadDetail(activeSupplierId)
    } catch (err) {
      setFormError(formatApiErrorMessage(err))
    } finally {
      setActionBusy(false)
    }
  }

  async function handleToggleActive() {
    if (!detail) return
    setActionBusy(true)
    try {
      const updated = await suppliersClient.patchSupplier(detail.id, { isActive: !detail.isActive })
      setDetail(updated)
      await loadBoard()
    } catch (err) {
      setError(formatApiErrorMessage(err))
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className={`mos-page mos-erp-ops mos-supply-incoming${activeTab === 'cari' ? ' mos-supply-incoming--cari' : ''}`}>
      <PageRefreshBar
        title="Tedarik verilerini yenile"
        onRefresh={async () => {
          await Promise.all([loadBoard(), loadIncoming(), refreshOrders()])
          if (activeSupplierId) await loadDetail(activeSupplierId)
          setLastRefresh(new Date().toLocaleTimeString('tr-TR'))
          toastSuccess('Tedarik ekranı yenilendi')
        }}
        refreshing={loading || incomingLoading || actionBusy}
        updatedAt={lastRefresh}
      />
      <header className="mos-erp-ops__head">
        <div className="mos-erp-ops__head-copy">
          <h1 className="mos-erp-ops__title">Tedarik & Gelen Ürün</h1>
          <span className="mos-erp-ops__sub">
            {activeTab === 'cari'
              ? 'Tedarikçi cari · borç · ödeme · mail order'
              : `${suppliers.length} tedarikçi · ${dataSource.label}`}
          </span>
        </div>
        <div className="mos-erp-ops__head-actions">
          {activeTab === 'operasyon' ? (
            <>
              <MosButton
                context="head"
                tone="primary"
                label="Gelen ürün kaydı"
                onClick={() => {
                  setFormError(null)
                  setIncomingOpen(true)
                }}
              />
              <MosButton context="head" tone="primary" label="Yeni tedarikçi" onClick={() => setCreateOpen(true)}>
                Yeni tedarikçi
              </MosButton>
            </>
          ) : null}
        </div>
      </header>

      <nav className="mos-supply-incoming__tabs" aria-label="Tedarik ekranı sekmeleri">
        <button
          type="button"
          className={`mos-supply-incoming__tab${activeTab === 'operasyon' ? ' is-active' : ''}`}
          onClick={() => navigateSupplyIncomingTab('operasyon')}
        >
          Operasyon
        </button>
        <button
          type="button"
          className={`mos-supply-incoming__tab${activeTab === 'cari' ? ' is-active' : ''}`}
          onClick={() => navigateSupplyIncomingTab('cari')}
        >
          Tedarikçi Cari
        </button>
      </nav>

      {isPhone && activeTab === 'operasyon' ? (
        <>
          {error ? (
            <p className="mos-erp-ops__alert" role="alert">
              {error}
            </p>
          ) : null}

          <SectionErrorBoundary label="Operasyon özeti">
            <ErpOpsSummaryStrip
              metrics={summaryMetrics}
              ariaLabel="Tedarik operasyon özeti"
              onMetricClick={(id) => {
                if (id === 'critical') setHealthFilterId('critical')
              }}
            />
          </SectionErrorBoundary>

          <section className="mos-supply-incoming__mobile-filters" aria-label="Tedarik filtreleri">
            <input
              type="search"
              className="mos-erp-filters__search"
              placeholder="Firma, kod, telefon…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Tedarikçi ara"
            />
            <input
              type="text"
              className="mos-erp-filters__field"
              placeholder="Şehir"
              value={cityFilter}
              onChange={(e) => setCityFilter(e.target.value)}
              aria-label="Şehir filtresi"
            />
            <select
              className="mos-erp-filters__field"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label="Sıralama"
            >
              <option value="balance_desc">Bakiye ↓</option>
              <option value="balance_asc">Bakiye ↑</option>
              <option value="name">İsim A–Z</option>
            </select>
            <label className="mos-erp-filters__check">
              <input
                type="checkbox"
                checked={showInactive}
                onChange={(e) => setShowInactive(e.target.checked)}
              />
              Pasifleri göster
            </label>
            <ErpOpsLeftFilters
              embedded
              groups={[{ title: 'Sağlık', options: SUPPLY_HEALTH_FILTERS }]}
              activeFilter={healthFilterId}
              filterCounts={filterCounts}
              onFilterChange={setHealthFilterId}
            />
          </section>

          {!incomingLoading && incomingToday.length > 0 ? (
            <section className="mos-supply-incoming__mobile-inline" aria-label="Bugünkü gelen ürünler">
              <p className="mos-supply-incoming__mobile-section-title">Bugünkü gelen ürünler</p>
              <div className="mos-supply-incoming__mobile-card-stack">
                {incomingToday.map((row) => (
                  <article key={row.id} className="mos-supply-incoming__mobile-inline-card">
                    <strong>{row.supplierName}</strong>
                    <p>{row.productTitle}</p>
                    <p>
                      {row.orderNumber ? `${row.customerName ?? ''} · ${row.orderNumber}`.trim() : '—'}
                    </p>
                    <p>{formatShortDate(row.receivedAt)}</p>
                  </article>
                ))}
              </div>
            </section>
          ) : null}

          <section className="mos-supply-incoming__mobile-cards" aria-label="Tedarik kartları">
            {loading ? (
              <LoadingBlock title="Tedarikçiler" hint="GET /v1/supply/operations-board" />
            ) : displaySuppliers.length === 0 ? (
              <p className="mos-supply-incoming__mobile-empty">Kayıt yok.</p>
            ) : (
              displaySuppliers.map((supplier) => {
                const isActiveCard = activeSupplierId === supplier.id
                const opsPreview = mobileCardOpsBySupplier.get(supplier.id)
                const primaryOpenProduct = opsPreview?.openProducts?.[0] ?? null
                const primaryPending = opsPreview?.pendingOrders?.[0] ?? null
                const orderNumber = primaryOpenProduct?.orderNumber ?? primaryPending?.orderNumber ?? '—'
                const productTitle = primaryOpenProduct?.productTitle ?? '—'
                const qtyLabel = primaryOpenProduct
                  ? `${formatQtyLabel(primaryOpenProduct.qtyMissing)} / ${formatQtyLabel(primaryOpenProduct.qtyOrdered)}`
                  : '—'
                const expectedDate = primaryOpenProduct?.dueDate
                  ? formatShortDate(primaryOpenProduct.dueDate)
                  : '—'
                const delayStatus = opsPreview?.openProducts?.some((row) => row.isOverdue)
                  ? 'Gecikmiş'
                  : 'Planında'
                const lastAction = supplier.lastActivityLabel || opsPreview?.lastActivityLabel || '—'
                return (
                  <button
                    key={supplier.id}
                    type="button"
                    className={`mos-supply-incoming__mobile-card${isActiveCard ? ' is-active' : ''}`}
                    onClick={() => {
                      setSelectedId(supplier.id)
                      setMobileSelectedId(supplier.id)
                    }}
                    aria-pressed={isActiveCard}
                  >
                    <span className="mos-supply-incoming__mobile-card-kicker">Tedarikçi</span>
                    <strong className="mos-supply-incoming__mobile-card-title">{supplier.companyName}</strong>
                    <span className="mos-supply-incoming__mobile-card-row">
                      <span>Sipariş numarası</span>
                      <strong>{orderNumber}</strong>
                    </span>
                    <span className="mos-supply-incoming__mobile-card-row">
                      <span>Ürün</span>
                      <strong>{productTitle}</strong>
                    </span>
                    <span className="mos-supply-incoming__mobile-card-row">
                      <span>Adet</span>
                      <strong>{qtyLabel}</strong>
                    </span>
                    <span className="mos-supply-incoming__mobile-card-row">
                      <span>Beklenen geliş tarihi</span>
                      <strong>{expectedDate}</strong>
                    </span>
                    <span className="mos-supply-incoming__mobile-card-row">
                      <span>Gecikme durumu</span>
                      <strong data-tone={delayStatus === 'Gecikmiş' ? 'critical' : 'success'}>{delayStatus}</strong>
                    </span>
                    <span className="mos-supply-incoming__mobile-card-row">
                      <span>Açık bakiye</span>
                      <strong>{supplier.openBalance}</strong>
                    </span>
                    <span className="mos-supply-incoming__mobile-card-row">
                      <span>Son İşlem</span>
                      <strong>{lastAction}</strong>
                    </span>
                  </button>
                )
              })
            )}
          </section>

          {activeSupplierId ? (
            <SupplierOpsMobileWizardPanel
              detail={detail}
              operations={operations}
              ledger={ledger}
              warehouseEntries={warehouseEntries}
              loading={detailLoading}
              actionBusy={actionBusy}
              onPay={() => {
                setFormError(null)
                setPayOpen(true)
              }}
              onOpenIncomingGoods={() => {
                setFormError(null)
                setIncomingOpen(true)
              }}
              onClose={() => setMobileSelectedId(null)}
            />
          ) : (
            <p className="mos-supply-incoming__mobile-hint">Bir kart seçin.</p>
          )}
        </>
      ) : activeTab === 'cari' ? (
        <SectionErrorBoundary label="Tedarikçi cari">
          <SupplierLedgerCenterSection />
        </SectionErrorBoundary>
      ) : (
        <>

      {error ? (
        <p className="mos-erp-ops__alert" role="alert">
          {error}
        </p>
      ) : null}

      <SectionErrorBoundary label="Operasyon özeti">
        <ErpOpsSummaryStrip
          metrics={summaryMetrics}
          ariaLabel="Tedarik operasyon özeti"
          onMetricClick={(id) => {
            if (id === 'critical') setHealthFilterId('critical')
          }}
        />
      </SectionErrorBoundary>

      {!incomingLoading && incomingToday.length > 0 ? (
        <div className="mos-erp-ops__inline-table">
          <p className="mos-erp-ops__inline-title">Bugünkü gelen ürün ({incomingToday.length})</p>
          <div className="mos-erp-tbl-wrap">
            <table className="mos-erp-tbl">
              <thead>
                <tr>
                  <th>Tedarikçi</th>
                  <th>Ürün</th>
                  <th>Adet</th>
                  <th>Sipariş</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {incomingToday.map((row) => (
                  <tr key={row.id}>
                    <td className="mos-erp-tbl-td">{row.supplierName}</td>
                    <td className="mos-erp-tbl-td">{row.productTitle}</td>
                    <td className="mos-erp-tbl-td is-num">{row.qty}</td>
                    <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">
                      {row.orderNumber ? `${row.customerName ?? ''} · ${row.orderNumber}` : '—'}
                    </td>
                    <td className="mos-erp-tbl-td">{formatShortDate(row.receivedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <SectionErrorBoundary label="Operasyon listesi">
      <div className="mos-erp-ops__workspace">
        <aside className="mos-erp-filters" aria-label="Tedarik filtreleri">
          <input
            type="search"
            className="mos-erp-filters__search"
            placeholder="Firma, kod, telefon…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Tedarikçi ara"
          />
          <input
            type="text"
            className="mos-erp-filters__field"
            placeholder="Şehir"
            value={cityFilter}
            onChange={(e) => setCityFilter(e.target.value)}
            aria-label="Şehir filtresi"
          />
          <select
            className="mos-erp-filters__field"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            aria-label="Sıralama"
          >
            <option value="balance_desc">Bakiye ↓</option>
            <option value="balance_asc">Bakiye ↑</option>
            <option value="name">İsim A–Z</option>
          </select>
          <label className="mos-erp-filters__check">
            <input
              type="checkbox"
              checked={showInactive}
              onChange={(e) => setShowInactive(e.target.checked)}
            />
            Pasifleri göster
          </label>
          <ErpOpsLeftFilters
            embedded
            groups={[{ title: 'Sağlık', options: SUPPLY_HEALTH_FILTERS }]}
            activeFilter={healthFilterId}
            filterCounts={filterCounts}
            onFilterChange={setHealthFilterId}
          />
        </aside>

        <div className="mos-erp-ops__main">
          <ErpOpsDetailStrip
            row={selectedRow}
            emptyLabel="Tablodan tedarikçi seçin."
            actionLabel="Ödeme al"
            onOpen={() => {
              if (selectedId) {
                setFormError(null)
                setPayOpen(true)
              }
            }}
          />

          <section className="mos-erp-ops__table-panel" aria-label="Tedarikçi listesi">
            {loading ? (
              <LoadingBlock title="Tedarikçiler" hint="GET /v1/supply/operations-board" />
            ) : (
              <ErpOpsTable
                rows={tableRows}
                selectedRowId={selectedRow?.id ?? null}
                onSelectRow={(row) => setSelectedId(row.id)}
                onOpenRow={(row) => setSelectedId(row.id)}
                emptyMessage="Kayıt yok."
              />
            )}
          </section>

          {selectedId ? (
            <div className="mos-erp-ops__subpanel">
              <SupplierOpsDetailPanel
                detail={detail}
                operations={operations}
                ledger={ledger}
                warehouseEntries={warehouseEntries}
                loading={detailLoading}
                actionBusy={actionBusy}
                onPay={() => {
                  setFormError(null)
                  setPayOpen(true)
                }}
                onToggleActive={() => void handleToggleActive()}
              />
            </div>
          ) : null}
        </div>
      </div>
      </SectionErrorBoundary>

      <SectionErrorBoundary label="Modaller">
      <SupplierFormModal
        open={createOpen}
        saving={actionBusy}
        error={formError}
        onClose={() => {
          setCreateOpen(false)
          setFormError(null)
        }}
        onSubmit={handleCreate}
      />

      <SupplierPaymentModal
        open={payOpen}
        supplierName={selectedListItem?.companyName ?? detail?.companyName ?? ''}
        openBalance={selectedListItem?.openBalance ?? detail?.openBalance ?? '0'}
        saving={actionBusy}
        error={formError}
        onClose={() => {
          setPayOpen(false)
          setFormError(null)
        }}
        onSubmit={handlePayment}
      />

      <IncomingGoodsFormModal
        open={incomingOpen}
        suppliers={listSuppliersForModal}
        defaultSupplierId={activeSupplierId}
        pendingSearch={incomingDeepLink.q}
        pendingOrderId={incomingDeepLink.orderId}
        preferredLineId={incomingDeepLink.lineId}
        aiProcurementOrderIds={aiProcurementOrderIds}
        saving={actionBusy}
        error={formError}
        onClose={() => {
          setIncomingOpen(false)
          setFormError(null)
          setIncomingDeepLink({ tab: 'operasyon', openIncoming: false, q: '', orderId: '', lineId: '' })
          window.history.replaceState(null, '', '#/supply-incoming')
        }}
        onSubmit={handleCreateIncoming}
      />
      </SectionErrorBoundary>
        </>
      )}
    </div>
  )
}
