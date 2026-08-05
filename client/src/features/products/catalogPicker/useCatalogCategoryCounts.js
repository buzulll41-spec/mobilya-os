import { useEffect, useMemo, useState } from 'react'
import { CATALOG_NAV_CATEGORIES } from '../../../constants/productCatalog.js'
import * as productsClient from '../../../services/productsClient.js'

/**
 * Kategori başına ürün sayısı — modal açılışında bir kez, memoized.
 * @param {boolean} open
 */
export function useCatalogCategoryCounts(open) {
  const [counts, setCounts] = useState(/** @type {Record<string, number> | null} */ (null))
  const [catalogTotal, setCatalogTotal] = useState(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    ;(async () => {
      try {
        const pairs = await Promise.all(
          CATALOG_NAV_CATEGORIES.map(async (nav) => {
            const res = await productsClient.listProducts({
              category: nav.value || undefined,
              activeOnly: true,
              page: 1,
              pageSize: 1,
            })
            return [nav.key, res.total]
          }),
        )
        if (cancelled) return
        const map = Object.fromEntries(pairs)
        setCounts(map)
        setCatalogTotal(map.all ?? 0)
      } catch {
        if (!cancelled) {
          setCounts(null)
          setCatalogTotal(0)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  const countsByKey = useMemo(() => counts ?? {}, [counts])

  return { countsByKey, catalogTotal, countsReady: counts != null }
}
