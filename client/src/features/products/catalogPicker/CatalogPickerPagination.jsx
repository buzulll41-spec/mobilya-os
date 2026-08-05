import { memo, useMemo } from 'react'
import { buildCatalogPageNumbers, formatCatalogPageRange } from './catalogPickerModel.js'

/**
 * @param {{
 *   page: number
 *   pageSize: number
 *   total: number
 *   totalPages: number
 *   loading?: boolean
 *   onPageChange: (page: number) => void
 * }} props
 */
function CatalogPickerPagination({ page, pageSize, total, totalPages, loading = false, onPageChange }) {
  const pageNumbers = useMemo(() => buildCatalogPageNumbers(page, totalPages), [page, totalPages])
  const rangeLabel = formatCatalogPageRange(page, pageSize, total)

  if (total <= 0) return null

  return (
    <footer className="catalog-picker-list-pager" aria-label="Sayfalama">
      <span className="catalog-picker-list-pager__range mos-muted">{rangeLabel}</span>
      <div className="catalog-picker-list-pager__controls">
        <button
          type="button"
          className="mos-btn mos-btn-ghost mos-btn-sm"
          disabled={page <= 1 || loading}
          onClick={() => onPageChange(page - 1)}
        >
          Önceki
        </button>
        <div className="catalog-picker-list-pager__nums" role="group" aria-label="Sayfa numaraları">
          {pageNumbers.map((n) => (
            <button
              key={n}
              type="button"
              className={`catalog-picker-list-pager__num${n === page ? ' is-active' : ''}`}
              disabled={loading}
              aria-current={n === page ? 'page' : undefined}
              onClick={() => onPageChange(n)}
            >
              {n}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="mos-btn mos-btn-ghost mos-btn-sm"
          disabled={page >= totalPages || loading}
          onClick={() => onPageChange(page + 1)}
        >
          Sonraki
        </button>
      </div>
    </footer>
  )
}

export default memo(CatalogPickerPagination)
