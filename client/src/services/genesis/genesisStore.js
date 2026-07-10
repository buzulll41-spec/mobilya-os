import { GENESIS_LIVING_PHASE } from '../../contracts/v1/genesis.js'

/** @typedef {import('../../contracts/v1/genesis.js').GenesisLivingPhase} GenesisLivingPhase */
/** @typedef {import('../../contracts/v1/genesis.js').CeoChatMessage} CeoChatMessage */

/**
 * @typedef {Object} GenesisLivingState
 * @property {GenesisLivingPhase} phase
 * @property {'low' | 'medium' | 'high'} riskLevel
 * @property {number} heartbeatCount
 * @property {number} riskScore
 * @property {string} lastHeartbeatAt
 * @property {string} [lastRiskChangeAt]
 */

/**
 * @typedef {Object} GenesisBoardMeetingRecord
 * @property {string} meetingAt
 * @property {import('../../contracts/v1/genesis.js').BoardMeetingUtterance[]} transcript
 * @property {string} ceoSummary
 * @property {string[]} insights
 */

/** @type {GenesisLivingState} */
let livingState = {
  phase: GENESIS_LIVING_PHASE.OBSERVE,
  riskLevel: 'low',
  heartbeatCount: 0,
  riskScore: 0,
  lastHeartbeatAt: new Date().toISOString(),
}

/** @type {GenesisBoardMeetingRecord | null} */
let lastBoardMeeting = null

/** @type {string | null} */
let lastBoardMeetingDay = null

/** @type {CeoChatMessage[]} */
let chatHistory = []

/** @type {{ totalScore: number, dimensions: import('../../contracts/v1/genesis.js').GenesisScoreDimension[] } | null} */
let lastCompanyScore = null

/** @type {import('../../contracts/v1/genesis.js').GenesisPredictionDto[]} */
let lastPredictions = []

/** @type {Set<() => void>} */
const listeners = new Set()

function bump() {
  for (const listener of listeners) listener()
}

/** @param {() => void} listener */
export function subscribeGenesisStore(listener) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** @param {Partial<GenesisLivingState>} patch */
export function updateGenesisLivingState(patch) {
  livingState = { ...livingState, ...patch }
  bump()
}

export function getGenesisLivingState() {
  return { ...livingState }
}

/** @param {GenesisBoardMeetingRecord} meeting */
export function recordGenesisBoardMeeting(meeting) {
  lastBoardMeeting = meeting
  lastBoardMeetingDay = meeting.meetingAt.slice(0, 10)
  bump()
}

export function getLastGenesisBoardMeeting() {
  return lastBoardMeeting ? { ...lastBoardMeeting, transcript: [...lastBoardMeeting.transcript] } : null
}

export function getLastBoardMeetingDay() {
  return lastBoardMeetingDay
}

/** @param {CeoChatMessage} ceoMsg @param {CeoChatMessage} genesisMsg */
export function appendCeoChatExchange(ceoMsg, genesisMsg) {
  chatHistory = [genesisMsg, ceoMsg, ...chatHistory].slice(0, 40)
  bump()
}

export function getCeoChatHistory(limit = 20) {
  return chatHistory.slice(0, limit)
}

export function getLastCeoChatExchange() {
  const genesis = chatHistory.find((m) => m.role === 'genesis')
  const ceo = chatHistory.find((m) => m.role === 'ceo')
  return genesis && ceo ? { ceo, genesis } : null
}

/** @param {{ totalScore: number, dimensions: import('../../contracts/v1/genesis.js').GenesisScoreDimension[] }} score */
export function recordGenesisCompanyScore(score) {
  lastCompanyScore = score
  bump()
}

export function getGenesisCompanyScore() {
  return lastCompanyScore ? { ...lastCompanyScore, dimensions: [...lastCompanyScore.dimensions] } : null
}

/** @param {import('../../contracts/v1/genesis.js').GenesisPredictionDto[]} predictions */
export function recordGenesisPredictions(predictions) {
  lastPredictions = predictions
  bump()
}

export function getGenesisPredictions() {
  return [...lastPredictions]
}

/** @type {string} */
let lastScenario = 'BALANCED'

/** @param {string} scenario */
export function recordGenesisScenario(scenario) {
  lastScenario = scenario
  bump()
}

export function getLastGenesisScenario() {
  return lastScenario
}

export function resetGenesisStore() {
  livingState = {
    phase: GENESIS_LIVING_PHASE.OBSERVE,
    riskLevel: 'low',
    heartbeatCount: 0,
    riskScore: 0,
    lastHeartbeatAt: new Date().toISOString(),
  }
  lastBoardMeeting = null
  lastBoardMeetingDay = null
  chatHistory = []
  lastCompanyScore = null
  lastPredictions = []
  lastScenario = 'BALANCED'
  listeners.clear()
}

export {}
