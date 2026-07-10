import { useEffect, useState } from 'react'
import * as incomingGoodsClient from '../services/incomingGoodsClient.js'

/**
 * @param {string} orderId
 * @param {number} [refreshKey]
 */
export function useOrderLineReceiving(orderId, refreshKey = 0) {
  const [lines, setLines] = useState(
    /** @type {import('../contracts/v1/incomingGoods.js').OrderLineReceivingDto[]} */ ([]),
  )
  const [summary, setSummary] = useState(
    /** @type {import('../contracts/v1/incomingGoods.js').OrderReadinessSummaryDto | null} */ (null),
  )
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await incomingGoodsClient.listOrderLineReceiving(orderId)
        if (!cancelled) {
          setLines(res.lines)
          setSummary(res.summary)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Ürün durumu yüklenemedi')
          setLines([])
          setSummary(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [orderId, refreshKey])

  return { lines, summary, loading, error }
}
