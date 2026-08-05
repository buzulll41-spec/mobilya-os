import { BOARD_DIRECTOR_ORDER } from '../../contracts/v1/strategicBoard.js'
import { detectBoardQuestionTopic, runBoardDiscussion } from './BoardDiscussion.js'
import { buildExecutiveSummary } from './ExecutiveSummaryBuilder.js'
import { BusinessEngine } from '../businessEngine.js'
import {
  pickDominantDomain,
  scoreOperationalDomains,
} from '../company-manager/PriorityEngine.js'
import { getAllDomainEventsSnapshot } from '../../services/mockDomainEventStore.js'

/** @typedef {import('../../contracts/v1/strategicBoard.js').BoardMeetingRecordDto} BoardMeetingRecordDto */

let seq = 0

function nextId() {
  seq += 1
  return `board-${Date.now()}-${seq}`
}

/**
 * @param {{
 *   question: string
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 *   occurredAt?: string
 * }} input
 * @returns {BoardMeetingRecordDto}
 */
export function runStrategicBoardMeeting(input) {
  const { question, orders, dtos, todayIso, occurredAt = `${todayIso}T10:00:00.000Z` } = input
  const domainEvents = getAllDomainEventsSnapshot()
  const snapshots = [...BusinessEngine.computeOrderSnapshots(orders, dtos, todayIso).values()]
  const domains = scoreOperationalDomains({ snapshots, domainEvents, todayIso })
  const dominant = pickDominantDomain(domains)
  const topic = detectBoardQuestionTopic(question)

  const discussion = runBoardDiscussion({
    question,
    topic,
    domains: {
      sales: domains.sales,
      collection: domains.collection,
      shipment: domains.shipment,
      procurement: domains.procurement,
      criticalOrders: domains.criticalOrders,
    },
    dominant,
  })

  const executiveSummary = buildExecutiveSummary({
    question,
    discussion,
    topic,
    dominant,
    todayIso,
  })

  return {
    id: nextId(),
    question,
    occurredAt,
    participantIds: [...BOARD_DIRECTOR_ORDER],
    discussion,
    executiveSummary,
    result: executiveSummary.headline,
  }
}

export function resetBoardMeetingEngineSeqForTests() {
  seq = 0
}

export {}
