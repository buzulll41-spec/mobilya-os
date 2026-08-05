import { mockGetProfitabilityAnalytics } from './mockProfitabilityAnalyticsApi.js'
import { mockGetDataQuality } from './mockDataQualityApi.js'

/**
 * Mock Yönetici Kokpiti V2 — Faz 5A kârlılık ve Faz 4 veri kalitesi mock
 * motorlarını yeniden kullanır, üzerine bugünün operasyonu + kritik tabloları
 * sentezler. Depo Katı satış kaynağı olarak görünmez (kârlılık motoru garanti eder).
 */

const TODAY = '2026-05-14'
const num = (s) => {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
const money = (n) => (Math.round(n * 100) / 100).toFixed(2)

const DEMO_CRITICAL = [
  { riskLevel: 'HIGH', orderId: 'SO-0144', orderNumber: 'SO-0144', customer: 'Selin Aydın', totalAmount: '25000.00', openBalance: '25000.00', grossProfit: '8800.00', shipmentStatus: 'Eksik Var', paymentStatus: 'Gecikmiş', salesPerson: 'Elçin Korkmaz', problems: ['Açık bakiye yüksek', 'Tahsilat gecikmiş', 'Yüksek risk'] },
  { riskLevel: 'HIGH', orderId: 'SO-0148', orderNumber: 'SO-0148', customer: 'Hülya Şen', totalAmount: '9500.00', openBalance: '9500.00', grossProfit: '3300.00', shipmentStatus: 'Üretimde', paymentStatus: 'Gecikmiş', salesPerson: 'Elçin Korkmaz', problems: ['Açık bakiye yüksek', 'Sevk gecikmiş', 'Yüksek risk'] },
  { riskLevel: 'MEDIUM', orderId: 'SO-0143', orderNumber: 'SO-0143', customer: 'Kerem Yıldız', totalAmount: '18500.00', openBalance: '9500.00', grossProfit: '7500.00', shipmentStatus: 'Üretimde', paymentStatus: 'Kısmi', salesPerson: 'Murat Şahin', problems: ['Açık bakiye yüksek', 'Sevk gecikmiş'] },
  { riskLevel: 'MEDIUM', orderId: 'SO-0146', orderNumber: 'SO-0146', customer: 'Zeynep Arslan', totalAmount: '12000.00', openBalance: '6000.00', grossProfit: '4400.00', shipmentStatus: 'Geldi', paymentStatus: 'Kısmi', salesPerson: 'Murat Şahin', problems: ['Eksik ürün var'] },
]

const DEMO_PENDING = [
  { orderId: 'SO-0143', orderNumber: 'SO-0143', customer: 'Kerem Yıldız', plannedShipDate: '2026-05-09', dayDiff: -5, readiness: 'Üretimde', missingItems: 0, crew: 'Montaj Ekibi 1', riskLevel: 'MEDIUM' },
  { orderId: 'SO-0144', orderNumber: 'SO-0144', customer: 'Selin Aydın', plannedShipDate: '2026-05-12', dayDiff: -2, readiness: 'Eksik Var', missingItems: 1, crew: null, riskLevel: 'HIGH' },
  { orderId: 'SO-0146', orderNumber: 'SO-0146', customer: 'Zeynep Arslan', plannedShipDate: '2026-05-16', dayDiff: 2, readiness: 'Geldi', missingItems: 2, crew: 'Montaj Ekibi 2', riskLevel: 'MEDIUM' },
  { orderId: 'SO-0145', orderNumber: 'SO-0145', customer: 'Ahmet Koç', plannedShipDate: '2026-05-18', dayDiff: 4, readiness: 'Hazır', missingItems: 0, crew: 'Montaj Ekibi 1', riskLevel: 'NONE' },
]

export async function mockGetManagerCockpit(query = {}) {
  const limited = query.limitedView === 'true' || query.limitedView === true || query.limitedView === '1'
  const profitQuery = {
    salesPerson: query.salesPerson,
    salesSourceType: query.salesSourceType,
    riskLevel: query.riskLevel,
    paymentStatus: query.paymentStatus,
  }
  const [src, cat, dq] = await Promise.all([
    mockGetProfitabilityAnalytics({ ...profitQuery, groupBy: 'source' }),
    mockGetProfitabilityAnalytics({ ...profitQuery, groupBy: 'category' }),
    mockGetDataQuality({}),
  ])

  const sourceRows = src.rows
  const topSrc = src.breakdowns.source[0] ?? null
  const topPerson = src.breakdowns.salesPerson[0] ?? null
  const topCat = cat.rows[0] ?? null
  const riskiest = [...sourceRows].sort((a, b) => num(b.riskyReceivable) - num(a.riskyReceivable))[0] ?? null
  const lowestMargin = [...sourceRows].filter((r) => num(r.revenue) > 0).sort((a, b) => a.profitMarginPct - b.profitMarginPct)[0] ?? null
  const highestOpen = [...sourceRows].sort((a, b) => num(b.openBalance) - num(a.openBalance))[0] ?? null

  const catCount = (code) => dq.issueCategories?.find((c) => c.code === code)?.count ?? 0
  const criticalIssueCount = (dq.issueCategories ?? []).filter((c) => c.severity === 'critical').reduce((s, c) => s + c.count, 0)

  const delayedShipments = DEMO_PENDING.filter((p) => p.dayDiff != null && p.dayDiff < 0).length
  const criticalRiskOrders = DEMO_CRITICAL.filter((c) => c.riskLevel === 'HIGH' || c.riskLevel === 'CRITICAL').length

  const alerts = []
  if (topSrc && num(topSrc.grossProfit) > 0) alerts.push({ severity: 'info', message: `Bu ay ${topSrc.label} en yüksek brüt kârı üretiyor.` })
  if (highestOpen && num(highestOpen.openBalance) > 0) alerts.push({ severity: 'warning', message: `${highestOpen.label} satışlarında açık bakiye yüksek (${money(num(highestOpen.openBalance))} ₺).` })
  if (dq.totals.missingCostCount > 0) alerts.push({ severity: 'critical', message: `${dq.totals.missingCostCount} kayıtta alış maliyeti eksik, kâr raporu bozulabilir.` })
  if (delayedShipments > 0) alerts.push({ severity: 'warning', message: `Bugün ${delayedShipments} sevk gecikmiş görünüyor.` })
  if (dq.totals.averageQualityScore < 85) alerts.push({ severity: 'critical', message: `Veri kalite skoru ${dq.totals.averageQualityScore}, 85'in altına düştü.` })
  if (dq.totals.unknownCount > 0) alerts.push({ severity: 'warning', message: `${dq.totals.unknownCount} satış kaleminde kaynak Bilinmeyen olarak işaretli.` })
  if (criticalRiskOrders > 0) alerts.push({ severity: 'critical', message: `${criticalRiskOrders} siparişte yüksek/kritik risk var, bugün müdahale gerekebilir.` })

  const criticalOrders = DEMO_CRITICAL.map((c) => ({
    ...c,
    grossProfit: limited ? '' : c.grossProfit,
    salesPerson: limited ? null : c.salesPerson,
  })).slice(0, 20)

  return {
    summary: {
      todaySales: money(22000 + 13000),
      monthRevenue: src.totals.revenue,
      monthGrossProfit: src.totals.grossProfit,
      avgProfitMarginPct: src.totals.profitMarginPct,
      realizedProfit: src.totals.realizedProfit,
      pendingProfit: src.totals.pendingProfit,
      riskyReceivable: src.totals.riskyReceivable,
      dataQualityScore: dq.totals.averageQualityScore,
    },
    todayOperations: {
      ordersToday: 1,
      collectionToday: money(35000),
      readyToShipToday: DEMO_PENDING.filter((p) => p.readiness === 'Hazır').length,
      delayedShipments,
      serviceTicketsToday: 1,
      criticalRiskOrders,
    },
    profitabilityHighlights: {
      topProfitSource: topSrc ? { key: topSrc.key, label: topSrc.label, value: topSrc.grossProfit, metric: 'grossProfit' } : null,
      topProfitSalesPerson: limited || !topPerson ? null : { key: topPerson.key, label: topPerson.label, value: topPerson.grossProfit, metric: 'grossProfit' },
      topProfitCategory: topCat ? { key: topCat.key, label: topCat.label, value: topCat.grossProfit, metric: 'grossProfit' } : null,
      riskiestSource: riskiest ? { key: riskiest.key, label: riskiest.label, value: riskiest.riskyReceivable, metric: 'riskyReceivable' } : null,
      lowestMarginSource: lowestMargin ? { key: lowestMargin.key, label: lowestMargin.label, value: String(lowestMargin.profitMarginPct), metric: 'profitMarginPct' } : null,
      highestOpenBalanceSource: highestOpen ? { key: highestOpen.key, label: highestOpen.label, value: highestOpen.openBalance, metric: 'openBalance' } : null,
    },
    dataQualityHighlights: {
      unknownCount: dq.totals.unknownCount,
      missingCostCount: dq.totals.missingCostCount,
      missingDisplayFloorCount: catCount('MISSING_DISPLAY_FLOOR'),
      missingExternalSupplyCount: catCount('MISSING_EXTERNAL_SUPPLY_TYPE'),
      criticalIssueCount,
      averageQualityScore: dq.totals.averageQualityScore,
    },
    criticalOrders,
    pendingShipments: DEMO_PENDING.slice(0, 20),
    managerAlerts: alerts.slice(0, 10),
    filters: {
      from: query.from ?? null,
      to: query.to ?? null,
      month: query.month ?? null,
      year: query.year ?? null,
      salesPerson: query.salesPerson ?? null,
      riskLevel: query.riskLevel ?? null,
      paymentStatus: query.paymentStatus ?? null,
      shipmentStatus: query.shipmentStatus ?? null,
      salesSourceType: query.salesSourceType ?? null,
    },
    currency: 'TRY',
    today: TODAY,
    generatedAt: new Date().toISOString(),
  }
}
