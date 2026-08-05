import { useCallback, useEffect, useMemo, useState } from 'react'
import { IconPlus } from '../components/Icons.jsx'
import LoadingBlock from '../components/LoadingBlock.jsx'
import ProductFormModal from '../features/products/ProductFormModal.jsx'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import ErpOpsLeftFilters from '../components/erp-ops/ErpOpsLeftFilters.jsx'
import { getDataSourceDisplay } from '../config/dataSource.js'
import { erpOpsButtonClass, erpDetailActionClass, erpTableOpClass } from '../lib/actionButtonVariants.js'
import * as productsClient from '../services/productsClient.js'
import * as suppliersClient from '../services/suppliersClient.js'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import {
  buildProductFilterGroups,
  buildProductsOpsSummary,
  countProductFilter,
  filterProductsByFilterId,
  formatProductMoney,
  formatProductUpdatedLabel,
  isProductIncomplete,
  PRODUCT_STATUS_FILTERS,
  productMarginPercent,
  productMarginTone,
  searchProducts,
} from '../features/products/productsOpsCenterUi.js'
import '../styles/products.css'

/** @typedef {import('../contracts/v1/product.js').ProductListItemDto} ProductListItemDto */
/** @typedef {import('../contracts/v1/product.js').ProductDetailDto} ProductDetailDto */
/** @typedef {import('../features/products/productsOpsCenterUi.js').ProductsFilterId} ProductsFilterId */

const CATALOG_PAGE_SIZE = 100

/**
 * @param {{ embedded?: boolean }} [props]
 */
export default function ProductsPage({ embedded = false }) {
  const [items, setItems] = useState(/** @type {ProductListItemDto[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))
  const [suppliers, setSuppliers] = useState(
    /** @type {import('../contracts/v1/supplier.js').SupplierListItemDto[]} */ ([]),
  )
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState(/** @type {ProductDetailDto | null} */ (null))
  const [activeFilter, setActiveFilter] = useState(/** @type {ProductsFilterId} */ ('all'))
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState(/** @type {string | null} */ (null))

  const load = useCallback(async () => {
    setError(null)
    try {
      const res = await productsClient.listProducts({
        activeOnly: false,
        pageSize: CATALOG_PAGE_SIZE,
      })
      setItems(res.items)
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
    void suppliersClient.listSuppliers({ activeOnly: false }).then(setSuppliers).catch(() => {})
  }, [])

  const searchedItems = useMemo(() => searchProducts(items, search), [items, search])

  const filteredItems = useMemo(
    () => filterProductsByFilterId(searchedItems, activeFilter),
    [searchedItems, activeFilter],
  )

  const summaryMetrics = useMemo(() => buildProductsOpsSummary(items), [items])

  const filterGroups = useMemo(() => buildProductFilterGroups(items), [items])

  const filterCounts = useMemo(() => {
    /** @type {Record<string, number>} */
    const counts = {}
    for (const group of filterGroups) {
      for (const f of group.options) {
        counts[f.id] = countProductFilter(searchedItems, /** @type {ProductsFilterId} */ (f.id))
      }
    }
    return counts
  }, [filterGroups, searchedItems])

  const selectedProduct = useMemo(
    () => filteredItems.find((p) => p.id === selectedId) ?? filteredItems[0] ?? null,
    [filteredItems, selectedId],
  )

  useEffect(() => {
    if (filteredItems.length === 0) {
      setSelectedId(null)
      return
    }
    if (!filteredItems.some((p) => p.id === selectedId)) {
      setSelectedId(filteredItems[0].id)
    }
  }, [filteredItems, selectedId])

  async function handleCreate(body) {
    setMutating(true)
    setError(null)
    try {
      await productsClient.createProduct(body)
      setFormOpen(false)
      await load()
    } catch (e) {
      setError(formatApiErrorMessage(e))
      throw e
    } finally {
      setMutating(false)
    }
  }

  async function handleUpdate(body) {
    if (!editing) return
    setMutating(true)
    setError(null)
    try {
      await productsClient.patchProduct(editing.id, body)
      setEditing(null)
      await load()
    } catch (e) {
      setError(formatApiErrorMessage(e))
      throw e
    } finally {
      setMutating(false)
    }
  }

  /** @param {ProductListItemDto} p */
  async function handleToggleActive(p) {
    if (p.isActive && !window.confirm(`"${p.productName}" pasife alınsın mı?`)) return
    setMutating(true)
    try {
      await productsClient.patchProduct(p.id, { isActive: !p.isActive })
      await load()
    } catch (e) {
      setError(formatApiErrorMessage(e))
    } finally {
      setMutating(false)
    }
  }

  /** @param {ProductListItemDto} p */
  async function handleDuplicate(p) {
    setMutating(true)
    try {
      await productsClient.duplicateProduct(p.id)
      await load()
    } catch (e) {
      setError(formatApiErrorMessage(e))
    } finally {
      setMutating(false)
    }
  }

  /** @param {ProductListItemDto} p */
  async function openEdit(p) {
    setMutating(true)
    try {
      const detail = await productsClient.getProduct(p.id)
      setEditing(detail)
    } catch (e) {
      setError(formatApiErrorMessage(e))
    } finally {
      setMutating(false)
    }
  }

  /** @param {string} metricId */
  function handleSummaryClick(metricId) {
    if (metricId === 'active') setActiveFilter('active')
    else if (metricId === 'incomplete') setActiveFilter('incomplete')
    else if (metricId === 'passive') setActiveFilter('passive')
    else setActiveFilter('all')
  }

  if (loading) {
    return <LoadingBlock title="Ürün kartları yükleniyor" hint="Katalog master v1" />
  }

  return (
    <div
      className={
        embedded ? 'mos-hub-pane mos-erp-ops mos-erp-ops--products' : 'mos-page mos-erp-ops mos-erp-ops--products'
      }
    >
      {!embedded ? (
        <header className="mos-erp-ops__head">
          <div className="mos-erp-ops__head-copy">
            <h1 className="mos-erp-ops__title">Ürün Kartları</h1>
            <span className="mos-erp-ops__sub">
              Ürün master listesi · {filteredItems.length} kayıt · {getDataSourceDisplay().label}
            </span>
          </div>
          <div className="mos-erp-ops__head-actions">
            <button
              type="button"
              className={erpOpsButtonClass('Yeni ürün kartı')}
              onClick={() => setFormOpen(true)}
            >
              <IconPlus />
              Yeni ürün kartı
            </button>
          </div>
        </header>
      ) : (
        <div className="mos-hub-pane__toolbar">
          <button
            type="button"
            className={erpOpsButtonClass('Yeni ürün kartı')}
            onClick={() => setFormOpen(true)}
          >
            <IconPlus />
            Yeni ürün kartı
          </button>
        </div>
      )}

      {error ? (
        <p className="mos-erp-ops__alert" role="alert">
          {error}
        </p>
      ) : null}

      <ErpOpsSummaryStrip
        metrics={summaryMetrics}
        ariaLabel="Ürün master özeti"
        onMetricClick={handleSummaryClick}
      />

      <div className="mos-erp-ops__workspace">
        <aside className="mos-erp-filters" aria-label="Ürün filtreleri">
          <input
            type="search"
            className="mos-erp-filters__search"
            placeholder="Ürün adı, kod, kategori, tedarikçi…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label="Ürün ara"
          />
          <ErpOpsLeftFilters
            embedded
            groups={filterGroups}
            activeFilter={activeFilter}
            filterCounts={filterCounts}
            onFilterChange={(id) => setActiveFilter(/** @type {ProductsFilterId} */ (id))}
          />
        </aside>

        <div className="mos-erp-ops__main">
          <ProductDetailStrip
            product={selectedProduct}
            mutating={mutating}
            onEdit={() => selectedProduct && void openEdit(selectedProduct)}
            onToggleActive={() => selectedProduct && void handleToggleActive(selectedProduct)}
            onDuplicate={() => selectedProduct && void handleDuplicate(selectedProduct)}
          />

          <section className="mos-erp-ops__table-panel mos-erp-ops__products-table" aria-label="Ürün listesi">
            <div className="mos-erp-tbl-wrap">
              <table className="mos-erp-tbl mos-erp-tbl--products">
                <thead>
                  <tr>
                    <th>Ürün Kodu</th>
                    <th>Ürün Adı</th>
                    <th>Kategori</th>
                    <th>Tedarikçi</th>
                    <th className="is-num">Alış Fiyatı</th>
                    <th className="is-num">Satış Fiyatı</th>
                    <th className="is-num">Kâr %</th>
                    <th>Durum</th>
                    <th>Son Güncelleme</th>
                    <th className="is-ops">İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredItems.length === 0 ? (
                    <tr className="mos-erp-tbl-empty">
                      <td colSpan={10}>Bu filtrede ürün yok.</td>
                    </tr>
                  ) : (
                    filteredItems.map((p) => (
                      <ProductTableRow
                        key={p.id}
                        product={p}
                        selected={selectedProduct?.id === p.id}
                        mutating={mutating}
                        onSelect={() => setSelectedId(p.id)}
                        onEdit={() => void openEdit(p)}
                        onToggleActive={() => void handleToggleActive(p)}
                      />
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>

      <ProductFormModal
        open={formOpen}
        suppliers={suppliers}
        saving={mutating}
        error={error}
        onClose={() => setFormOpen(false)}
        onSubmit={handleCreate}
      />
      <ProductFormModal
        open={Boolean(editing)}
        initial={editing}
        suppliers={suppliers}
        saving={mutating}
        error={error}
        onClose={() => setEditing(null)}
        onSubmit={handleUpdate}
      />
    </div>
  )
}

/**
 * @param {{
 *   product: ProductListItemDto | null
 *   mutating: boolean
 *   onEdit: () => void
 *   onToggleActive: () => void
 *   onDuplicate: () => void
 * }} props
 */
function ProductDetailStrip({ product, mutating, onEdit, onToggleActive, onDuplicate }) {
  if (!product) {
    return (
      <section className="mos-erp-detail mos-erp-detail--empty" aria-label="Seçili ürün">
        <p className="mos-erp-detail__empty">Tablodan ürün seçin.</p>
      </section>
    )
  }

  const tone = productMarginTone(product)
  const statusClass = product.isActive ? '' : ' mos-erp-detail__field-value--warning'

  return (
    <section className="mos-erp-detail" aria-label="Seçili ürün">
      <div className="mos-erp-detail__grid">
        <div className="mos-erp-detail__body">
          <div className="mos-erp-detail__primary">
            <h2 className="mos-erp-detail__name">{product.productName}</h2>
            <span className="mos-erp-detail__meta">
              {product.productCode}
              {isProductIncomplete(product) ? ' · Eksik bilgi' : ''}
            </span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Kategori</span>
            <span className="mos-erp-detail__field-value">{product.category || '—'}</span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Tedarikçi</span>
            <span className="mos-erp-detail__field-value">
              {product.defaultSupplierName ?? 'Atanmadı'}
            </span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Satış fiyatı</span>
            <span className="mos-erp-detail__field-value">
              {formatProductMoney(product.defaultSalePrice)}
            </span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Alış fiyatı</span>
            <span className="mos-erp-detail__field-value">
              {formatProductMoney(product.purchasePrice)}
            </span>
          </div>
          <div className="mos-erp-detail__field mos-erp-detail__field--emphasis">
            <span className="mos-erp-detail__field-label">Durum</span>
            <span className={`mos-erp-detail__field-value${statusClass}`}>
              {product.isActive ? 'Aktif' : 'Pasif'}
            </span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Son güncelleme</span>
            <span className="mos-erp-detail__field-value">{formatProductUpdatedLabel(product)}</span>
          </div>
          <div className="mos-erp-detail__field">
            <span className="mos-erp-detail__field-label">Kâr %</span>
            <span
              className={`mos-erp-detail__field-value${
                tone === 'critical'
                  ? ' mos-erp-detail__field-value--critical'
                  : tone === 'warning'
                    ? ' mos-erp-detail__field-value--warning'
                    : ''
              }`}
            >
              %{productMarginPercent(product)}
            </span>
          </div>
        </div>
        <div className="mos-erp-detail__actions">
          <button
            type="button"
            className={erpDetailActionClass('Düzenle')}
            disabled={mutating}
            onClick={onEdit}
          >
            Düzenle
          </button>
          <button
            type="button"
            className={erpDetailActionClass(product.isActive ? 'Pasifleştir' : 'Aktifleştir')}
            disabled={mutating}
            onClick={onToggleActive}
          >
            {product.isActive ? 'Pasifleştir' : 'Aktifleştir'}
          </button>
          <button
            type="button"
            className={erpDetailActionClass('Kopyala')}
            disabled={mutating}
            onClick={onDuplicate}
          >
            Kopyala
          </button>
        </div>
      </div>
    </section>
  )
}

/**
 * @param {{
 *   product: ProductListItemDto
 *   selected: boolean
 *   mutating: boolean
 *   onSelect: () => void
 *   onEdit: () => void
 *   onToggleActive: () => void
 * }} props
 */
function ProductTableRow({ product, selected, mutating, onSelect, onEdit, onToggleActive }) {
  const tone = productMarginTone(product)
  const incomplete = isProductIncomplete(product)

  const rowClass = [
    'mos-erp-tbl-row',
    selected ? 'is-selected' : '',
    incomplete ? 'is-warning' : '',
  ]
    .filter(Boolean)
    .join(' ')

  const marginClass = [
    'mos-erp-tbl-td',
    'is-num',
    'mos-erp-tbl-td--status',
    tone === 'critical' ? 'is-critical' : '',
    tone === 'warning' ? 'is-warning' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <tr
      className={rowClass}
      onClick={onSelect}
      tabIndex={0}
      role="button"
      aria-selected={selected}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          onSelect()
        }
      }}
    >
      <td className="mos-erp-tbl-td mos-erp-tbl-td--order">{product.productCode}</td>
      <td className="mos-erp-tbl-td mos-erp-tbl-td--customer">{product.productName}</td>
      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{product.category || '—'}</td>
      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">
        {product.defaultSupplierName ?? 'Atanmadı'}
      </td>
      <td className="mos-erp-tbl-td is-num">{formatProductMoney(product.purchasePrice)}</td>
      <td className="mos-erp-tbl-td is-num">{formatProductMoney(product.defaultSalePrice)}</td>
      <td className={marginClass}>%{productMarginPercent(product)}</td>
      <td
        className={`mos-erp-tbl-td mos-erp-tbl-td--status${product.isActive ? ' is-success' : ''}`}
      >
        {product.isActive ? 'Aktif' : 'Pasif'}
      </td>
      <td className="mos-erp-tbl-td mos-erp-tbl-td--muted">{formatProductUpdatedLabel(product)}</td>
      <td className="mos-erp-tbl-td is-ops">
        <div className="mos-erp-tbl-ops">
          <button
            type="button"
            className={erpTableOpClass('Düzenle')}
            disabled={mutating}
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
          >
            Düzenle
          </button>
          <button
            type="button"
            className={erpTableOpClass(product.isActive ? 'Pasifleştir' : 'Aktifleştir')}
            disabled={mutating}
            onClick={(e) => {
              e.stopPropagation()
              onToggleActive()
            }}
          >
            {product.isActive ? 'Pasifleştir' : 'Aktifleştir'}
          </button>
        </div>
      </td>
    </tr>
  )
}
