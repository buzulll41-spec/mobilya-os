/** @typedef {import('../../contracts/v1/strategicBoard.js').BoardMeetingRecordDto} BoardMeetingRecordDto */

/** @type {BoardMeetingRecordDto[]} */
let history = []
/** @type {Set<(records: BoardMeetingRecordDto[]) => void>} */
const listeners = new Set()

export function recordBoardMeeting(meeting) {
  history = [meeting, ...history].slice(0, 100)
  for (const fn of listeners) fn(history)
  return meeting
}

export function getBoardMeetingHistorySnapshot() {
  return history.slice()
}

export function getLatestBoardMeetingSnapshot() {
  return history[0] ?? null
}

export function subscribeBoardMeetingStore(fn) {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

export function resetBoardMeetingStoreForTests() {
  history = []
  listeners.clear()
}

export {}
