import { mockGetActionCenter } from './mockActionCenterApi.js'
import { mockGetOperationCases } from './mockOperationCaseApi.js'
import { mockGetProfitabilityAnalytics } from './mockProfitabilityAnalyticsApi.js'

/**
 * Mock Operasyon Otomasyonu — backend `buildJobs` mantığının aynası.
 * Faz 8/9 mock çıktılarını tüketir; iş durumları in-memory store'da tutulur.
 */

const PRIORITY_RANK = { P1: 1, P2: 2, P3: 3, P4: 4, P5: 5 }
const PROFIT_DROP_PCT = 15
const MONTH = { from: '2026-05-01', to: '2026-05-31' }
const APR = { from: '2026-04-01', to: '2026-04-30' }

const jobStore = new Map()

export function resetMockJobStore() {
  jobStore.clear()
}

function actionOrderId(a) {
  if (a.relatedEntityType === 'order') return a.relatedEntityId
  if (a.relatedEntityType === 'orderLine') {
    const oid = a.evidence?.orderId
    return typeof oid === 'string' && oid ? oid : null
  }
  return null
}

function caseIdForOrder(orderId) {
  return orderId ? `CASE-${orderId}` : null
}

const num = (s) => {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
const round1 = (n) => Math.round(n * 10) / 10

async function buildMockJobs(query = {}) {
  const limited = query.limitedView === 'true' || query.limitedView === true || query.limitedView === '1'
  const fSalesPerson = typeof query.salesPerson === 'string' && query.salesPerson.trim() ? query.salesPerson.trim() : null

  const actionResult = await mockGetActionCenter({ salesPerson: fSalesPerson ?? undefined, limitedView: limited ? 'true' : undefined })
  await mockGetOperationCases({ salesPerson: fSalesPerson ?? undefined, limitedView: limited ? 'true' : undefined })
  const monthSrc = await mockGetProfitabilityAnalytics({ ...MONTH, groupBy: 'source' })
  const prevMonthSrc = await mockGetProfitabilityAnalytics({ ...APR, groupBy: 'source' })

  const drafts = []
  for (const a of actionResult.actions) {
    const orderId = actionOrderId(a)
    const base = {
      triggerSource: 'action',
      relatedCaseId: caseIdForOrder(orderId),
      relatedOrderId: orderId,
      salesPerson: a.salesPerson ?? null,
      aggregate: Boolean(a.aggregate),
      reason: a.reason,
      createdAt: a.createdAt,
    }
    if (a.id.startsWith('collection-call:')) {
      drafts.push({ id: `job:collection:${orderId ?? a.id}`, jobType: 'CREATE_COLLECTION_CASE', priority: 'P1', initialStatus: 'WAITING_APPROVAL', recommendedAction: 'Müşteri tahsilat listesine eklensin', requiresApproval: true, title: 'Tahsilat vakası hazırla', ...base })
    } else if (a.id.startsWith('shipment-overdue:')) {
      drafts.push({ id: `job:shipment:${orderId ?? a.id}`, jobType: 'CREATE_SHIPMENT_CASE', priority: 'P1', initialStatus: 'WAITING_APPROVAL', recommendedAction: 'Sevk operasyonuna aktar', requiresApproval: true, title: 'Geciken sevk vakası hazırla', ...base })
    } else if (a.id.startsWith('dq-zero-cost:')) {
      drafts.push({ id: `job:dq-cost:${a.relatedEntityId ?? a.id}`, jobType: 'CREATE_DATA_QUALITY_CASE', priority: 'P1', initialStatus: 'CREATED', recommendedAction: 'Alış maliyeti tamamlanmalı', requiresApproval: false, title: 'Maliyet düzeltme vakası hazırla', ...base })
    } else if (a.id.startsWith('dq-unknown:')) {
      drafts.push({ id: `job:dq-source:${a.relatedEntityId ?? a.id}`, jobType: 'CREATE_SOURCE_REVIEW_CASE', priority: 'P2', initialStatus: 'WAITING_APPROVAL', recommendedAction: 'Satış kaynağı gözden geçirilmeli', requiresApproval: true, title: 'Kaynak inceleme vakası hazırla', ...base })
    } else if (a.id === 'sales-target-review') {
      drafts.push({ id: 'job:sales-target', jobType: 'CREATE_SALES_REVIEW_CASE', priority: 'P3', initialStatus: 'WAITING_APPROVAL', recommendedAction: 'Satış ekibi hedef altı performansı değerlendirsin', requiresApproval: true, title: 'Hedef altı satış incelemesi', triggerSource: 'forecast', relatedCaseId: 'CASE-sales-general', relatedOrderId: null, salesPerson: null, aggregate: true, reason: a.reason, createdAt: a.createdAt })
    }
  }

  const prevByKey = new Map(prevMonthSrc.rows.map((r) => [r.key, num(r.grossProfit)]))
  for (const r of monthSrc.rows) {
    const cur = num(r.grossProfit)
    const prev = prevByKey.get(r.key) ?? 0
    if (prev > 0) {
      const changePct = round1(((cur - prev) / prev) * 100)
      if (changePct <= -PROFIT_DROP_PCT) {
        drafts.push({
          id: `job:profit:${r.key}`,
          jobType: 'CREATE_PROFIT_REVIEW_CASE',
          priority: 'P2',
          initialStatus: 'WAITING_APPROVAL',
          recommendedAction: `${r.label} kârlılığı gözden geçirilmeli`,
          requiresApproval: true,
          title: `${r.label} kâr incelemesi`,
          triggerSource: 'profitability',
          relatedCaseId: null,
          relatedOrderId: null,
          salesPerson: null,
          aggregate: true,
          reason: `${r.label} brüt kârı geçen aya göre %${Math.abs(changePct)} azaldı.`,
          createdAt: actionResult.today + 'T08:00:00.000Z',
        })
      }
    }
  }

  let scoped = drafts
  if (limited) {
    scoped = drafts.filter((d) => {
      if (d.aggregate) return false
      if (!fSalesPerson) return true
      return d.salesPerson === fSalesPerson
    })
  }

  const allJobs = scoped.map((d) => {
    const ov = jobStore.get(d.id)
    const status = ov?.status ?? d.initialStatus
    return {
      id: d.id,
      jobType: d.jobType,
      priority: d.priority,
      status,
      triggerSource: d.triggerSource,
      relatedCaseId: d.relatedCaseId,
      relatedOrderId: d.relatedOrderId,
      recommendedAction: d.recommendedAction,
      requiresApproval: d.requiresApproval,
      approvedBy: ov?.approvedBy ?? null,
      executedAt: ov?.executedAt ?? null,
      createdAt: d.createdAt,
      updatedAt: ov?.updatedAt ?? d.createdAt,
      title: d.title,
      reason: d.reason,
      salesPerson: d.salesPerson,
      aggregate: d.aggregate,
    }
  })

  const sortJobs = (arr) =>
    [...arr].sort((a, b) => {
      const r = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority]
      if (r !== 0) return r
      return a.id < b.id ? -1 : a.id > b.id ? 1 : 0
    })

  const queue = {
    pending: sortJobs(allJobs.filter((j) => j.status === 'CREATED')),
    waitingApproval: sortJobs(allJobs.filter((j) => j.status === 'WAITING_APPROVAL')),
    executing: sortJobs(allJobs.filter((j) => j.status === 'EXECUTING' || j.status === 'APPROVED')),
    completed: sortJobs(allJobs.filter((j) => j.status === 'COMPLETED')),
    failed: sortJobs(allJobs.filter((j) => j.status === 'FAILED')),
  }

  return {
    summary: {
      totalJobs: allJobs.length,
      pendingCount: allJobs.filter((j) => j.status === 'CREATED').length,
      waitingApprovalCount: allJobs.filter((j) => j.status === 'WAITING_APPROVAL').length,
      executingCount: allJobs.filter((j) => j.status === 'EXECUTING').length,
      completedCount: allJobs.filter((j) => j.status === 'COMPLETED').length,
      failedCount: allJobs.filter((j) => j.status === 'FAILED').length,
      cancelledCount: allJobs.filter((j) => j.status === 'CANCELLED').length,
      autoRunReadyCount: allJobs.filter((j) => j.status === 'CREATED' && !j.requiresApproval).length,
    },
    jobs: sortJobs(allJobs),
    queue,
    filters: { status: null, priority: null, q: null, salesPerson: fSalesPerson, limitedView: limited },
    currency: actionResult.currency,
    today: actionResult.today,
    generatedAt: new Date().toISOString(),
  }
}

export async function mockGetAutomationJobs(query = {}) {
  return buildMockJobs(query)
}

function setOverride(id, patch) {
  const now = new Date().toISOString()
  const existing = jobStore.get(id) ?? {}
  const next = { ...existing, ...patch, updatedAt: now }
  jobStore.set(id, next)
  return next
}

export async function mockApproveAutomationJob(id, body = {}) {
  const res = await buildMockJobs()
  const job = res.jobs.find((j) => j.id === id)
  if (!job || job.status !== 'WAITING_APPROVAL') {
    const err = new Error('Onaylanamaz durum')
    err.status = 400
    throw err
  }
  return setOverride(id, { status: 'APPROVED', approvedBy: body.approvedBy ?? 'manager' })
}

export async function mockRunAutomationJob(id) {
  const res = await buildMockJobs()
  const job = res.jobs.find((j) => j.id === id)
  if (!job) {
    const err = new Error('İş bulunamadı')
    err.status = 404
    throw err
  }
  const runnable = (job.status === 'CREATED' && !job.requiresApproval) || job.status === 'APPROVED'
  if (!runnable) {
    const err = new Error('Çalıştırılamaz durum')
    err.status = 400
    throw err
  }
  return setOverride(id, { status: 'COMPLETED', executedAt: new Date().toISOString() })
}

export async function mockCancelAutomationJob(id) {
  const res = await buildMockJobs()
  const job = res.jobs.find((j) => j.id === id)
  if (!job || ['COMPLETED', 'FAILED', 'CANCELLED'].includes(job.status)) {
    const err = new Error('İptal edilemez durum')
    err.status = 400
    throw err
  }
  return setOverride(id, { status: 'CANCELLED' })
}

export async function mockBulkApproveAutomationJobs(ids, body = {}) {
  const approved = []
  const failed = []
  for (const id of ids) {
    try {
      await mockApproveAutomationJob(id, body)
      approved.push(id)
    } catch (err) {
      failed.push({ id, reason: err.message })
    }
  }
  return { approved, failed }
}

export async function mockBulkRunAutomationJobs(ids) {
  const completed = []
  const failed = []
  for (const id of ids) {
    try {
      await mockRunAutomationJob(id)
      completed.push(id)
    } catch (err) {
      failed.push({ id, reason: err.message })
    }
  }
  return { completed, failed }
}

export async function mockBulkCancelAutomationJobs(ids) {
  const cancelled = []
  const failed = []
  for (const id of ids) {
    try {
      await mockCancelAutomationJob(id)
      cancelled.push(id)
    } catch (err) {
      failed.push({ id, reason: err.message })
    }
  }
  return { cancelled, failed }
}
