import { BOARD_MEMBER_ID } from '../../contracts/v1/strategicBoard.js'
import { analyzeBoardConsensus } from './BoardDiscussion.js'

/** @typedef {import('../../contracts/v1/strategicBoard.js').BoardDirectorOpinionDto} BoardDirectorOpinionDto */
/** @typedef {import('../../contracts/v1/strategicBoard.js').ExecutiveSummaryDto} ExecutiveSummaryDto */

/**
 * @param {{
 *   question: string
 *   discussion: BoardDirectorOpinionDto[]
 *   topic: string
 *   dominant: string
 *   todayIso: string
 * }} input
 * @returns {ExecutiveSummaryDto}
 */
export function buildExecutiveSummary(input) {
  const { question, discussion, topic, dominant, todayIso } = input
  const { hasConsensus, conflicts } = analyzeBoardConsensus(discussion)
  const directors = discussion.filter((d) => d.memberId !== BOARD_MEMBER_ID.CEO)

  const topDecisions = buildTopDecisions(directors, dominant, conflicts)
  const tomorrowFocus = buildTomorrowFocus(directors, topic, dominant)

  const narrativeLines = directors
    .slice(0, 6)
    .map((d) => `${d.memberLabel}: ${d.opinion}`)

  const headline =
    topic === 'sales_drop'
      ? 'Satış düşüşü — yönetim kurulu değerlendirmesi'
      : topic === 'tomorrow_focus'
        ? 'Yarın odak planı — executive synthesizer'
        : topic === 'decisions'
          ? 'En önemli kararlar — board özeti'
          : `Strategic Board · ${todayIso}`

  return {
    headline,
    narrative: narrativeLines.join('\n'),
    topDecisions,
    tomorrowFocus,
    hasConsensus,
    conflicts,
  }
}

/**
 * @param {BoardDirectorOpinionDto[]} directors
 * @param {string} dominant
 * @param {import('../../contracts/v1/strategicBoard.js').BoardConflictDto[]} conflicts
 */
function buildTopDecisions(directors, dominant, conflicts) {
  const sorted = [...directors].sort((a, b) => b.confidence - a.confidence)
  const decisions = sorted.slice(0, 3).map((d, i) => `${i + 1}. ${d.memberLabel}: ${d.opinion}`)

  if (conflicts[0]) {
    decisions.push(`${decisions.length + 1}. Çatışma çözümü: ${conflicts[0].resolution}`)
  }

  if (decisions.length < 3) {
    decisions.push(`${decisions.length + 1}. ${dominant} domain için koordinasyon güçlendir`)
  }

  return decisions.slice(0, 3)
}

/**
 * @param {BoardDirectorOpinionDto[]} directors
 * @param {string} topic
 * @param {string} dominant
 */
function buildTomorrowFocus(directors, topic, dominant) {
  if (topic === 'tomorrow_focus') {
    return [
      `${dominant} operasyonlarına öncelik`,
      'Board kararlarının uygulanması',
      'Kritik metriklerin sabah kontrolü',
    ]
  }

  const focus = []
  for (const d of directors) {
    if (d.confidence >= 75) focus.push(`${d.role}: ${d.opinion.split('·')[0].trim()}`)
    if (focus.length >= 3) break
  }

  if (focus.length < 3) {
    focus.push('Executive scan ve worker collaboration takibi')
  }

  return focus.slice(0, 3)
}

export {}
