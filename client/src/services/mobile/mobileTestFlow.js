import { MOBILE_TEST_FLOW_STEPS } from '../../constants/mobileTestFlowSteps.js'

const STORAGE_KEY = 'mobilya-os.mobile-test-flow'

/** @returns {Set<string>} */
export function readCompletedMobileTestSteps() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id) => typeof id === 'string'))
  } catch {
    return new Set()
  }
}

/** @param {string} stepId */
export function markMobileTestStepComplete(stepId) {
  const done = readCompletedMobileTestSteps()
  done.add(stepId)
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...done]))
  } catch {
    /* ignore */
  }
}

export function resetMobileTestFlowForTests() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} pageId
 * @returns {import('../../constants/mobileTestFlowSteps.js').MobileTestFlowStep | undefined}
 */
export function resolveMobileTestStepForPage(pageId) {
  const completed = readCompletedMobileTestSteps()
  return MOBILE_TEST_FLOW_STEPS.find((step) => step.page === pageId && !completed.has(step.id))
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
