import { MOBILE_TEST_FLOW_STEPS } from '../../constants/mobileTestFlowSteps.js'

const STORAGE_KEY = 'mobilya-os.mobile-test-flow'
const STORAGE_VERSION = 2

const LEGACY_UNVERIFIED_STEP_IDS = new Set([
  'create-order',
  'deposit',
  'supply',
  'incoming',
  'ship-plan',
  'deliver',
  'collection',
  'ceo',
  'ai-workforce',
])

const DOMAIN_EVENT_STEP_MAP = /** @type {Record<string, string[]>} */ ({
  'order.placed': ['create-order'],
  'payment.posted': ['deposit', 'collection'],
  'payment.approved': ['collection'],
  'supply.order.sent': ['supply'],
  'incoming_goods.recorded': ['incoming'],
  'shipment.plan.created': ['ship-plan'],
  'shipment.plan.updated': ['ship-plan'],
  'shipment.planned': ['ship-plan'],
  'delivery.confirmed': ['deliver'],
  'delivery.completed': ['deliver'],
  'shipment.delivered': ['deliver'],
})

/**
 * @typedef {{ completedAt: string, source: string }} MobileTestStepCompletion
 * @typedef {{
 *   version: number
 *   initializedAt: string
 *   completions: Record<string, MobileTestStepCompletion>
 *   legacyCompletedStepIds: string[]
 * }} MobileTestFlowStore
 */

/** @returns {MobileTestFlowStore} */
function emptyStore() {
  return {
    version: STORAGE_VERSION,
    initializedAt: new Date().toISOString(),
    completions: {},
    legacyCompletedStepIds: [],
  }
}

/** @param {string | null} raw @returns {MobileTestFlowStore} */
function parseStore(raw) {
  if (!raw) return emptyStore()
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return {
        ...emptyStore(),
        legacyCompletedStepIds: parsed.filter((id) => typeof id === 'string'),
      }
    }
    if (!parsed || typeof parsed !== 'object') return emptyStore()
    const initializedAt = typeof parsed.initializedAt === 'string' ? parsed.initializedAt : new Date().toISOString()
    const completions = /** @type {Record<string, MobileTestStepCompletion>} */ ({})
    if (parsed.completions && typeof parsed.completions === 'object') {
      for (const [stepId, value] of Object.entries(parsed.completions)) {
        if (!value || typeof value !== 'object') continue
        const completedAt = typeof value.completedAt === 'string' ? value.completedAt : new Date().toISOString()
        const source = typeof value.source === 'string' ? value.source : 'unknown'
        completions[stepId] = { completedAt, source }
      }
    }
    const legacyCompletedStepIds = Array.isArray(parsed.legacyCompletedStepIds)
      ? parsed.legacyCompletedStepIds.filter((id) => typeof id === 'string')
      : []
    return {
      version: STORAGE_VERSION,
      initializedAt,
      completions,
      legacyCompletedStepIds,
    }
  } catch {
    return emptyStore()
  }
}

/** @returns {MobileTestFlowStore} */
function readStore() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return parseStore(raw)
  } catch {
    return emptyStore()
  }
}

/** @param {MobileTestFlowStore} store */
function writeStore(store) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
  } catch {
    /* ignore */
  }
}

/** @param {string | undefined} iso @returns {number | null} */
function parseIsoMs(iso) {
  if (!iso || typeof iso !== 'string') return null
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : null
}

/** @returns {Set<string>} */
export function readCompletedMobileTestSteps() {
  const store = readStore()
  const done = new Set(Object.keys(store.completions))
  for (const legacyStepId of store.legacyCompletedStepIds) {
    if (!LEGACY_UNVERIFIED_STEP_IDS.has(legacyStepId)) {
      done.add(legacyStepId)
    }
  }
  return done
}

/**
 * @param {string} stepId
 * @param {string} [source]
 * @returns {boolean}
 */
export function markMobileTestStepComplete(stepId, source = 'manual') {
  const store = readStore()
  if (store.completions[stepId]) return false
  store.completions[stepId] = {
    completedAt: new Date().toISOString(),
    source,
  }
  writeStore(store)
  return true
}

/**
 * @param {string[]} stepIds
 * @param {string} [source]
 * @returns {string[]}
 */
export function markMobileTestStepsComplete(stepIds, source = 'manual') {
  const done = []
  for (const stepId of stepIds) {
    if (markMobileTestStepComplete(stepId, source)) done.push(stepId)
  }
  return done
}

/** @returns {string} */
export function getMobileTestFlowInitializedAt() {
  return readStore().initializedAt
}

/**
 * @param {Array<{ id?: string, type?: string, occurredAt?: string }>} domainEvents
 * @returns {string[]}
 */
export function resolveMobileTestStepsFromDomainEvents(domainEvents) {
  if (!Array.isArray(domainEvents) || domainEvents.length === 0) return []
  const completed = readCompletedMobileTestSteps()
  const initializedAtMs = parseIsoMs(getMobileTestFlowInitializedAt())
  const matched = new Set()
  for (const event of domainEvents) {
    const type = typeof event?.type === 'string' ? event.type : ''
    if (!type) continue
    const occurredAtMs = parseIsoMs(event?.occurredAt)
    if (
      initializedAtMs !== null &&
      occurredAtMs !== null &&
      occurredAtMs < initializedAtMs
    ) {
      continue
    }
    const stepIds = DOMAIN_EVENT_STEP_MAP[type]
    if (!stepIds) continue
    for (const stepId of stepIds) {
      if (!completed.has(stepId)) matched.add(stepId)
    }
  }
  return [...matched]
}

export function resetMobileTestFlowForTests() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * @returns {{
 *   steps: import('../../constants/mobileTestFlowSteps.js').MobileTestFlowStep[]
 *   completed: Set<string>
 *   nextStep: import('../../constants/mobileTestFlowSteps.js').MobileTestFlowStep | null
 *   progressPct: number
 * }}
 */
export function buildMobileTestFlowState() {
  const completed = readCompletedMobileTestSteps()
  const nextStep = MOBILE_TEST_FLOW_STEPS.find((step) => !completed.has(step.id)) ?? null
  const progressPct = Math.round((completed.size / MOBILE_TEST_FLOW_STEPS.length) * 100)
  return { steps: MOBILE_TEST_FLOW_STEPS, completed, nextStep, progressPct }
}
