import { isGenesisEnabled, getGenesisHeartbeatMs, getGenesisBrainScanMs } from '../../config/genesisConfig.js'
import {
  initCompanyManagerScanner,
  stopCompanyManagerScanner,
  updateCompanyManagerScannerContext,
  resetCompanyManagerScanner,
} from '../company-manager/companyManagerScanner.js'
import {
  runGenesisHeartbeat,
  runGenesisBrainCycle,
  maybeRunBoardMeeting,
} from './GenesisEngine.js'
import { getGoalEngine } from '../goalEngineClient.js'
import { initWorkerOrchestrator } from '../workerOrchestratorClient.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto} SalesOrderListItemDto */

/** @type {number | null} */
let heartbeatTimer = null

/** @type {number | null} */
let brainTimer = null

/** @type {{ orders: Order[], dtos: SalesOrderListItemDto[], todayIso: string } | null} */
let genesisContext = null

/** @type {ReturnType<typeof initWorkerOrchestrator> | null} */
let orchestratorRef = null

/**
 * Genesis — orchestrator + living heartbeat + brain cycle.
 * @param {{
 *   orders: Order[]
 *   dtos: SalesOrderListItemDto[]
 *   todayIso: string
 *   demoMode?: boolean
 * }} context
 */
export function initGenesisEngine(context) {
  stopGenesisEngine()

  if (!isGenesisEnabled()) {
    orchestratorRef = initWorkerOrchestrator({
      demoMode: context.demoMode,
      orders: context.orders,
      dtos: context.dtos,
      todayIso: context.todayIso,
    })
    initCompanyManagerScanner(context)
    genesisContext = context
    return orchestratorRef
  }

  genesisContext = context
  orchestratorRef = initWorkerOrchestrator({
    demoMode: context.demoMode,
    orders: context.orders,
    dtos: context.dtos,
    todayIso: context.todayIso,
  })

  const heartbeatMs = getGenesisHeartbeatMs()
  const brainMs = getGenesisBrainScanMs()

  const heartbeatTick = () => {
    if (!genesisContext) return
    runGenesisHeartbeat(genesisContext)
    maybeRunBoardMeeting(genesisContext)
  }

  const brainTick = async () => {
    if (!genesisContext) return
    const goalEngine = await getGoalEngine().catch(() => null)
    runGenesisBrainCycle({ ...genesisContext, goalEngine, apply: true })
  }

  heartbeatTick()
  void brainTick()

  heartbeatTimer = window.setInterval(heartbeatTick, heartbeatMs)
  brainTimer = window.setInterval(() => {
    void brainTick()
  }, brainMs)

  return orchestratorRef
}

/**
 * @param {{ orders: Order[], dtos: SalesOrderListItemDto[], todayIso: string }} context
 */
export function updateGenesisContext(context) {
  genesisContext = context
  if (!isGenesisEnabled()) {
    updateCompanyManagerScannerContext(context)
  }
}

export function stopGenesisEngine() {
  if (heartbeatTimer != null) {
    window.clearInterval(heartbeatTimer)
    heartbeatTimer = null
  }
  if (brainTimer != null) {
    window.clearInterval(brainTimer)
    brainTimer = null
  }
  orchestratorRef?.stop()
  orchestratorRef = null
  stopCompanyManagerScanner()
  genesisContext = null
}

export function resetGenesisEngine() {
  stopGenesisEngine()
  resetCompanyManagerScanner()
}

export {}
