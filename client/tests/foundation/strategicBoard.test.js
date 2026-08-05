import { beforeEach, describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { bootstrapMockOrderLinesFromOrders } from '../../src/services/mockOrderLineBootstrap.js'
import { BOARD_MEMBER_ID } from '../../src/contracts/v1/strategicBoard.js'
import {
  analyzeBoardConsensus,
  detectBoardQuestionTopic,
  runBoardDiscussion,
} from '../../src/engine/board/BoardDiscussion.js'
import { buildExecutiveSummary } from '../../src/engine/board/ExecutiveSummaryBuilder.js'
import {
  resetBoardMeetingEngineSeqForTests,
  runStrategicBoardMeeting,
} from '../../src/engine/board/BoardMeetingEngine.js'
import {
  getBoardMeetingHistoryLocal,
  resetBoardMeetingStoreForTests,
  runBoardMeeting,
} from '../../src/services/board/BoardMeetingService.js'
import { fetchBoardMeetingHistory, fetchRunBoardMeeting } from '../../src/services/boardMeetingClient.js'

describe('Strategic AI Board (FAZ 109)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal')
  let dtos
  const runtimeCtx = () => ({ orders, dtos, collectionRows: [], todayIso: DEMO_TODAY })

  beforeEach(() => {
    resetBoardMeetingStoreForTests()
    resetBoardMeetingEngineSeqForTests()
    bootstrapMockOrderLinesFromOrders(orders)
    dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
  })

  describe('Board Simulation', () => {
    it('CEO sorusu ile board toplanır', () => {
      const meeting = runStrategicBoardMeeting({
        question: 'Neden satış düştü?',
        orders,
        dtos,
        todayIso: DEMO_TODAY,
      })
      expect(meeting.participantIds.length).toBe(7)
      expect(meeting.discussion.length).toBe(7)
      expect(meeting.executiveSummary.headline).toMatch(/Satış/)
    })

    it('Sales Director müşteri trafiği yorumu üretir', () => {
      const discussion = runBoardDiscussion({
        question: 'Neden satış düştü?',
        topic: 'sales_drop',
        domains: {
          sales: { pressure: 3, score: 4 },
          collection: { pressure: 2, score: 3 },
          shipment: { pressure: 1, score: 2 },
          procurement: { pressure: 1, score: 1 },
          criticalOrders: 2,
        },
        dominant: 'sales',
      })
      const sales = discussion.find((d) => d.memberId === BOARD_MEMBER_ID.SALES)
      expect(sales?.opinion).toMatch(/Müşteri trafiği/)
    })
  })

  describe('Consensus', () => {
    it('uyumlu görüşlerde konsensüs', () => {
      const discussion = runBoardDiscussion({
        question: 'Durum?',
        topic: 'general',
        domains: {
          sales: { pressure: 0, score: 1 },
          collection: { pressure: 0, score: 1 },
          shipment: { pressure: 0, score: 1 },
          procurement: { pressure: 0, score: 1 },
          criticalOrders: 0,
        },
        dominant: 'sales',
      })
      const { hasConsensus } = analyzeBoardConsensus(discussion)
      expect(hasConsensus).toBe(true)
    })
  })

  describe('Conflict Resolution', () => {
    it('çatışma tespit edilebilir', () => {
      const discussion = runBoardDiscussion({
        question: 'Neden satış düştü?',
        topic: 'sales_drop',
        domains: {
          sales: { pressure: 3, score: 4 },
          collection: { pressure: 3, score: 4 },
          shipment: { pressure: 1, score: 1 },
          procurement: { pressure: 1, score: 1 },
          criticalOrders: 3,
        },
        dominant: 'collection',
      })
      const { conflicts } = analyzeBoardConsensus(discussion)
      expect(Array.isArray(conflicts)).toBe(true)
    })
  })

  describe('Summary', () => {
    it('Executive Synthesizer üç karar üretir', () => {
      const discussion = runBoardDiscussion({
        question: 'Neden satış düştü?',
        topic: detectBoardQuestionTopic('Neden satış düştü?'),
        domains: {
          sales: { pressure: 3, score: 4 },
          collection: { pressure: 2, score: 3 },
          shipment: { pressure: 2, score: 2 },
          procurement: { pressure: 1, score: 1 },
          criticalOrders: 2,
        },
        dominant: 'sales',
      })
      const summary = buildExecutiveSummary({
        question: 'Neden satış düştü?',
        discussion,
        topic: 'sales_drop',
        dominant: 'sales',
        todayIso: DEMO_TODAY,
      })
      expect(summary.topDecisions.length).toBe(3)
      expect(summary.tomorrowFocus.length).toBe(3)
      expect(summary.narrative).toContain('Sales Director AI')
    })
  })

  describe('History', () => {
    it('board toplantıları kaydedilir', () => {
      runBoardMeeting('Bugünkü şirket toplantısı', runtimeCtx())
      runBoardMeeting('Neden satış düştü?', runtimeCtx())
      const history = getBoardMeetingHistoryLocal({ limit: 10 })
      expect(history.total).toBe(2)
      expect(history.records[0].question).toBe('Neden satış düştü?')
    })

    it('history API', async () => {
      runBoardMeeting('Yönetim kurulu', runtimeCtx())
      const history = await fetchBoardMeetingHistory(runtimeCtx(), { limit: 5 })
      expect(history.records.length).toBeGreaterThan(0)
    })

    it('board meeting API performans', async () => {
      const started = Date.now()
      await fetchRunBoardMeeting('Neden satış düştü?', runtimeCtx())
      expect(Date.now() - started).toBeLessThan(500)
    })
  })
})
