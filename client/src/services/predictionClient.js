import { getApiBaseUrl } from '../config/dataSource.js'
import {
  getCompanyPredictionLocal,
  getCustomerPredictionLocal,
  getOrderPredictionLocal,
} from './prediction/PredictionService.js'

/**
 * @param {string} orderId
 * @param {object} runtimeCtx
 */
export async function fetchOrderPrediction(orderId, runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/predictions/order/${encodeURIComponent(orderId)}`, {
        cache: 'no-store',
      })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Prediction runtime context required in mock mode')
  const local = getOrderPredictionLocal(runtimeCtx, orderId)
  if (!local) return { error: 'Order not found' }
  return local
}

/**
 * @param {string} customerId
 * @param {object} runtimeCtx
 */
export async function fetchCustomerPrediction(customerId, runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(
        `${base.replace(/\/+$/, '')}/v1/predictions/customer/${encodeURIComponent(customerId)}`,
        { cache: 'no-store' },
      )
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Prediction runtime context required in mock mode')
  const local = getCustomerPredictionLocal(runtimeCtx, customerId)
  if (!local) return { error: 'Customer not found' }
  return local
}

/**
 * @param {object} runtimeCtx
 */
export async function fetchCompanyPredictions(runtimeCtx) {
  const base = getApiBaseUrl()
  if (base) {
    try {
      const res = await fetch(`${base.replace(/\/+$/, '')}/v1/predictions/company`, { cache: 'no-store' })
      if (res.ok) return res.json()
    } catch {
      /* fallback */
    }
  }
  if (!runtimeCtx) throw new Error('Prediction runtime context required in mock mode')
  return getCompanyPredictionLocal(runtimeCtx)
}

export {}
