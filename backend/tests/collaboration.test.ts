import { describe, expect, it } from 'vitest'
import { COLLABORATION_MESSAGE_TYPE } from '../src/contracts/collaborationDto.js'
import {
  buildCollaborationGraph,
  createCollaborationMessage,
  detectCollaborationSignals,
  findBusiestTeamLabel,
  sortMessagesByPriority,
  resetCollaborationEngineSeqForTests,
} from '../src/services/collaboration/CollaborationEngine.js'

describe('Multi-Agent Collaboration (FAZ 108)', () => {
  describe('Worker Message', () => {
    it('Sales ödeme Collection INFO + Shipment CONTINUE zinciri', () => {
      const messages = detectCollaborationSignals({
        domains: {
          collection: { score: 1, pressure: 1 },
          procurement: { score: 0, pressure: 0 },
          sales: { score: 2, pressure: 1 },
        },
        dominant: 'sales',
        conflicts: [],
        todayIso: '2026-06-18',
      })
      expect(messages.some((m) => m.type === COLLABORATION_MESSAGE_TYPE.INFO)).toBe(true)
      expect(messages.some((m) => m.type === COLLABORATION_MESSAGE_TYPE.CONTINUE)).toBe(true)
    })
  })

  describe('Transfer', () => {
    it('TASK_TRANSFER mesajı oluşturulur', () => {
      const msg = createCollaborationMessage('dw-shipment', 'dw-collection', 'TASK_TRANSFER', {
        reason: 'devir',
      })
      expect(msg.type).toBe(COLLABORATION_MESSAGE_TYPE.TASK_TRANSFER)
    })
  })

  describe('Priority Change', () => {
    it('PRIORITY_CHANGE en yüksek öncelik', () => {
      const messages = [
        createCollaborationMessage('dw-ceo-assistant', 'dw-sales-follow-up', 'PRIORITY_CHANGE', {
          reason: 'prio',
        }),
        createCollaborationMessage('dw-collection', 'dw-shipment', 'INFO', { reason: 'info' }),
      ]
      expect(sortMessagesByPriority(messages)[0].type).toBe(COLLABORATION_MESSAGE_TYPE.PRIORITY_CHANGE)
    })
  })

  describe('History', () => {
    it('dedupe aynı mesajı tekrarlamaz', () => {
      resetCollaborationEngineSeqForTests()
      const messages = detectCollaborationSignals({
        domains: {
          collection: { score: 4, pressure: 3 },
          procurement: { score: 2, pressure: 2 },
          sales: { score: 2, pressure: 1 },
        },
        dominant: 'collection',
        conflicts: [],
        todayIso: '2026-06-18',
      })
      const ids = new Set(messages.map((m) => `${m.fromWorkerId}|${m.toWorkerId}|${m.type}`))
      expect(ids.size).toBe(messages.length)
    })
  })

  describe('Performance', () => {
    it('1000 graph build < 50ms', () => {
      const messages = detectCollaborationSignals({
        domains: {
          collection: { score: 4, pressure: 3 },
          procurement: { score: 2, pressure: 2 },
          sales: { score: 2, pressure: 1 },
        },
        dominant: 'collection',
        conflicts: [],
        todayIso: '2026-06-18',
      })
      const started = Date.now()
      for (let i = 0; i < 1000; i++) buildCollaborationGraph(messages)
      expect(Date.now() - started).toBeLessThan(50)
    })
  })

  describe('Company Collaboration', () => {
    it('busiest team label', () => {
      const graph = buildCollaborationGraph([
        createCollaborationMessage('dw-collection', 'dw-shipment', 'WAIT', { reason: 'wait' }),
        createCollaborationMessage('dw-collection', 'dw-shipment', 'CONTINUE', { reason: 'go' }),
      ])
      expect(findBusiestTeamLabel(graph)).toContain('Collection AI')
    })
  })
})
