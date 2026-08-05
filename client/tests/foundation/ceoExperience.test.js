import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DEMO_TODAY } from '../../src/data/constants.js'
import { initialOrders } from '../../src/data/seedOrders.js'
import { projectLegacyOrderToListItemDto } from '../../src/services/orderListItemProjection.js'
import { DOMAIN_EVENT_TYPE } from '../../src/contracts/v1/domainEventTypes.js'
import { buildExecutiveCommandCenterView } from '../../src/mappers/executive/executiveCommandCenterModel.js'
import {
  buildCeoExperienceView,
  buildCeoLiveFeed,
  buildCompanyHealthScore,
  buildCeoTodaySummary,
  buildDepartmentHeatmap,
  buildCeoAiActivity,
  formatCeoLiveFeedMessage,
} from '../../src/mappers/executive/ceoExperienceModel.js'
import { AI_LIVING_STATUS } from '../../src/mappers/digital-workforce/digitalWorkforceLivingEngine.js'
import { buildWorkerLivingVm } from '../../src/mappers/digital-workforce/digitalWorkforceLivingEngine.js'
import { DigitalWorkforceLivingEngine } from '../../src/mappers/digital-workforce/digitalWorkforceLivingEngine.js'
import ExecutiveAnimatedKpi from '../../src/features/executive/ExecutiveAnimatedKpi.jsx'
import ExecutiveLiveFeed from '../../src/features/executive/ExecutiveLiveFeed.jsx'

describe('ceoExperienceModel live feed', () => {
  it('domain eventlerini CEO Live Feed formatına çevirir', () => {
    const feed = buildCeoLiveFeed([
      {
        id: 'e1',
        type: DOMAIN_EVENT_TYPE.AI_SALES_TASK_COMPLETED,
        aggregateId: 'S-24089',
        occurredAt: `${DEMO_TODAY}T09:01:00.000Z`,
        payload: { worker: 'AI Sales', workerId: 'dw-sales-follow-up' },
      },
      {
        id: 'e2',
        type: DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_COMPLETED,
        aggregateId: 'S-24105',
        occurredAt: `${DEMO_TODAY}T09:05:00.000Z`,
        payload: { worker: 'AI Shipment' },
      },
    ])

    expect(feed.length).toBeGreaterThanOrEqual(2)
    expect(feed[0].timeLabel).toMatch(/\d{2}:\d{2}/)
    expect(feed.some((f) => f.message.includes('S-24105'))).toBe(true)
    expect(formatCeoLiveFeedMessage({
      type: DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED,
      aggregateId: 'S-24089',
      payload: {},
    })).toContain('S-24089')
  })
})

describe('ceoExperienceModel health score', () => {
  it('100 üzerinden şirket sağlığı ve açıklama üretir', () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    const listItemDtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    const base = buildExecutiveCommandCenterView({
      orders,
      listItemDtos,
      collectionRows: [],
      shipmentRowVMs: [],
      domainEvents: [],
      todayIso: DEMO_TODAY,
    })

    const health = buildCompanyHealthScore({
      riskPanel: base.riskPanel,
      orders,
      listItemDtos,
      domainEvents: [],
      todayIso: DEMO_TODAY,
    })

    expect(health.score).toBeGreaterThan(0)
    expect(health.score).toBeLessThanOrEqual(100)
    expect(health.explanation).toBeTruthy()
    expect(health.dimensions.length).toBeGreaterThanOrEqual(6)
  })
})

describe('ceoExperienceModel today summary', () => {
  it('bugün neler oldu özet satırları üretir', () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    const listItemDtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    const base = buildExecutiveCommandCenterView({
      orders,
      listItemDtos,
      collectionRows: [],
      shipmentRowVMs: [],
      domainEvents: [],
      todayIso: DEMO_TODAY,
    })

    const summary = buildCeoTodaySummary({
      orders,
      listItemDtos,
      domainEvents: [],
      todayIso: DEMO_TODAY,
      todayStatus: base.todayStatus,
      criticalIssues: base.criticalIssues,
    })

    expect(summary.headline).toBe('Bugün')
    expect(summary.items.length).toBeGreaterThanOrEqual(4)
    expect(summary.revenueLabel).toContain('Toplam ciro')
  })
})

describe('ceoExperienceModel department heatmap', () => {
  it('departman yoğunluk barları üretir', () => {
    const rows = buildDepartmentHeatmap(
      [
        {
          id: 'e1',
          type: DOMAIN_EVENT_TYPE.AI_SALES_TASK_CREATED,
          occurredAt: `${DEMO_TODAY}T09:00:00.000Z`,
        },
        {
          id: 'e2',
          type: DOMAIN_EVENT_TYPE.PAYMENT_POSTED,
          occurredAt: `${DEMO_TODAY}T10:00:00.000Z`,
        },
      ],
      DEMO_TODAY,
    )

    expect(rows).toHaveLength(4)
    expect(rows[0].bar).toMatch(/█/)
    expect(rows.every((r) => r.count >= 0)).toBe(true)
  })
})

describe('ceoExperienceModel AI activity', () => {
  it('4 AI worker durum satırı üretir', () => {
    const engine = new DigitalWorkforceLivingEngine()
    const state = engine.getOrCreateState('dw-sales-follow-up')
    state.status = AI_LIVING_STATUS.THINKING
    state.hasWork = true

    const livingMap = engine.getLivingMap()
    const activity = buildCeoAiActivity(livingMap)

    expect(activity).toHaveLength(4)
    expect(activity.some((a) => a.statusLabel.includes('Thinking'))).toBe(true)
    expect(buildWorkerLivingVm(state, 'dw-sales-follow-up').message).toBeTruthy()
  })
})

describe('ceoExperienceModel integration', () => {
  it('buildCeoExperienceView top 5 kritik ve live feed içerir', () => {
    const orders = initialOrders.filter((o) => o.status !== 'İptal')
    const listItemDtos = orders.map((o) => projectLegacyOrderToListItemDto(o, DEMO_TODAY))
    const base = buildExecutiveCommandCenterView({
      orders,
      listItemDtos,
      collectionRows: [],
      shipmentRowVMs: [],
      domainEvents: [
        {
          id: 'live-1',
          type: DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_CREATED,
          aggregateId: 'S-100',
          occurredAt: `${DEMO_TODAY}T09:06:00.000Z`,
          payload: { worker: 'AI Collection' },
        },
      ],
      todayIso: DEMO_TODAY,
    })

    const experience = buildCeoExperienceView({
      baseView: base,
      domainEvents: [
        {
          id: 'live-1',
          type: DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_CREATED,
          aggregateId: 'S-100',
          occurredAt: `${DEMO_TODAY}T09:06:00.000Z`,
          payload: { worker: 'AI Collection' },
        },
      ],
      orchestrationTimeline: [],
      livingMap: {},
      orders,
      listItemDtos,
      todayIso: DEMO_TODAY,
    })

    expect(experience.topCritical.length).toBeLessThanOrEqual(5)
    expect(experience.liveFeed.length).toBeGreaterThan(0)
    expect(experience.health.score).toBeGreaterThan(0)
    expect(experience.aiActivity).toHaveLength(4)
  })
})

describe('ceoExperience KPI animation', () => {
  it('pulse CSS animasyonu tanımlı', () => {
    const css = readFileSync(
      resolve('src/styles/executive-command-center.css'),
      'utf8',
    )
    expect(css).toContain('.ecc-kpi--pulse')
    expect(css).toMatch(/@keyframes ecc-kpi-pulse/)
  })
})

describe('ceoExperience UI modules', () => {
  it('animated KPI ve live feed bileşenleri yüklenir', () => {
    expect(typeof ExecutiveAnimatedKpi).toBe('object')
    expect(typeof ExecutiveLiveFeed).toBe('object')
    expect(ExecutiveAnimatedKpi.$$typeof).toBeTruthy()
  })
})
