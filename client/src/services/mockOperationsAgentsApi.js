import { getOrders } from './mockApi.js'
import { mockGetActionCenter } from './mockActionCenterApi.js'
import { mockGetOperationCases } from './mockOperationCaseApi.js'
import { mockGetAutomationJobs } from './mockAutomationApi.js'
import { mockGetDataQuality } from './mockDataQualityApi.js'
import { mockGetForecastEngine } from './mockForecastEngineApi.js'
import { mockGetProfitabilityAnalytics } from './mockProfitabilityAnalyticsApi.js'
import { mockGetOperationsAdvisor } from './mockOperationsAdvisorApi.js'
import { mockGetManagerCockpit } from './mockManagerCockpitApi.js'
import { AGENT_LABELS } from '../contracts/v1/operationsAgent.js'

/**
 * Mock Otonom Operasyon Ajanları — backend motorunun deterministik aynası.
 * Depo Katı satış kaynağı olarak hiçbir ajan çıktısında görünmez.
 */

const TODAY = '2026-05-14'
const MAY = { from: '2026-05-01', to: '2026-05-31' }
const TOP_LIMIT = 10

const num = (s) => {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
const round1 = (n) => Math.round(n * 10) / 10
const money = (n) => (Math.round(n * 100) / 100).toFixed(2)
const liNum = (m) => (m && typeof m === 'object' ? num(m.amount) : num(m))

function daysBetween(fromIso, toIso) {
  const a = Date.parse(`${fromIso}T00:00:00Z`)
  const b = Date.parse(`${toIso}T00:00:00Z`)
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 0
  return Math.round((a - b) / 86_400_000)
}

function addHours(iso, hours) {
  return new Date(Date.parse(iso) + hours * 3_600_000).toISOString()
}

const runStore = new Map()

const AGENT_META = {
  COLLECTION_AGENT: { id: 'agent-collection', defaultPriority: 'P1' },
  SHIPMENT_AGENT: { id: 'agent-shipment', defaultPriority: 'P1' },
  DATA_QUALITY_AGENT: { id: 'agent-data-quality', defaultPriority: 'P1' },
  SALES_AGENT: { id: 'agent-sales', defaultPriority: 'P3' },
  SUPPLIER_AGENT: { id: 'agent-supplier', defaultPriority: 'P2' },
  EXECUTIVE_AGENT: { id: 'agent-executive', defaultPriority: 'P1' },
}

const ALL_CODES = Object.keys(AGENT_META)

function isDepoKati(label) {
  return label === 'Depo Katı' || label === 'WAREHOUSE' || label === 'WAREHOUSE_FLOOR'
}

async function loadContext() {
  const orders = await getOrders()
  const listItems = orders.map((o) => ({
    id: o.id,
    orderNumber: o.orderNumber ?? o.id,
    customerDisplayName: o.customerDisplayName ?? o.customerName ?? 'Müşteri',
    remainingAmount: o.remainingAmount ?? { amount: money(o.remainingBalance ?? 0), currency: 'TRY' },
    currentRiskSeverity: o.currentRiskSeverity ?? o.riskLevel ?? 'NONE',
    hasOverdueBalance: Boolean(o.hasOverdueBalance),
    displayStatus: o.displayStatus ?? o.status ?? 'Üretimde',
    plannedShipmentDate: o.plannedShipmentDate ?? o.plannedShipDate ?? null,
    salesPerson: o.salesPerson ?? null,
  }))

  const [actions, cases, jobs, dq, forecast, src, person, supplier, advisories, cockpit] = await Promise.all([
    mockGetActionCenter({}),
    mockGetOperationCases({}),
    mockGetAutomationJobs({}),
    mockGetDataQuality({ from: MAY.from, to: MAY.to }),
    mockGetForecastEngine({}),
    mockGetProfitabilityAnalytics({ from: MAY.from, to: MAY.to, groupBy: 'source' }),
    mockGetProfitabilityAnalytics({ from: MAY.from, to: MAY.to, groupBy: 'salesPerson' }),
    mockGetProfitabilityAnalytics({ from: MAY.from, to: MAY.to, groupBy: 'supplier' }),
    mockGetOperationsAdvisor({}),
    mockGetManagerCockpit({}),
  ])

  let delayedShipments = 0
  let overdueCount = 0
  for (const it of listItems) {
    if (it.displayStatus !== 'Teslim Edildi' && it.plannedShipmentDate && it.plannedShipmentDate < TODAY) delayedShipments += 1
    if (it.hasOverdueBalance) overdueCount += 1
  }

  return {
    today: TODAY,
    listItems,
    actions,
    cases,
    jobs,
    dq,
    forecast,
    src,
    person,
    supplier,
    advisories,
    cockpit,
    delayedShipments,
    overdueCount,
  }
}

function runCollection(ctx) {
  const outputs = []
  const risky = num(ctx.src.totals.riskyReceivable)
  if (risky > 0) {
    outputs.push({
      id: 'collection-risk-total',
      title: 'Riskli alacak toplamı',
      reason: `Toplam riskli alacak ${money(risky)} ₺.`,
      recommendedAction: 'Riskli müşterileri öncelik sırasına göre arayın.',
      priority: 'P1',
    })
  }
  const candidates = ctx.listItems
    .filter((it) => {
      const rem = liNum(it.remainingAmount)
      const risk = String(it.currentRiskSeverity ?? 'NONE')
      return rem > 0 && (risk === 'HIGH' || risk === 'CRITICAL' || it.hasOverdueBalance)
    })
    .sort((a, b) => liNum(b.remainingAmount) - liNum(a.remainingAmount))
    .slice(0, TOP_LIMIT)
  for (const it of candidates) {
    outputs.push({
      id: `collection-call:${it.id}`,
      title: `Ara: ${it.customerDisplayName}`,
      reason: `${it.customerDisplayName} — açık bakiye ${money(liNum(it.remainingAmount))} ₺.`,
      recommendedAction: 'Müşteriyle tahsilat görüşmesi yapın.',
      priority: it.currentRiskSeverity === 'CRITICAL' ? 'P1' : 'P2',
    })
  }
  return outputs
}

function runShipment(ctx) {
  const outputs = []
  for (const it of ctx.listItems) {
    if (it.displayStatus === 'Teslim Edildi') continue
    if (it.plannedShipmentDate && it.plannedShipmentDate < TODAY) {
      outputs.push({
        id: `shipment-delayed:${it.id}`,
        title: `Geciken sevk: ${it.orderNumber}`,
        reason: `Planlanan sevk ${daysBetween(TODAY, it.plannedShipmentDate)} gün geçti.`,
        recommendedAction: 'Sevk ekibiyle görüşün.',
        priority: 'P1',
      })
    }
    if (it.displayStatus === 'Hazır') {
      outputs.push({
        id: `shipment-ready:${it.id}`,
        title: `Sevke hazır: ${it.orderNumber}`,
        reason: 'Sipariş "Hazır" durumda.',
        recommendedAction: 'Sevk planına ekleyin.',
        priority: 'P2',
      })
    }
  }
  return outputs
}

function runDataQuality(ctx) {
  const outputs = []
  for (const row of (ctx.dq.rows ?? []).slice(0, 50)) {
    const codes = new Set((row.issues ?? []).map((i) => i.code))
    if (codes.has('ZERO_COST')) {
      outputs.push({
        id: `dq-zero-cost:${row.orderLineId}`,
        title: 'Alış maliyeti eksik',
        reason: `${row.productTitle} kaleminde maliyet sıfır/eksik.`,
        recommendedAction: 'Alış maliyetini girin.',
        priority: 'P1',
      })
    }
    if (codes.has('UNKNOWN_SOURCE')) {
      outputs.push({
        id: `dq-unknown:${row.orderLineId}`,
        title: 'Satış kaynağı bilinmiyor',
        reason: `${row.productTitle} kaleminde kaynak Bilinmeyen.`,
        recommendedAction: 'Satış kaynağını tanımlayın.',
        priority: 'P2',
      })
    }
  }
  return outputs
}

function runSales(ctx) {
  const outputs = []
  for (const s of ctx.forecast.staffForecast ?? []) {
    if (s.status === 'HEDEF_ALTINDA') {
      outputs.push({
        id: `sales-under:${s.key}`,
        title: `Hedef altı: ${s.label}`,
        reason: `${s.label} hedefin %${round1(s.achievementPct)}'inde.`,
        recommendedAction: 'Birebir değerlendirme yapın.',
        priority: 'P3',
      })
    }
  }
  for (const src of ctx.forecast.sourceTrends ?? []) {
    if (isDepoKati(src.label)) continue
    if (src.trend === 'DOWN' && num(src.revenue30) > 0) {
      outputs.push({
        id: `sales-declining:${src.key}`,
        title: `Düşen kaynak: ${src.label}`,
        reason: `${src.label} 30 günlük hızı düşüyor.`,
        recommendedAction: 'Kampanya planlayın.',
        priority: 'P3',
      })
    }
  }
  return outputs
}

function runSupplier(ctx) {
  const outputs = []
  const rows = ctx.supplier.rows ?? []
  const top = [...rows].sort((a, b) => num(b.grossProfit) - num(a.grossProfit))[0]
  if (top && num(top.grossProfit) > 0) {
    outputs.push({
      id: `supplier-profit:${top.key}`,
      title: `En kârlı: ${top.label}`,
      reason: `${top.label} ${money(num(top.grossProfit))} ₺ brüt kâr.`,
      recommendedAction: 'İlişkiyi güçlendirin.',
      priority: 'P3',
    })
  }
  for (const a of ctx.advisories.advisories ?? []) {
    if (a.category === 'SUPPLIER') {
      outputs.push({
        id: `supplier-adv:${a.id}`,
        title: a.title,
        reason: a.reason,
        recommendedAction: a.recommendedAction,
        priority: a.severity === 'CRITICAL' ? 'P1' : 'P2',
      })
    }
  }
  return outputs
}

const RUNNERS = {
  COLLECTION_AGENT: runCollection,
  SHIPMENT_AGENT: runShipment,
  DATA_QUALITY_AGENT: runDataQuality,
  SALES_AGENT: runSales,
  SUPPLIER_AGENT: runSupplier,
}

function buildPriorities(ctx, results) {
  const out = []
  const rank = { P1: 1, P2: 2, P3: 3 }
  for (const [code, outputs] of Object.entries(results)) {
    if (code === 'EXECUTIVE_AGENT') continue
    for (const o of outputs) {
      out.push({
        id: `priority:${o.id}`,
        priority: o.priority,
        title: o.title,
        reason: o.reason,
        agentCode: code,
        category: code.replace('_AGENT', ''),
      })
    }
  }
  if (ctx.delayedShipments > 0) {
    out.push({
      id: 'priority:shipment-delayed-aggregate',
      priority: 'P1',
      title: 'Geciken sevkiyatlar',
      reason: `${ctx.delayedShipments} geciken sevk.`,
      agentCode: 'SHIPMENT_AGENT',
      category: 'SHIPMENT',
    })
  }
  out.sort((a, b) => rank[a.priority] - rank[b.priority] || (a.id < b.id ? -1 : 1))
  return out
}

function buildBriefing(ctx, priorities, results) {
  const p1 = priorities.filter((p) => p.priority === 'P1')
  const whatToDoToday = []
  if (p1.length > 0) whatToDoToday.push(`${p1.length} P1 konusunu önce ele alın`)
  if (ctx.delayedShipments > 0) whatToDoToday.push(`${ctx.delayedShipments} geciken sevki takip edin`)
  if ((results.COLLECTION_AGENT ?? []).length > 0) whatToDoToday.push('Tahsilat görüşmeleri planlayın')
  if (whatToDoToday.length === 0) whatToDoToday.push('Rutin operasyon kontrolü yapın')

  return {
    headline: `${TODAY} — ${p1.length} kritik konu, ${priorities.length} toplam öncelik`,
    paragraphs: [
      `Riskli alacak ${money(num(ctx.src.totals.riskyReceivable))} ₺; ${ctx.delayedShipments} geciken sevk.`,
      `Veri kalitesi skoru ${ctx.dq.totals.averageQualityScore}; ay sonu hedef %${round1(ctx.forecast.summary.targetAchievementPct)}.`,
      p1[0] ? `En acil: ${p1[0].title}` : 'Kritik P1 konusu yok.',
    ],
    whatToDoToday,
    criticalIssues: p1.slice(0, TOP_LIMIT),
  }
}

function countByCategory(actions, category) {
  return (actions.actions ?? []).filter((a) => a.category === category).length
}

function buildResponse(ctx, ranAt) {
  const results = {}
  for (const code of ALL_CODES) {
    if (code === 'EXECUTIVE_AGENT') continue
    results[code] = RUNNERS[code](ctx)
  }
  const p1Items = Object.entries(results)
    .flatMap(([code, outputs]) => outputs.filter((o) => o.priority === 'P1').map((o) => ({ ...o, agentCode: code })))
    .slice(0, TOP_LIMIT)
  results.EXECUTIVE_AGENT = p1Items.map((o) => ({
    id: o.id,
    title: o.title,
    reason: o.reason,
    recommendedAction: 'İlgili ajan çıktısını inceleyin.',
    priority: o.priority,
  }))
  if (results.EXECUTIVE_AGENT.length === 0) {
    results.EXECUTIVE_AGENT = [{
      id: 'executive-all-clear',
      title: 'Kritik konu yok',
      reason: 'P1 seviyesinde açık kritik konu yok.',
      recommendedAction: 'P2/P3 konuları gözden geçirin.',
      priority: 'P3',
    }]
  }

  const priorities = buildPriorities(ctx, results)
  const briefing = buildBriefing(ctx, priorities, results)
  const recommendations = Object.entries(results)
    .flatMap(([code, outputs]) =>
      outputs.map((o) => ({
        id: `rec:${o.id}`,
        agentCode: code,
        title: o.title,
        reason: o.reason,
        recommendedAction: o.recommendedAction,
        priority: o.priority,
      })),
    )
    .sort((a, b) => ({ P1: 1, P2: 2, P3: 3 }[a.priority] - { P1: 1, P2: 2, P3: 3 }[b.priority]))
    .slice(0, 15)

  const agents = ALL_CODES.map((code) => {
    const meta = AGENT_META[code]
    const outputs = results[code] ?? []
    const p1 = outputs.filter((o) => o.priority === 'P1').length
    const cat = code.replace('_AGENT', '')
    const lastRun = runStore.get(code) ?? ranAt ?? null
    return {
      id: meta.id,
      agentCode: code,
      agentName: AGENT_LABELS[code],
      description: `${AGENT_LABELS[code]} — deterministik kural motoru`,
      status: lastRun ? 'COMPLETED' : 'IDLE',
      priority: p1 > 0 ? 'P1' : meta.defaultPriority,
      lastRunAt: lastRun,
      nextRunAt: lastRun ? addHours(lastRun, 6) : null,
      generatedCases: code === 'EXECUTIVE_AGENT' ? (ctx.cases.cases ?? []).length : 0,
      generatedActions: code === 'EXECUTIVE_AGENT' ? (ctx.actions.actions ?? []).length : countByCategory(ctx.actions, cat),
      generatedJobs: code === 'EXECUTIVE_AGENT' ? (ctx.jobs.jobs ?? []).length : 0,
    }
  })

  const summary = {
    totalAgents: agents.length,
    activeAgents: agents.filter((a) => a.status === 'COMPLETED').length,
    p1Issues: priorities.filter((p) => p.priority === 'P1').length,
    p2Issues: priorities.filter((p) => p.priority === 'P2').length,
    p3Issues: priorities.filter((p) => p.priority === 'P3').length,
    generatedCases: (ctx.cases.cases ?? []).length,
    generatedActions: (ctx.actions.actions ?? []).length,
    generatedJobs: (ctx.jobs.jobs ?? []).length,
  }

  return {
    summary,
    agents,
    briefing,
    recommendations,
    priorities,
    generatedCases: summary.generatedCases,
    generatedActions: summary.generatedActions,
    generatedJobs: summary.generatedJobs,
    today: TODAY,
    generatedAt: new Date().toISOString(),
  }
}

export async function mockGetOperationsAgents() {
  const ctx = await loadContext()
  return buildResponse(ctx, null)
}

export async function mockGetOperationsAgentDetail(agentCode) {
  const ctx = await loadContext()
  const outputs = RUNNERS[agentCode]?.(ctx) ?? []
  if (agentCode === 'EXECUTIVE_AGENT') {
    const sub = {}
    for (const c of ALL_CODES) {
      if (c !== 'EXECUTIVE_AGENT') sub[c] = RUNNERS[c](ctx)
    }
    const p1 = Object.entries(sub)
      .flatMap(([code, outs]) => outs.filter((o) => o.priority === 'P1').map((o) => ({ ...o, agentCode: code })))
      .slice(0, TOP_LIMIT)
    outputs.push(...p1.map((o) => ({
      id: o.id,
      title: o.title,
      reason: o.reason,
      recommendedAction: 'İlgili ajan çıktısını inceleyin.',
      priority: o.priority,
    })))
  }
  const meta = AGENT_META[agentCode] ?? AGENT_META.EXECUTIVE_AGENT
  const lastRun = runStore.get(agentCode) ?? null
  return {
    id: meta.id,
    agentCode,
    agentName: AGENT_LABELS[agentCode] ?? agentCode,
    description: `${AGENT_LABELS[agentCode] ?? agentCode} — deterministik kural motoru`,
    status: lastRun ? 'COMPLETED' : 'IDLE',
    priority: outputs.some((o) => o.priority === 'P1') ? 'P1' : meta.defaultPriority,
    lastRunAt: lastRun,
    nextRunAt: lastRun ? addHours(lastRun, 6) : null,
    generatedCases: 0,
    generatedActions: outputs.length,
    generatedJobs: 0,
    summary: `${outputs.length} çıktı üretildi.`,
    outputs,
  }
}

export async function mockRunOperationsAgents(agentCode) {
  const ctx = await loadContext()
  const ranAt = new Date().toISOString()
  if (agentCode) {
    runStore.set(agentCode, ranAt)
  } else {
    for (const c of ALL_CODES) runStore.set(c, ranAt)
  }
  return buildResponse(ctx, ranAt)
}
