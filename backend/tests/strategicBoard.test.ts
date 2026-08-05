import { describe, expect, it } from 'vitest'
import { BOARD_MEMBER_ID } from '../src/contracts/strategicBoardDto.js'
import {
  detectBoardQuestionTopic,
  runBoardDiscussion,
  runStrategicBoardMeeting,
  resetBoardMeetingEngineSeqForTests,
} from '../src/services/board/BoardMeetingEngine.js'

describe('Strategic AI Board (FAZ 109)', () => {
  describe('Board Simulation', () => {
    it('7 director katılır', () => {
      resetBoardMeetingEngineSeqForTests()
      const meeting = runStrategicBoardMeeting({
        question: 'Neden satış düştü?',
        todayIso: '2026-06-18',
      })
      expect(meeting.participantIds).toHaveLength(7)
      expect(meeting.discussion.some((d) => d.memberId === BOARD_MEMBER_ID.GROWTH)).toBe(true)
    })
  })

  describe('Consensus', () => {
    it('topic sales_drop algılanır', () => {
      expect(detectBoardQuestionTopic('Neden satış düştü?')).toBe('sales_drop')
    })
  })

  describe('Conflict Resolution', () => {
    it('finance nakit yorumu', () => {
      const discussion = runBoardDiscussion({
        question: 'Neden satış düştü?',
        topic: 'sales_drop',
        domains: {
          sales: { pressure: 2, score: 3 },
          collection: { pressure: 3, score: 4 },
          shipment: { pressure: 1, score: 1 },
          procurement: { pressure: 1, score: 1 },
          criticalOrders: 2,
        },
        dominant: 'collection',
      })
      const finance = discussion.find((d) => d.memberId === BOARD_MEMBER_ID.FINANCE)
      expect(finance?.opinion).toMatch(/Nakit/)
    })
  })

  describe('Summary', () => {
    it('executive summary result döner', () => {
      resetBoardMeetingEngineSeqForTests()
      const meeting = runStrategicBoardMeeting({ question: 'Karar?', todayIso: '2026-06-18' })
      expect(meeting.executiveSummary.topDecisions.length).toBeGreaterThan(0)
      expect(meeting.result).toBeTruthy()
    })
  })

  describe('History', () => {
    it('100 meeting < 100ms', () => {
      resetBoardMeetingEngineSeqForTests()
      const started = Date.now()
      for (let i = 0; i < 100; i++) {
        runStrategicBoardMeeting({ question: `Soru ${i}`, todayIso: '2026-06-18' })
      }
      expect(Date.now() - started).toBeLessThan(100)
    })
  })
})
