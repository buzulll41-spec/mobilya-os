import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { DEMO_TODAY } from '../data/constants.js'
import { getApiBaseUrl } from '../config/dataSource.js'
import { useAuth } from '../state/AuthProvider.jsx'
import {
  listShipmentPlans,
  upsertShipmentPlan as persistShipmentPlan,
  upsertShipmentPlansBatch as persistShipmentPlansBatch,
  createShipmentGroupRemote,
} from '../services/shipmentPlansClient.js'

/** @typedef {import('../state/shipmentPlanStore.js').ShipmentPlan} ShipmentPlan */

/** @type {import('react').Context<ReturnType<typeof useShipmentPlansState> | null>} */
const ShipmentPlansContext = createContext(null)

function useShipmentPlansState() {
  const { user } = useAuth()
  const apiMode = Boolean(getApiBaseUrl())
  const [plans, setPlans] = useState(/** @type {ShipmentPlan[]} */ ([]))
  const [loading, setLoading] = useState(true)

  const refreshPlans = useCallback(async (/** @type {{ plannedDate?: string }} */ query) => {
    setLoading(true)
    try {
      if (!getApiBaseUrl()) {
        const { processMockDeliveryConfirmationQueue } = await import('../services/mockApi.js')
        await processMockDeliveryConfirmationQueue(DEMO_TODAY)
      }
      const next = await listShipmentPlans(query)
      setPlans(next)
      return next
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (apiMode && !user?.id) {
      setLoading(false)
      return
    }
    refreshPlans()
  }, [apiMode, user?.id, refreshPlans])

  const plansByOrderId = useMemo(() => {
    const map = new Map()
    for (const plan of plans) {
      if (plan?.orderId) map.set(plan.orderId, plan)
    }
    return map
  }, [plans])

  const upsertPlan = useCallback(
    async (/** @type {ShipmentPlan} */ plan) => {
      const saved = await persistShipmentPlan(plan)
      setPlans((prev) => {
        const next = prev.filter((p) => p.orderId !== saved.orderId)
        next.push(saved)
        return next
      })
      if (getApiBaseUrl()) {
        await refreshPlans()
      }
      return saved
    },
    [refreshPlans],
  )

  const upsertPlansBatch = useCallback(
    async (/** @type {ShipmentPlan[]} */ batch) => {
      const saved = await persistShipmentPlansBatch(batch)
      setPlans((prev) => {
        const byId = new Map(prev.map((p) => [p.orderId, p]))
        for (const plan of saved) byId.set(plan.orderId, plan)
        return [...byId.values()]
      })
      if (getApiBaseUrl()) {
        await refreshPlans()
      }
      return saved
    },
    [refreshPlans],
  )

  const createGroup = useCallback(
    async (/** @type {Parameters<typeof createShipmentGroupRemote>[0]} */ body) => {
      const group = await createShipmentGroupRemote(body)
      if (getApiBaseUrl()) {
        await refreshPlans()
      }
      return group
    },
    [refreshPlans],
  )

  return {
    plans,
    plansByOrderId,
    loading,
    refreshPlans,
    upsertPlan,
    upsertPlansBatch,
    createGroup,
  }
}

/** @param {{ children: import('react').ReactNode }} props */
export function ShipmentPlansProvider({ children }) {
  const value = useShipmentPlansState()
  return <ShipmentPlansContext.Provider value={value}>{children}</ShipmentPlansContext.Provider>
}

export function useShipmentPlans() {
  const ctx = useContext(ShipmentPlansContext)
  if (!ctx) {
    throw new Error('useShipmentPlans must be used within ShipmentPlansProvider')
  }
  return ctx
}
