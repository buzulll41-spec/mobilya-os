import { useEffect, useState } from 'react'
import { CATALOG_PICKER_PAGE_SIZE } from '../../../constants/productCatalog.js'
import { useDebouncedValue } from '../../../hooks/useDebouncedValue.js'
import * as productsClient from '../../../services/productsClient.js'
import { filtersToListQuery } from './catalogPickerModel.js'

/** @typedef {import('./catalogPickerModel.js').CatalogPickerQuery} CatalogPickerQuery */
/** @typedef {import('../../../contracts/v1/product.js').ProductListResponseDto} ProductListResponseDto */

/**
 * @param {boolean} open
 * @param {string} searchQuery
 * @param {string} category
 * @param {number} page
 */
export function useCatalogPickerProducts(open, searchQuery, category, page) {
  const debouncedQ = useDebouncedValue(searchQuery, 320)
  const [data, setData] = useState(/** @type {ProductListResponseDto | null} */ (null))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await productsClient.listProducts(
          filtersToListQuery({ q: debouncedQ, category }, page, CATALOG_PICKER_PAGE_SIZE),
        )
        if (!cancelled) setData(res)
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Ürünler yüklenemedi')
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open, debouncedQ, category, page])

  const totalPages = data ? Math.max(1, Math.ceil(data.total / data.pageSize)) : 1

  return { data, loading, error, totalPages }
}
