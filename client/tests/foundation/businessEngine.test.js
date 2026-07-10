import { describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import {
  BUSINESS_ORDER_STAGE,
  BUSINESS_STAGE_LABEL,
  BUSINESS_STAGE_PROGRESS,
} from '../../src/contracts/v1/businessEngine.js'
import BusinessEngine, {
  computeOrderBusinessSnapshot,
  progressPercentForStage,
  resolveKanbanColumnId,
} from '../../src/engine/businessEngine.js'
import { resolveKanbanColumn } from '../../src/mappers/operation-map/operationMapKanbanModel.js'

describe('BusinessEngine (FAZ 22A)', () => {
  const orders = initialOrders.filter((o) => o.status !== 'İptal').slice(0, 5)
  const dtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))

  it('sipariş snapshot — stage, progress, risk, priority, nextAction', () => {
    const order = orders[0]
    const dto = dtos[0]
    const snap = computeOrderBusinessSnapshot({ order, dto, todayIso: DEMO_TODAY })

    expect(snap.orderId).toBe(order.id)
    expect(BUSINESS_STAGE_LABEL[snap.currentStage]).toBeTruthy()
    expect(snap.progressPercent).toBeGreaterThanOrEqual(0)
    expect(snap.progressPercent).toBeLessThanOrEqual(100)
    expect(snap.riskScores.collection).toBeGreaterThanOrEqual(0)
    expect(snap.riskScores.shipment).toBeGreaterThanOrEqual(0)
    expect(snap.riskScores.supply).toBeGreaterThanOrEqual(0)
    expect(snap.riskScores.ssh).toBeGreaterThanOrEqual(0)
    expect(snap.riskScores.operations).toBeGreaterThanOrEqual(0)
    expect(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).toContain(snap.priority)
    expect(snap.healthScore).toBeGreaterThanOrEqual(0)
    expect(snap.nextAction.length).toBeGreaterThan(0)
    expect(snap.domains).toHaveLength(9)
  })

  it('progress aşama eşlemesi tanımlı', () => {
    expect(progressPercentForStage(BUSINESS_ORDER_STAGE.NEW_ORDER)).toBe(0)
    expect(progressPercentForStage(BUSINESS_ORDER_STAGE.COMPLETED)).toBe(100)
    expect(BUSINESS_STAGE_PROGRESS.COMPLETED).toBe(100)
  })

  it('kanban kolonu geri uyumlu — engine ile kanban model aynı sonuç', () => {
    for (let i = 0; i < orders.length; i++) {
      const viaEngine = resolveKanbanColumnId(orders[i], dtos[i])
      const viaKanban = resolveKanbanColumn(orders[i], dtos[i])
      expect(viaEngine).toBe(viaKanban)
    }
  })

  it('toplu snapshot API', () => {
    const map = BusinessEngine.computeOrderSnapshots(orders, dtos, DEMO_TODAY)
    expect(map.size).toBe(orders.length)
    for (const order of orders) {
      expect(map.has(order.id)).toBe(true)
    }
  })
})
