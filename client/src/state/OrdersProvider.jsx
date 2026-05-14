import { useCallback, useEffect, useMemo, useState } from 'react'
import * as ordersClient from '../services/ordersClient.js'
import { OrdersStateContext } from './ordersContext.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */

/**
 * @typedef {Object} OrdersStateValue
 * @property {Order[]} orders
 * @property {boolean} loading İlk yükleme: liste boşken veri çekiliyor
 * @property {boolean} isRefreshing Herhangi bir getOrders çalışıyor
 * @property {boolean} mutating create / update API çağrısı
 * @property {Error | null} error
 * @property {() => Promise<void>} refreshOrders
 * @property {(draft: Omit<Order, 'id' | 'orderDate'>) => Promise<Order>} createOrder
 * @property {(id: string, patch: Partial<Order>) => Promise<void>} updateOrder
 */

/** @param {{ children: import('react').ReactNode }} props */
export function OrdersProvider({ children }) {
  const [orders, setOrders] = useState(/** @type {Order[]} */ ([]))
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [mutating, setMutating] = useState(false)
  const [error, setError] = useState(/** @type {Error | null} */ (null))

  const loading = isRefreshing && orders.length === 0

  const refreshOrders = useCallback(async () => {
    setError(null)
    setIsRefreshing(true)
    try {
      const list = await ordersClient.getOrders()
      setOrders(list)
    } catch (e) {
      setError(e instanceof Error ? e : new Error(String(e)))
    } finally {
      setIsRefreshing(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- bootstrap: mock getOrders
    void refreshOrders()
  }, [refreshOrders])

  const createOrder = useCallback(async (/** @type {Omit<Order, 'id' | 'orderDate'>} */ draft) => {
    setMutating(true)
    setError(null)
    try {
      const created = await ordersClient.createOrder(draft)
      setOrders((prev) => [created, ...prev])
      return created
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      setError(err)
      throw err
    } finally {
      setMutating(false)
    }
  }, [])

  const updateOrder = useCallback(async (/** @type {string} */ id, /** @type {Partial<Order>} */ patch) => {
    setMutating(true)
    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...patch } : o)))
    setError(null)
    try {
      const updated = await ordersClient.updateOrder(id, patch)
      setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updated } : o)))
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e))
      setError(err)
      try {
        const list = await ordersClient.getOrders()
        setOrders(list)
      } catch {
        /* ignore */
      }
    } finally {
      setMutating(false)
    }
  }, [])

  const value = useMemo(
    () => ({
      orders,
      loading,
      isRefreshing,
      mutating,
      error,
      refreshOrders,
      createOrder,
      updateOrder,
    }),
    [orders, loading, isRefreshing, mutating, error, refreshOrders, createOrder, updateOrder],
  )

  return <OrdersStateContext.Provider value={value}>{children}</OrdersStateContext.Provider>
}
