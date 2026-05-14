import { useContext } from 'react'
import { OrdersStateContext } from './ordersContext.js'

export function useOrders() {
  const ctx = useContext(OrdersStateContext)
  if (!ctx) {
    throw new Error('useOrders: OrdersProvider eksik (main.jsx içinde sarmalayın).')
  }
  return ctx
}
