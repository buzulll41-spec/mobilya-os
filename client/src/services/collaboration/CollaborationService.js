import { BusinessEngine } from '../../engine/businessEngine.js'
import {
  detectOperationalConflicts,
} from '../../engine/company-manager/ConflictResolver.js'
import {
  pickDominantDomain,
  rankSnapshotsByPriority,
  scoreOperationalDomains,
} from '../../engine/company-manager/PriorityEngine.js'
import { getAllDomainEventsSnapshot } from '../mockDomainEventStore.js'
import { getDigitalWorkforceCoreSnapshot } from '../mockDigitalWorkforceStore.js'
import {
  buildCollaborationGraph,
  countHelpRequests,
  detectCollaborationSignals,
  findBusiestTeamLabel,
  PIPELINE_WORKER_IDS,
  rankDecisionsByCollaboration,
  resolveCollaborationEffects,
  resetCollaborationEngineSeqForTests,
  sortMessagesByPriority,
  WORKER_LABELS,
} from '../../engine/collaboration/CollaborationEngine.js'
import {
  appendCollaborationMessages,
  getCollaborationMessageCount,
  getCollaborationMessagesSnapshot,
  resetCollaborationMessageStore,
} from './collaborationMessageStore.js'

/** @typedef {import('../../contracts/v1/collaboration.js').WorkerCollaborationMessageDto} WorkerCollaborationMessageDto */
/** @typedef {import('../../contracts/v1/collaboration.js').WorkerCollaborationProfileDto} WorkerCollaborationProfileDto */
/** @typedef {import('../../contracts/v1/collaboration.js').CompanyCollaborationSummaryDto} CompanyCollaborationSummaryDto */
/** @typedef {import('../../contracts/v1/aiCompanyManager.js').CompanyManagerDecisionDto} CompanyManagerDecisionDto */

const messages = () => getCollaborationMessagesSnapshot()
/** @type {Map<string, string[]>} */
const activeEffects = new Map()

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 *   domains?: ReturnType<typeof scoreOperationalDomains>
 *   dominant?: string
 *   conflicts?: ReturnType<typeof detectOperationalConflicts>
 *   ranked?: ReturnType<typeof rankSnapshotsByPriority>
 * }} scanCtx
 */
export function runCollaborationScan(scanCtx) {
  const { orders, dtos, todayIso } = scanCtx
  const domainEvents = getAllDomainEventsSnapshot()
  const workforce = getDigitalWorkforceCoreSnapshot()
  const snapshotMap = BusinessEngine.computeOrderSnapshots(orders, dtos, todayIso)
  const snapshots = [...snapshotMap.values()]
  const ranked = scanCtx.ranked ?? rankSnapshotsByPriority(snapshots)
  const domains = scanCtx.domains ?? scoreOperationalDomains({ snapshots, domainEvents, todayIso })
  const dominant = scanCtx.dominant ?? pickDominantDomain(domains)
  const conflicts = scanCtx.conflicts ?? detectOperationalConflicts(workforce.tasks, workforce.workers)

  const newMessages = detectCollaborationSignals({ domains, dominant, conflicts, ranked, todayIso })
  appendCollaborationMessages(newMessages)

  for (const msg of newMessages) {
    activeEffects.set(msg.toWorkerId, resolveCollaborationEffects(msg))
  }

  return getCompanyCollaborationSummaryLocal({ orders, dtos, todayIso })
}

/**
 * @param {{
 *   orders?: import('../../data/seedOrders.js').Order[]
 *   dtos?: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function getCompanyCollaborationSummaryLocal(runtimeCtx) {
  const started = Date.now()
  if (!getCollaborationMessageCount() && runtimeCtx.orders && runtimeCtx.dtos) {
    runCollaborationScan(runtimeCtx)
  }

  const today = runtimeCtx.todayIso
  const allMessages = messages()
  const todayMessages = allMessages.filter((m) => m.occurredAt.slice(0, 10) === today)
  const graph = buildCollaborationGraph(allMessages)
  const workers = PIPELINE_WORKER_IDS.map((workerId) => buildWorkerProfile(workerId))

  const mostHelp = [...workers].sort((a, b) => b.helpRequestsSent - a.helpRequestsSent)[0]

  return {
    feed: sortMessagesByPriority(todayMessages.length ? todayMessages : allMessages).slice(0, 30),
    graph,
    workers,
    mostHelpRequestsWorkerId: mostHelp?.workerId ?? PIPELINE_WORKER_IDS[0],
    busiestTeamLabel: findBusiestTeamLabel(graph),
    todayMessageCount: todayMessages.length || allMessages.length,
    meta: { durationMs: Date.now() - started },
  }
}

/** @param {string} workerId */
function buildWorkerProfile(workerId) {
  const allMessages = messages()
  const inbox = allMessages.filter((m) => m.toWorkerId === workerId)
  const outbox = allMessages.filter((m) => m.fromWorkerId === workerId)
  return {
    workerId,
    workerLabel: WORKER_LABELS[workerId] ?? workerId,
    inbox: sortMessagesByPriority(inbox).slice(0, 10),
    outbox: sortMessagesByPriority(outbox).slice(0, 10),
    messagesSent: outbox.length,
    messagesReceived: inbox.length,
    helpRequestsSent: countHelpRequests(allMessages, workerId),
    activeEffects: activeEffects.get(workerId) ?? [],
  }
}

/**
 * @param {{
 *   todayIso: string
 *   limit?: number
 * }} opts
 */
export function getCollaborationFeedLocal(opts) {
  const started = Date.now()
  const limit = opts.limit ?? 30
  const allMessages = messages()
  const todayMessages = allMessages.filter((m) => m.occurredAt.slice(0, 10) === opts.todayIso)
  const feed = sortMessagesByPriority(todayMessages.length ? todayMessages : allMessages).slice(0, limit)
  return {
    messages: feed,
    todayCount: todayMessages.length || allMessages.length,
    meta: { durationMs: Date.now() - started },
  }
}

/** @param {{ limit?: number }} [opts] */
export function getCollaborationHistoryLocal(opts = {}) {
  const limit = opts.limit ?? 50
  const allMessages = messages()
  return { records: allMessages.slice(-limit).reverse(), total: allMessages.length }
}

/**
 * @param {string} workerId
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function getWorkerCollaborationLocal(workerId, runtimeCtx) {
  if (!getCollaborationMessageCount()) runCollaborationScan(runtimeCtx)
  return buildWorkerProfile(workerId)
}

/** Snapshot for Knowledge Graph integration. */
export { getCollaborationMessagesSnapshot } from './collaborationMessageStore.js'

/**
 * @param {CompanyManagerDecisionDto[]} decisions
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function rankDecisionsWithCollaboration(decisions, runtimeCtx) {
  if (!getCollaborationMessageCount()) runCollaborationScan(runtimeCtx)
  return rankDecisionsByCollaboration(decisions, messages())
}

export function resetCollaborationStoreForTests() {
  resetCollaborationMessageStore()
  activeEffects.clear()
  resetCollaborationEngineSeqForTests()
}

export {}
