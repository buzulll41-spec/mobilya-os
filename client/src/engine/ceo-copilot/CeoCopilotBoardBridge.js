import { CEO_COPILOT_INTENT } from '../../contracts/v1/ceoCopilot.js'
import {
  fetchBoardMeetingHistory,
  fetchLatestBoardMeeting,
  fetchRunBoardMeeting,
} from '../../services/boardMeetingClient.js'

/**
 * @param {string} intent
 * @param {string} message
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export async function buildBoardCopilotReply(intent, message, runtimeCtx) {
  if (intent === CEO_COPILOT_INTENT.BOARD_CONVENE || intent === CEO_COPILOT_INTENT.BOARD_STRATEGIC_QUESTION) {
    const question = intent === CEO_COPILOT_INTENT.BOARD_STRATEGIC_QUESTION ? message : 'Bugünkü şirket durumu nedir?'
    const meeting = await fetchRunBoardMeeting(question, runtimeCtx)
    const lines = meeting.discussion
      .filter((d) => d.memberId !== 'board-ceo')
      .slice(0, 5)
      .map((d) => `${d.memberLabel}: ${d.opinion}`)
    return [
      'Strategic AI Board · Yönetim kurulu toplandı',
      meeting.executiveSummary.headline,
      ...lines,
      `Executive Synthesizer: ${meeting.executiveSummary.topDecisions[0] ?? meeting.result}`,
    ].join('\n')
  }

  const latest = await fetchLatestBoardMeeting(runtimeCtx)

  if (intent === CEO_COPILOT_INTENT.BOARD_TODAY_MEETING) {
    if (!latest) return 'Strategic AI Board: Henüz toplantı yok.'
    return [
      'Strategic AI Board · Bugünkü toplantı',
      latest.executiveSummary.headline,
      latest.executiveSummary.narrative.split('\n').slice(0, 4).join('\n'),
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.BOARD_TOP_DECISIONS) {
    const decisions = latest?.executiveSummary.topDecisions ?? []
    return [
      'Strategic AI Board · En önemli üç karar',
      ...(decisions.length ? decisions : ['Karar kaydı yok — board toplantısı başlatın']),
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.BOARD_TOMORROW_FOCUS) {
    const focus = latest?.executiveSummary.tomorrowFocus ?? []
    return [
      'Strategic AI Board · Yarın odak',
      ...(focus.length ? focus : ['Board toplantısı sonrası odak planı oluşacak']),
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.BOARD_HISTORY) {
    const history = await fetchBoardMeetingHistory(runtimeCtx, { limit: 3 })
    const lines = history.records.map((r) => `${r.occurredAt.slice(0, 10)} · ${r.question} → ${r.result}`)
    return ['Strategic AI Board · Geçmiş', ...(lines.length ? lines : ['Kayıt yok'])].join('\n')
  }

  void message
  return null
}

export {}
