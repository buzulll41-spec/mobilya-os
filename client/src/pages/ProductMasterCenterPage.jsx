import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconPlus } from '../components/Icons.jsx'
import SectionErrorBoundary from '../components/SectionErrorBoundary.jsx'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import LoadingBlock from '../components/LoadingBlock.jsx'
import ProductDetailErpDrawer from '../features/product/ProductDetailErpDrawer.jsx'
import ProductMasterFormDrawer from '../features/product/ProductMasterFormDrawer.jsx'
import ProductMasterCardGrid from '../features/product/ProductMasterCardGrid.jsx'
import ProductMasterHealthBadge from '../features/product/ProductMasterHealthBadge.jsx'
import ProductMasterThumbnail from '../features/product/ProductMasterThumbnail.jsx'
import {
  PRODUCT_MASTER_QUICK_FILTERS,
  buildProductHealthSummaryMetrics,
  countProductMasterQuickFilters,
  filterProductMasterItems,
  productHasMissingMedia,
} from '../features/product/productMasterCenterUi.js'
import { getCurrentAuthUser } from '../lib/operationActor.js'
import { getDataSourceDisplay } from '../config/dataSource.js'
import MosButton from '../components/MosButton.jsx'
import {
  buildProductMasterWritePayload,
  emptyProductMasterForm,
  productToFormState,
} from '../lib/productMasterFormPayload.js'
import * as productMasterClient from '../services/productMasterClient.js'
import * as suppliersClient from '../services/suppliersClient.js'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import {
  PUBLISH_STATUS,
  PUBLISH_STATUS_LABELS,
  publishStatusTone,
  searchMasterCenterProducts,
  mapProductMasterDtoToRowVm,
} from '../mappers/product/productMasterCenterModel.js'
import PilotRecordBadge from '../components/pilot/PilotRecordBadge.jsx'
import PilotScopeToggle from '../components/pilot/PilotScopeToggle.jsx'
import { usePilotDataMode } from '../hooks/usePilotDataMode.js'
import { applyPilotScope, getProductPilotKind } from '../lib/pilotRecordHeuristics.js'
import '../styles/mos-erp-ops.css'
import '../styles/product-master-v3.css'

/** @typedef {import('../features/product/productMasterCenterUi.js').ProductMasterQuickFilterId} ProductMasterQuickFilterId */

/** @typedef {import('../mappers/product/productMasterCenterModel.js').ProductMasterCenterRowVm} ProductMasterCenterRowVm */
/** @typedef {import('../mappers/product/productMasterCenterModel.js').PublishStatus} PublishStatus */
/** @typedef {import('../features/product/productMasterFormTypes.js').ProductMasterFormState} ProductMasterFormState */
/** @typedef {import('../contracts/v1/productMaster.js').ProductMasterVariantDto} ProductMasterVariantDto */

const CATALOG_PAGE_SIZE = 100

/**
 * @param {PublishStatus} status
 */
function statusPillClass(status) {
  const tone = publishStatusTone(status)
  if (tone === 'success') return 'mos-pmc-status mos-pmc-status--published'
  if (tone === 'warning') return 'mos-pmc-status mos-pmc-status--draft'
  return 'mos-pmc-status mos-pmc-status--passive'
}

/**
 * @param {ProductMasterFormState} form
 */
function validateForm(form) {
  if (!form.name.trim()) return 'Ürün adı zorunludur'
  if (!form.code.trim()) return 'Ürün kodu zorunludur'
  if (!form.category.trim()) return 'Kategori zorunludur'
  return null
}

/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function ProductMasterCenterPage({ embedded = false }) {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [formError, setFormError] = useState(/** @type {string | null} */ (null))
  const [view, setView] = useState(
    /** @type {ReturnType<typeof productMasterClient.toProductMasterCenterView> | null} */ (null),
  )
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState(/** @type {'create' | 'edit'} */ ('create'))
  const [formState, setFormState] = useState(() => emptyProductMasterForm())
  const [variants, setVariants] = useState(/** @type {ProductMasterVariantDto[]} */ ([]))
  const [editWoo, setEditWoo] = useState(
    /** @type {import('../contracts/v1/productMaster.js').ProductMasterWooDto | null} */ (null),
  )
  const [suppliers, setSuppliers] = useState(/** @type {{ id: string; companyName: string }[]} */ ([]))
  /** @type {Record<string, Partial<ProductMasterCenterRowVm>>} */
  const [drafts, setDrafts] = useState({})
  const [quickFilter, setQuickFilter] = useState(/** @type {ProductMasterQuickFilterId} */ ('all'))
  const [listView, setListView] = useState(/** @type {'table' | 'cards'} */ ('table'))
  const { scope, setScope, canToggle, modeHint } = usePilotDataMode()

  const canWrite = useMemo(() => {
    const role = getCurrentAuthUser()?.role
    return role === 'ADMIN' || role === 'MANAGER'
  }, [])

  const isManagerView = useMemo(() => {
    const role = getCurrentAuthUser()?.role
    return role === 'ADMIN' || role === 'MANAGER'
  }, [])

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await productMasterClient.listProductMaster({
        pageSize: CATALOG_PAGE_SIZE,
      })
      setView(productMasterClient.toProductMasterCenterView(res))
    } catch (e) {
      setError(formatApiErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      void load()
    })
    return () => cancelAnimationFrame(id)
  }, [load])

  useEffect(() => {
    if (!canWrite) return
    void suppliersClient
      .listSuppliers({ activeOnly: false })
      .then((rows) => setSuppliers(rows))
      .catch(() => {})
  }, [canWrite])

  const filteredItems = useMemo(() => {
    if (!view) return []
    const searched = searchMasterCenterProducts(view.items, search)
    const scoped = applyPilotScope(searched, scope, getProductPilotKind)
    return filterProductMasterItems(scoped, quickFilter)
  }, [view, search, scope, quickFilter])

  const quickFilterCounts = useMemo(() => {
    if (!view) return {}
    const searched = searchMasterCenterProducts(view.items, search)
    const scoped = applyPilotScope(searched, scope, getProductPilotKind)
    return countProductMasterQuickFilters(scoped)
  }, [view, search, scope])

  const healthSummaryMetrics = useMemo(() => {
    if (!view) return []
    const searched = searchMasterCenterProducts(view.items, search)
    const scoped = applyPilotScope(searched, scope, getProductPilotKind)
    return buildProductHealthSummaryMetrics(scoped)
  }, [view, search, scope])

  const coreSummaryMetrics = useMemo(() => {
    if (!view) return []
    const healthIds = new Set(['health-full', 'health-low', 'missing-media', 'missing-variant'])
    return view.summaryMetrics.filter((m) => !healthIds.has(m.id))
  }, [view])

  const displayQuickFilters = useMemo(
    () => PRODUCT_MASTER_QUICK_FILTERS.filter((f) => f.id !== 'all'),
    [],
  )

  const selectedProduct = useMemo(
    () => filteredItems.find((p) => p.id === selectedId) ?? null,
    [filteredItems, selectedId],
  )

  const colCount = isManagerView ? 12 : 9

  /** @param {Partial<ProductMasterCenterRowVm>} patch */
  function handleDraftChange(patch) {
    if (!selectedId) return
    setDrafts((prev) => ({
      ...prev,
      [selectedId]: { ...prev[selectedId], ...patch },
    }))
  }

  function handleNewProduct() {
    setFormError(null)
    setFormState(emptyProductMasterForm())
    setVariants([])
    setEditWoo(null)
    setFormMode('create')
    setFormOpen(true)
    setDrawerOpen(false)
    setSelectedId(null)
  }

  /** @param {string} id */
  async function handleRowSelect(id) {
    setSelectedId(id)
    setFormError(null)
    if (canWrite) {
      try {
        const detail = await productMasterClient.getProductMaster(id)
        const rowVm = mapProductMasterDtoToRowVm(detail)
        setFormState(productToFormState(rowVm, drafts[id] ?? {}))
        setVariants(detail.variants ?? [])
        setEditWoo(detail.woo ?? null)
        setFormMode('edit')
        setFormOpen(true)
        setDrawerOpen(false)
      } catch (e) {
        setError(formatApiErrorMessage(e))
      }
    } else {
      setFormOpen(false)
      setDrawerOpen(true)
    }
  }

  function closeForm() {
    setFormOpen(false)
    setFormError(null)
  }

  async function handleSaveForm() {
    const validationError = validateForm(formState)
    if (validationError) {
      setFormError(validationError)
      return
    }
    setSaving(true)
    setFormError(null)
    try {
      const payload = buildProductMasterWritePayload(formState)
      if (formMode === 'create') {
        const created = await productMasterClient.createProductMaster(payload)
        setFormOpen(false)
        await load()
        setSelectedId(created.id)
        setDrawerOpen(false)
      } else if (selectedId) {
        await productMasterClient.patchProductMaster(selectedId, payload)
        setDrafts((prev) => {
          const next = { ...prev }
          delete next[selectedId]
          return next
        })
        setFormOpen(false)
        await load()
      }
    } catch (e) {
      setFormError(formatApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function handlePassive() {
    if (!selectedId) return
    setSaving(true)
    setFormError(null)
    try {
      await productMasterClient.patchProductMaster(selectedId, {
        publishStatus: PUBLISH_STATUS.PASSIVE,
      })
      setFormState((prev) => ({ ...prev, publishStatus: PUBLISH_STATUS.PASSIVE }))
      setFormOpen(false)
      await load()
    } catch (e) {
      setFormError(formatApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  /** @param {Record<string, unknown>} payload */
  async function handleCreateVariant(payload) {
    if (!selectedId) return
    setSaving(true)
    setFormError(null)
    try {
      const created = await productMasterClient.createProductVariant(selectedId, payload)
      setVariants((prev) => [...prev, created])
      await load()
    } catch (e) {
      setFormError(formatApiErrorMessage(e))
      throw e
    } finally {
      setSaving(false)
    }
  }

  /** @param {string} variantId @param {Record<string, unknown>} payload */
  async function handleUpdateVariant(variantId, payload) {
    if (!selectedId) return
    setSaving(true)
    setFormError(null)
    try {
      const updated = await productMasterClient.patchProductVariant(selectedId, variantId, payload)
      setVariants((prev) => prev.map((v) => (v.id === variantId ? updated : v)))
      await load()
    } catch (e) {
      setFormError(formatApiErrorMessage(e))
      throw e
    } finally {
      setSaving(false)
    }
  }

  /** @param {string} variantId */
  async function handlePassiveVariant(variantId) {
    if (!selectedId) return
    setSaving(true)
    setFormError(null)
    try {
      await productMasterClient.patchProductVariant(selectedId, variantId, { isActive: false })
      setVariants((prev) => prev.filter((v) => v.id !== variantId))
      await load()
    } catch (e) {
      setFormError(formatApiErrorMessage(e))
      throw e
    } finally {
      setSaving(false)
    }
  }

  async function handlePrepareWooSync() {
    if (!selectedId) return
    setSaving(true)
    setFormError(null)
    try {
      const updated = await productMasterClient.prepareWooSync(selectedId)
      setEditWoo(updated.woo ?? null)
      await load()
    } catch (e) {
      setFormError(formatApiErrorMessage(e))
    } finally {
      setSaving(false)
    }
  }

  async function handlePublishWooDraft() {
    if (!selectedId) return
    setSaving(true)
    setFormError(null)
    try {
      const updated = await productMasterClient.publishWooDraft(selectedId)
      setEditWoo(updated.woo ?? null)
      await load()
    } catch (e) {
      setFormError(formatApiErrorMessage(e))
      await load()
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <LoadingBlock title="Ürün Master Merkezi yükleniyor" hint="Single Source of Truth ürün omurgası" />
  }

  return (
    <div
      className={
        embedded
          ? 'mos-hub-pane mos-erp-ops mos-erp-ops--product-master-center'
          : 'mos-page mos-erp-ops mos-erp-ops--product-master-center'
      }
    >
      {!embedded ? (
        <header className="mos-erp-ops__head">
          <div className="mos-erp-ops__head-copy">
            <h1 className="mos-erp-ops__title">Ürün Master Merkezi</h1>
            <span className="mos-erp-ops__sub">
              Single Source of Truth · bir ürün yalnızca 1 kez girilir · {filteredItems.length} kayıt ·{' '}
              {getDataSourceDisplay().label}
            </span>
          </div>
        </header>
      ) : null}

      {error ? (
        <p className="mos-erp-ops__alert" role="alert">
          {error}
        </p>
      ) : null}

      {view ? (
        <SectionErrorBoundary label="Ürün özeti">
          <ErpOpsSummaryStrip
            metrics={coreSummaryMetrics}
            ariaLabel="Ürün master özeti"
            summaryClassName="mos-erp-summary--cols-6"
          />
          <ErpOpsSummaryStrip
            metrics={healthSummaryMetrics}
            ariaLabel="Ürün sağlık özeti"
            summaryClassName="mos-erp-summary--cols-4 mos-erp-summary--health"
          />
        </SectionErrorBoundary>
      ) : null}

      <SectionErrorBoundary label="Ürün listesi">
      <div className="mos-pmc-workspace">
        <section className="mos-pmc-list" aria-label="Ürün listesi">
          <div className="mos-pmc-list__toolbar">
            <input
              type="search"
              className="mos-erp-filters__search"
              placeholder="Ürün adı, kod, barkod, marka…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              aria-label="Ürün ara"
            />
            <PilotScopeToggle
              scope={scope}
              onScopeChange={setScope}
              canToggle={canToggle}
              hint={modeHint}
            />
            <div className="mos-pmc-list__toolbar-actions">
              <div className="mos-pmc-view-toggle" role="group" aria-label="Liste görünümü">
                <button
                  type="button"
                  className={`mos-pmc-view-toggle__btn${listView === 'table' ? ' is-active' : ''}`}
                  onClick={() => setListView('table')}
                >
                  Tablo
                </button>
                <button
                  type="button"
                  className={`mos-pmc-view-toggle__btn${listView === 'cards' ? ' is-active' : ''}`}
                  onClick={() => setListView('cards')}
                >
                  Kart
                </button>
              </div>
              {canWrite ? (
                <MosButton context="head" tone="primary" label="Yeni Ürün" onClick={handleNewProduct}>
                  <IconPlus />
                  Yeni Ürün
                </MosButton>
              ) : null}
            </div>
          </div>

          <div
            className="mos-pmc-list__quick-filters mos-erp-ops__quick-filters"
            role="toolbar"
            aria-label="Ürün hızlı filtreleri"
          >
            {displayQuickFilters.map((filter) => (
              <button
                key={filter.id}
                type="button"
                className={`mos-erp-ops__quick-filter${quickFilter === filter.id ? ' is-active' : ''}`}
                onClick={() =>
                  setQuickFilter((prev) =>
                    prev === filter.id ? 'all' : /** @type {ProductMasterQuickFilterId} */ (filter.id),
                  )
                }
              >
                <span>{filter.label}</span>
                <span className="mos-erp-ops__quick-filter-count">
                  {quickFilterCounts[filter.id] ?? 0}
                </span>
              </button>
            ))}
          </div>

          <div
            className={`mos-erp-tbl-wrap mos-pmc-list__table${listView === 'cards' ? ' is-hidden' : ''}`}
          >
            <table className="mos-erp-tbl mos-erp-tbl--pmc">
              <thead>
                <tr>
                  <th className="mos-pmc-th--thumb" aria-label="Görsel" />
                  <th>Ürün Adı</th>
                  <th className="mos-pmc-col--desk">Kod</th>
                  <th className="mos-pmc-col--desk">Marka</th>
                  <th className="mos-pmc-col--desk">Kategori</th>
                  <th className="mos-pmc-col--desk">Tedarikçi</th>
                  {isManagerView ? (
                    <>
                      <th className="is-num mos-pmc-col--desk">Alış Fiyatı</th>
                      <th className="is-num mos-pmc-col--tablet-price">Fiyat</th>
                      <th className="is-num mos-pmc-col--desk">Kar</th>
                      <th className="is-num mos-pmc-col--desk">Kar %</th>
                    </>
                  ) : (
                    <th className="is-num mos-pmc-col--tablet-price">Fiyat</th>
                  )}
                  <th>Sağlık</th>
                  <th>Durum</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr className="mos-erp-tbl-empty">
                    <td colSpan={colCount}>Bu aramada ürün bulunamadı.</td>
                  </tr>
                ) : (
                  filteredItems.map((p, idx) => {
                    const draft = drafts[p.id] ?? {}
                    const status = draft.publishStatus ?? p.publishStatus
                    const label = PUBLISH_STATUS_LABELS[status]
                    const profitCritical = p.profitAmount <= 0
                    const pilotKind = getProductPilotKind(p)
                    const thumbUrl = p.media?.mainImageUrl ?? p.thumbnailUrl
                    return (
                      <tr
                        key={p.id}
                        className={`mos-erp-tbl-row mos-pmc-row${idx % 2 === 1 ? ' is-zebra' : ''}${selectedId === p.id && (drawerOpen || formOpen) ? ' is-selected' : ''}${pilotKind ? ' is-pilot-record' : ''}`}
                        onClick={() => handleRowSelect(p.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            handleRowSelect(p.id)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-selected={selectedId === p.id && (drawerOpen || formOpen)}
                      >
                        <td className="mos-pmc-td--thumb">
                          <ProductMasterThumbnail name={draft.name ?? p.name} url={thumbUrl} />
                        </td>
                        <td className="mos-pmc-td--name">
                          {draft.name ?? p.name}
                          <PilotRecordBadge kind={pilotKind} />
                          {productHasMissingMedia(p) ? (
                            <span className="mos-pmc-missing-media-tag">Eksik Medya</span>
                          ) : null}
                        </td>
                        <td className="mos-pmc-td--code mos-pmc-col--desk">{p.productCode}</td>
                        <td className="mos-pmc-col--desk">{draft.brand ?? p.brand}</td>
                        <td className="mos-pmc-col--desk">{p.category}</td>
                        <td className="mos-pmc-td--supplier mos-pmc-col--desk">{p.supplierName ?? '—'}</td>
                        {isManagerView ? (
                          <>
                            <td className="is-num mos-pmc-col--desk">{p.purchaseCostFormatted}</td>
                            <td className="is-num mos-pmc-col--tablet-price">{p.salePriceFormatted}</td>
                            <td className={`is-num mos-pmc-td--profit mos-pmc-col--desk${profitCritical ? ' is-critical' : ''}`}>
                              {p.profitAmountFormatted}
                            </td>
                            <td className={`is-num mos-pmc-td--profit mos-pmc-col--desk${profitCritical ? ' is-critical' : ''}`}>
                              {p.profitPercentFormatted}
                            </td>
                          </>
                        ) : (
                          <td className="is-num mos-pmc-col--tablet-price">{p.listPriceFormatted}</td>
                        )}
                        <td className="mos-pmc-td--health">
                          <ProductMasterHealthBadge product={p} compact />
                        </td>
                        <td>
                          <span className={statusPillClass(status)}>{label}</span>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className={`mos-pmc-list__cards${listView === 'table' ? ' is-hidden' : ''}`}>
            <ProductMasterCardGrid
              items={filteredItems}
              drafts={drafts}
              selectedId={selectedId}
              isManagerView={isManagerView}
              onSelect={handleRowSelect}
            />
          </div>
        </section>

        {canWrite ? (
          <ProductMasterFormDrawer
            open={formOpen}
            mode={formMode}
            form={formState}
            saving={saving}
            error={formError}
            suppliers={suppliers}
            variants={variants}
            onClose={closeForm}
            onChange={(patch) => setFormState((prev) => ({ ...prev, ...patch }))}
            onSave={() => void handleSaveForm()}
            onPassive={formMode === 'edit' ? () => void handlePassive() : undefined}
            onCreateVariant={formMode === 'edit' ? handleCreateVariant : undefined}
            onUpdateVariant={formMode === 'edit' ? handleUpdateVariant : undefined}
            onPassiveVariant={formMode === 'edit' ? handlePassiveVariant : undefined}
            productId={selectedId}
            onMediaSaved={() => void load()}
            woo={editWoo ?? selectedProduct?.woo ?? null}
            onPrepareWooSync={() => void handlePrepareWooSync()}
            onPublishWooDraft={() => void handlePublishWooDraft()}
            healthProduct={selectedProduct}
          />
        ) : (
          <ProductDetailErpDrawer
            open={drawerOpen && Boolean(selectedProduct)}
            product={selectedProduct}
            draft={selectedId ? (drafts[selectedId] ?? {}) : {}}
            isManagerView={isManagerView}
            onClose={() => setDrawerOpen(false)}
            onDraftChange={handleDraftChange}
          />
        )}
      </div>
      </SectionErrorBoundary>
    </div>
  )
}
