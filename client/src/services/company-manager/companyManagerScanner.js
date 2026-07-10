import { isCompanyManagerEnabled, getCompanyManagerScanIntervalMs } from '../../config/companyManagerConfig.js'
import { isCompanyBrainEnabled, getCompanyBrainScanIntervalMs } from '../../config/companyBrainConfig.js'
import { runCompanyBrainScan } from '../company-brain/CompanyBrain.js'
import { runCompanyManagerScan } from './CompanyManager.js'
import { getGoalEngine } from '../goalEngineClient.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/** @type {number | null} */
let timerId = null

/** @type {{ orders: Order[], dtos: SalesOrderListItemDto[], todayIso: string } | null} */
let scanContext = null

/**
 * @param {{ orders: Order[], dtos: SalesOrderListItemDto[], todayIso: string }} context
 */
export function initCompanyManagerScanner(context) {
  stopCompanyManagerScanner()
  if (!isCompanyManagerEnabled()) return

  scanContext = context
  const intervalMs = isCompanyBrainEnabled()
    ? getCompanyBrainScanIntervalMs()
    : getCompanyManagerScanIntervalMs()

  const tick = async () => {
    if (!scanContext) return
    const goalEngine = isCompanyBrainEnabled()
      ? await getGoalEngine().catch(() => null)
      : null
    const scanFn = isCompanyBrainEnabled() ? runCompanyBrainScan : runCompanyManagerScan
    scanFn({
      orders: scanContext.orders,
      dtos: scanContext.dtos,
      todayIso: scanContext.todayIso,
      apply: true,
      goalEngine,
    })
  }

  void tick()
  timerId = window.setInterval(() => {
    void tick()
  }, intervalMs)
}

/**
 * @param {{ orders: Order[], dtos: SalesOrderListItemDto[], todayIso: string }} context
 */
export function updateCompanyManagerScannerContext(context) {
  scanContext = context
}

export function stopCompanyManagerScanner() {
  if (timerId != null) {
    window.clearInterval(timerId)
    timerId = null
  }
}

export function resetCompanyManagerScanner() {
  stopCompanyManagerScanner()
  scanContext = null
}

export {}
