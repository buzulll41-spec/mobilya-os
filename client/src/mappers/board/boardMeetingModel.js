import { BOARD_MEMBER_ID } from '../../contracts/v1/strategicBoard.js'

/**
 * @param {import('../../contracts/v1/strategicBoard.js').BoardMeetingRecordDto | null} meeting
 */
export function buildBoardMeetingVm(meeting) {
  if (!meeting) {
    return {
      hasMeeting: false,
      question: '',
      headline: 'Henüz board toplantısı yok',
      narrative: '',
      topDecisions: [],
      tomorrowFocus: [],
      hasConsensus: true,
      conflicts: [],
      participants: [],
      discussion: [],
      occurredAt: '',
      result: '',
    }
  }

  return {
    hasMeeting: true,
    id: meeting.id,
    question: meeting.question,
    headline: meeting.executiveSummary.headline,
    narrative: meeting.executiveSummary.narrative,
    topDecisions: meeting.executiveSummary.topDecisions,
    tomorrowFocus: meeting.executiveSummary.tomorrowFocus,
    hasConsensus: meeting.executiveSummary.hasConsensus,
    conflicts: meeting.executiveSummary.conflicts,
    participants: meeting.participantIds.map((id) => ({
      id,
      label: meeting.discussion.find((d) => d.memberId === id)?.memberLabel ?? id,
    })),
    discussion: meeting.discussion.filter((d) => d.memberId !== BOARD_MEMBER_ID.CEO),
    ceoOpinion: meeting.discussion.find((d) => d.memberId === BOARD_MEMBER_ID.CEO),
    occurredAt: meeting.occurredAt,
    result: meeting.result,
  }
}

/**
 * @param {import('../../contracts/v1/strategicBoard.js').BoardMeetingRecordDto[]} records
 */
export function buildBoardMeetingHistoryVm(records) {
  return records.map((m) => ({
    id: m.id,
    question: m.question,
    occurredAt: m.occurredAt,
    result: m.result,
    participantCount: m.participantIds.length,
  }))
}

export {}
