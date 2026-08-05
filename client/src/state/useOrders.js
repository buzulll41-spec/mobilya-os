import { useContext } from 'react'
import { OrdersStateContext } from './ordersContext.js'

export function useOrders() {
  const ctx = useContext(OrdersStateContext)
  if (!ctx) {
    throw new Error('useOrders: OrdersProvider eksik (main.jsx içinde sarmalayın).')
  }
  return {
    ...ctx,
    domainEvents: ctx.domainEvents ?? [],
    operationalTasks: ctx.operationalTasks ?? [],
    dataPipeline:
      ctx.dataPipeline ??
      ({ layer: 'mock', hasApiBase: false, usedFallback: true, fetchedAt: null }),
  }
}
