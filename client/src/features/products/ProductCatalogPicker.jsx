import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { CATALOG_PICKER_PAGE_SIZE } from '../../constants/productCatalog.js'
import { formatTry } from '../../data/dashboardHelpers.js'
import { useModalDismiss } from '../../hooks/useModalDismiss.js'
import { useViewportTier } from '../../hooks/useViewportTier.js'
import CatalogPickerCategoryNav from './catalogPicker/CatalogPickerCategoryNav.jsx'
import CatalogPickerFooter from './catalogPicker/CatalogPickerFooter.jsx'
import CatalogPickerPagination from './catalogPicker/CatalogPickerPagination.jsx'
import CatalogPickerProductTable from './catalogPicker/CatalogPickerProductTable.jsx'
import {
  CATALOG_PICKER_WIZARD_CONFIRM_LABEL,
  computeCatalogSelectionTotal,
  emptyCatalogPickerQuery,
  toggleCatalogSelection,
} from './catalogPicker/catalogPickerModel.js'
import { useCatalogCategoryCounts } from './catalogPicker/useCatalogCategoryCounts.js'
import { useCatalogPickerProducts } from './catalogPicker/useCatalogPickerProducts.js'
import '../../styles/product-catalog-picker.css'

/** @typedef {import('../../contracts/v1/product.js').ProductListItemDto} ProductListItemDto */

/**
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   onSelect?: (product: ProductListItemDto) => void
 *   onConfirm?: (products: ProductListItemDto[]) => void
 *   selectionMode?: 'cart' | 'immediate'
 *   confirmLabel?: string
 *   title?: string
 *   subtitle?: string
 * }} props
 */
export default function ProductCatalogPicker({
  open,
  onClose,
  onSelect,
  onConfirm,
  selectionMode = onConfirm ? 'cart' : 'immediate',
  confirmLabel = CATALOG_PICKER_WIZARD_CONFIRM_LABEL,
  title = 'Katalogdan Ürün Seç',
  subtitle = 'Eklemek istediğiniz ürünü seçin. Fiyat ve tedarikçi bilgileri otomatik gelecektir.',
}) {
  const [query, setQuery] = useState(emptyCatalogPickerQuery)
  const [page, setPage] = useState(1)
  const [selected, setSelected] = useState(/** @type {ProductListItemDto[]} */ ([]))
  const [mobileItems, setMobileItems] = useState(/** @type {ProductListItemDto[]} */ ([]))
  const [mobileInitialLoadedCount, setMobileInitialLoadedCount] = useState(0)
  const mobileLoadLockRef = useRef(false)
  const viewportTier = useViewportTier()
  const isPhone = viewportTier === 'phone'

  useModalDismiss(open, onClose)

  const { countsByKey, catalogTotal, countsReady } = useCatalogCategoryCounts(open)
  const { data, loading, error, totalPages } = useCatalogPickerProducts(
    open,
    query.q,
    query.category,
    page,
  )

  useEffect(() => {
    if (!open) return
    setQuery(emptyCatalogPickerQuery())
    setPage(1)
    setSelected([])
    setMobileItems([])
    setMobileInitialLoadedCount(0)
    mobileLoadLockRef.current = false
  }, [open])

  useEffect(() => {
    setPage(1)
    setMobileItems([])
    setMobileInitialLoadedCount(0)
    mobileLoadLockRef.current = false
  }, [query.category, query.q])

  useEffect(() => {
    if (!open || !isPhone || !data) return
    if (page === 1) {
      const firstPageItems = data.items ?? []
      setMobileItems(firstPageItems)
      setMobileInitialLoadedCount(firstPageItems.length)
      return
    }
    setMobileItems((prev) => {
      const merged = [...prev]
      const seen = new Set(prev.map((item) => item.id))
      for (const item of data.items ?? []) {
        if (seen.has(item.id)) continue
        seen.add(item.id)
        merged.push(item)
      }
      return merged
    })
  }, [open, isPhone, data, page])

  useEffect(() => {
    if (!loading) mobileLoadLockRef.current = false
  }, [loading])

  const selectedIdSet = useMemo(() => new Set(selected.map((p) => p.id)), [selected])
  const selectionTotal = useMemo(() => computeCatalogSelectionTotal(selected), [selected])
  const renderedItems = isPhone ? mobileItems : (data?.items ?? [])

  const hasMoreMobilePages = Boolean(
    isPhone &&
      data &&
      renderedItems.length < data.total &&
      page < (data.totalPages ?? totalPages),
  )

  const handleMobileListScroll = useCallback(
    (e) => {
      if (!isPhone || !open || !data) return
      if (loading || mobileLoadLockRef.current) return
      if (renderedItems.length >= data.total) return
      if (page >= (data.totalPages ?? totalPages)) return

      const node = e.currentTarget
      const thresholdPx = 140
      const remaining = node.scrollHeight - node.scrollTop - node.clientHeight
      if (remaining > thresholdPx) return

      mobileLoadLockRef.current = true
      setPage((prev) => {
        const next = prev + 1
        const maxPage = data.totalPages ?? totalPages
        return next > maxPage ? prev : next
      })
    },
    [isPhone, open, data, loading, renderedItems.length, page, totalPages],
  )

  const handleCategorySelect = useCallback((categoryValue) => {
    setQuery((prev) => ({ ...prev, category: categoryValue }))
  }, [])

  const handleToggle = useCallback(
    (product) => {
      if (selectionMode === 'immediate' && onSelect) {
        onSelect(product)
        onClose()
        return
      }
      setSelected((prev) => toggleCatalogSelection(prev, product))
    },
    [selectionMode, onSelect, onClose],
  )

  const handleConfirm = useCallback(() => {
    if (!selected.length) return
    if (onConfirm) {
      onConfirm(selected)
      onClose()
      return
    }
    if (onSelect && selected.length === 1) {
      onSelect(selected[0])
      onClose()
    }
  }, [selected, onConfirm, onSelect, onClose])

  const showEmptyCatalog =
    countsReady && catalogTotal === 0 && !loading && !query.q.trim()

  const showEmptyCategory =
    !showEmptyCatalog &&
    !loading &&
    data &&
    data.total === 0 &&
    !query.q.trim() &&
    Boolean(query.category)

  if (!open) return null

  const modal = (
    <div className="catalog-picker-root" role="presentation">
      <button type="button" className="catalog-picker-backdrop" aria-label="Kapat" onClick={onClose} />
      <div
        className="catalog-picker-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="catalog-picker-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <header className="catalog-picker-header">
          <div>
            <h2 id="catalog-picker-title" className="catalog-picker-header__title">
              {title}
            </h2>
            {subtitle ? <p className="catalog-picker-header__subtitle">{subtitle}</p> : null}
          </div>
          <button type="button" className="catalog-picker-header__close" aria-label="Kapat" onClick={onClose}>
            ×
          </button>
        </header>

        <div className="catalog-picker-body">
          <CatalogPickerCategoryNav
            activeCategory={query.category}
            countsByKey={countsByKey}
            onSelect={(categoryValue) => handleCategorySelect(categoryValue)}
          />

          <section className="catalog-picker-main" aria-label="Ürün listesi">
            {showEmptyCatalog ? (
              <p className="catalog-picker-empty" role="status">
                Katalogda ürün yok. Önce <strong>Ürün Kartları</strong> ekranından ürün ekleyin veya backend{' '}
                <code>seed</code> çalıştırın.
              </p>
            ) : (
              <>
                <div className="catalog-picker-main__toolbar">
                  <input
                    type="search"
                    className="mos-input catalog-picker-search"
                    placeholder="Ürün adı, kod veya kategori ara..."
                    value={query.q}
                    onChange={(e) => setQuery((prev) => ({ ...prev, q: e.target.value }))}
                    aria-label="Ürün ara"
                  />
                </div>

                {error ? <p className="mos-api-error-text">{error}</p> : null}

                <CatalogPickerProductTable
                  items={data?.items ?? []}
                  loading={loading}
                  emptyMessage="Bu filtrede ürün bulunamadı"
                  onToggle={handleToggle}
                  selectedIds={selectedIdSet}
                />

                <CatalogPickerMobileCardList
                  items={renderedItems}
                  loading={loading && renderedItems.length === 0}
                  loadingMore={loading && renderedItems.length > 0 && hasMoreMobilePages}
                  onScroll={handleMobileListScroll}
                  emptyMessage="Bu filtrede ürün bulunamadı"
                  onToggle={handleToggle}
                  selectedIds={selectedIdSet}
                />

                {data && data.total > 0 && !isPhone ? (
                  <CatalogPickerPagination
                    page={page}
                    pageSize={data.pageSize ?? CATALOG_PICKER_PAGE_SIZE}
                    total={data.total}
                    totalPages={totalPages}
                    loading={loading}
                    onPageChange={setPage}
                  />
                ) : null}
              </>
            )}
          </section>
        </div>

        {selectionMode === 'cart' ? (
          <CatalogPickerFooter
            selected={selected}
            totalAmount={selectionTotal}
            onRemoveAt={(index) => setSelected((prev) => prev.filter((_, i) => i !== index))}
            onCancel={onClose}
            onConfirm={handleConfirm}
            confirmLabel={confirmLabel}
          />
        ) : (
          <footer className="catalog-picker-footer catalog-picker-footer--simple">
            <button type="button" className="mos-btn mos-btn-ghost" onClick={onClose}>
              Vazgeç
            </button>
          </footer>
        )}
      </div>
    </div>
  )

  return createPortal(modal, document.body)
}

/**
 * @param {{
 *   items: ProductListItemDto[]
 *   loading: boolean
 *   emptyMessage?: string
 *   onToggle: (product: ProductListItemDto) => void
 *   selectedIds: Set<string>
 * }} props
 */
function CatalogPickerMobileCardList({
  items,
  loading,
  loadingMore = false,
  onScroll,
  emptyMessage = 'Bu kategoride ürün yok.',
  onToggle,
  selectedIds,
}) {
  if (loading && items.length === 0) {
    return <p className="catalog-picker-list__loading mos-muted">Yükleniyor…</p>
  }

  if (!loading && items.length === 0) {
    return <p className="catalog-picker-list__empty mos-muted">{emptyMessage}</p>
  }

  return (
    <div className="catalog-picker-mobile-cards" aria-label="Ürün kartları" onScroll={onScroll}>
      {items.map((product) => {
        const isSelected = selectedIds.has(product.id)

        return (
          <button
            key={product.id}
            type="button"
            className={`catalog-picker-mobile-card${isSelected ? ' catalog-picker-mobile-card--selected' : ''}`}
            onClick={() => onToggle(product)}
            aria-pressed={isSelected}
            aria-label={`${product.productName} seç`}
          >
            <div className="catalog-picker-mobile-card__head">
              <div className="catalog-picker-mobile-card__title-wrap">
                <strong className="catalog-picker-mobile-card__title">{product.productName}</strong>
                <span className="catalog-picker-mobile-card__code">{product.productCode}</span>
              </div>
              <span
                className={`catalog-picker-mobile-card__badge${isSelected ? ' catalog-picker-mobile-card__badge--selected' : ''}`}
              >
                {isSelected ? 'Seçildi' : 'Seç'}
              </span>
            </div>

            <div className="catalog-picker-mobile-card__meta">
              <span>{product.suiteType ?? '—'}</span>
              <span>{product.defaultSupplierName ?? '—'}</span>
            </div>

            <div className="catalog-picker-mobile-card__price-row">
              <span className="catalog-picker-mobile-card__price-label">Satış fiyatı</span>
              <strong className="catalog-picker-mobile-card__price">
                {formatTry(Number.parseFloat(product.defaultSalePrice) || 0)}
              </strong>
            </div>
          </button>
        )
      })}
      {loadingMore ? (
        <p className="catalog-picker-mobile-cards__loading-more mos-muted" role="status">
          Daha fazla ürün yükleniyor…
        </p>
      ) : null}
    </div>
  )
}
