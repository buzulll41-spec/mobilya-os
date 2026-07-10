import { runStrategicBoardMeeting, resetBoardMeetingEngineSeqForTests } from '../../engine/board/BoardMeetingEngine.js'
import {
  getBoardMeetingHistorySnapshot,
  getLatestBoardMeetingSnapshot,
  recordBoardMeeting,
  resetBoardMeetingStoreForTests,
  subscribeBoardMeetingStore,
} from './boardMeetingStore.js'

/** @typedef {import('../../contracts/v1/strategicBoard.js').BoardMeetingRecordDto} BoardMeetingRecordDto */

/**
 * @param {string} question
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function runBoardMeeting(question, runtimeCtx) {
  const meeting = runStrategicBoardMeeting({
    question: question.trim() || 'Bugünkü şirket durumu nedir?',
    orders: runtimeCtx.orders,
    dtos: runtimeCtx.dtos,
    todayIso: runtimeCtx.todayIso,
  })
  return recordBoardMeeting(meeting)
}

/**
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 * }} runtimeCtx
 */
export function ensureDefaultBoardMeeting(runtimeCtx) {
  if (getLatestBoardMeetingSnapshot()) return getLatestBoardMeetingSnapshot()
  return runBoardMeeting('Bugünkü şirket toplantısı', runtimeCtx)
}

/** @param {{ limit?: number }} [opts] */
export function getBoardMeetingHistoryLocal(opts = {}) {
  const limit = opts.limit ?? 20
  const records = getBoardMeetingHistorySnapshot()
  return { records: records.slice(0, limit), total: records.length }
}

export function getLatestBoardMeetingLocal() {
  return getLatestBoardMeetingSnapshot()
}

export { subscribeBoardMeetingStore, resetBoardMeetingStoreForTests, resetBoardMeetingEngineSeqForTests }

export {}
