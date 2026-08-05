import { mockGetProfitabilityAnalytics } from './mockProfitabilityAnalyticsApi.js'
import { mockGetDataQuality } from './mockDataQualityApi.js'

/**
 * Mock Tahmin Motoru — Faz 5A kârlılık ve Faz 4 veri kalitesi mock motorlarını
 * yeniden kullanır; ay sonu projeksiyonlarını açıklanabilir formülle üretir
 * (current / elapsed × total). Depo Katı satış kaynağı olarak görünmez.
 */

const TODAY = '2026-05-15'
const ELAPSED = 15
const TOTAL = 31
const MONTH = { from: '2026-05-01', to: '2026-05-31' }
const PREV = { from: '2026-04-01', to: '2026-04-30' }

const num = (s) => {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
const money = (n) => (Math.round(n * 100) / 100).toFixed(2)
const round1 = (n) => Math.round(n * 10) / 10
const trendFromPct = (p) => (p >= 5 ? 'UP' : p <= -5 ? 'DOWN' : 'FLAT')

function project(current) {
  const daily = ELAPSED > 0 ? current / ELAPSED : 0
  const projected = ELAPSED > 0 ? (current / ELAPSED) * TOTAL : current
  return {
    current: money(current),
    projected: money(projected),
    dailyRate: money(daily),
    basis: `Mevcut ${money(current)} ₺ / ${ELAPSED} gün × ${TOTAL} gün`,
  }
}

export async function mockGetForecastEngine(query = {}) {
  const limited = query.limitedView === 'true' || query.limitedView === true || query.limitedView === '1'
  const salesPerson = query.salesPerson || undefined
  const salesSourceType = query.salesSourceType || undefined
  const baseQ = { salesPerson, salesSourceType }

  const [maySrc, aprSrc, mayPersons, aprPersons, dq] = await Promise.all([
    mockGetProfitabilityAnalytics({ ...baseQ, ...MONTH, groupBy: 'source' }),
    mockGetProfitabilityAnalytics({ ...baseQ, ...PREV, groupBy: 'source' }),
    mockGetProfitabilityAnalytics({ salesPerson, ...MONTH, groupBy: 'salesPerson' }),
    mockGetProfitabilityAnalytics({ salesPerson, ...PREV, groupBy: 'salesPerson' }),
    mockGetDataQuality({}),
  ])

  const t = maySrc.totals
  const salesForecast = project(num(t.revenue))
  const grossForecast = project(num(t.grossProfit))
  const realizedForecast = project(num(t.realizedProfit))
  const collectionForecast = project(num(t.collected))
  const openBalanceForecast = project(num(t.openBalance))
  const riskyForecast = project(num(t.riskyReceivable))

  // Satış kaynağı trendleri (Mayıs vs Nisan, kaynak bazında)
  const aprByKey = new Map(aprSrc.rows.map((r) => [r.key, num(r.revenue)]))
  const sourceTrends = maySrc.rows
    .map((r) => {
      const may = num(r.revenue)
      const apr = aprByKey.get(r.key) ?? 0
      const pct = apr > 0 ? round1(((may - apr) / apr) * 100) : may > 0 ? 100 : 0
      return {
        key: r.key,
        label: r.label,
        revenue7: money(may * 0.35),
        revenue30: money(may),
        revenue90: money(may + apr),
        pct7: pct,
        pct30: pct,
        trend: trendFromPct(pct),
      }
    })
    .sort((a, b) => num(b.revenue30) - num(a.revenue30))

  // Personel hedef tahmini (hedef = geçen ay)
  const aprPByKey = new Map(aprPersons.rows.map((r) => [r.key, num(r.revenue)]))
  const staffForecast = mayPersons.rows.map((r) => {
    const current = num(r.revenue)
    const target = aprPByKey.get(r.key) ?? 0
    const projected = (current / ELAPSED) * TOTAL
    const achievementPct = target > 0 ? round1((projected / target) * 100) : projected > 0 ? 100 : 0
    let status = 'HEDEFE_YAKIN'
    if (achievementPct < 90) status = 'HEDEF_ALTINDA'
    else if (achievementPct > 110) status = 'HEDEF_USTU'
    return {
      key: r.key,
      label: r.label,
      currentSales: money(current),
      target: money(target),
      projectedSales: money(projected),
      achievementPct,
      status,
    }
  })

  const prevRevenue = num(aprSrc.totals.revenue)
  const targetAchievementPct = prevRevenue > 0 ? round1((num(salesForecast.projected) / prevRevenue) * 100) : 0

  // Risk
  const projectedOpen = num(openBalanceForecast.projected)
  const projectedRisky = num(riskyForecast.projected)
  const shareOfOpenPct = projectedOpen > 0 ? round1((projectedRisky / projectedOpen) * 100) : 0
  const riskTrend = 'UP'

  // Sevk (demo pencereleri)
  const win = { last30: 18, last60: 33, last90: 45 }
  const dailyAvg30 = win.last30 / 30
  const dailyAvg90 = win.last90 / 90
  const expectedNextWeek = Math.round(dailyAvg30 * 7)
  const expectedNextMonth = Math.round(dailyAvg30 * 30)
  const shipmentTrend = trendFromPct(round1(((dailyAvg30 - dailyAvg90) / (dailyAvg90 || 1)) * 100))
  let intensity = 'LOW'
  if (expectedNextWeek > 7) intensity = 'HIGH'
  else if (expectedNextWeek >= 3) intensity = 'MEDIUM'

  // Veri kalitesi trendi (demo: önceki dönem biraz daha yüksek)
  const currentScore = dq.totals.averageQualityScore
  const previousScore = Math.min(100, round1(currentScore + 6))
  const qChange = round1(currentScore - previousScore)
  const qTrend = qChange >= 2 ? 'UP' : qChange <= -2 ? 'DOWN' : 'FLAT'

  const alerts = []
  if (prevRevenue > 0) alerts.push({ severity: targetAchievementPct >= 100 ? 'info' : 'warning', message: `Ay sonu ciro geçen ayın %${targetAchievementPct}'i seviyesinde bekleniyor.` })
  if (riskTrend === 'UP') alerts.push({ severity: 'warning', message: 'Açık bakiye büyüme trendinde.' })
  const declining = sourceTrends.find((s) => s.trend === 'DOWN' && num(s.revenue30) > 0)
  if (declining) alerts.push({ severity: 'warning', message: `${declining.label} satışları düşüyor.` })
  if (qTrend === 'DOWN') alerts.push({ severity: 'critical', message: `Veri kalite skoru son 30 günde ${Math.abs(qChange)} puan geriledi.` })
  if (shipmentTrend === 'UP' || intensity === 'HIGH') alerts.push({ severity: 'info', message: 'Sevk yoğunluğu artıyor.' })
  for (const s of staffForecast) {
    if (s.status === 'HEDEF_USTU') alerts.push({ severity: 'info', message: `${s.label} hedefini aşacak görünüyor (%${s.achievementPct}).` })
  }

  return {
    summary: {
      monthRevenueProjected: salesForecast.projected,
      monthGrossProfitProjected: grossForecast.projected,
      monthRealizedProfitProjected: realizedForecast.projected,
      monthCollectionProjected: collectionForecast.projected,
      monthOpenBalanceProjected: openBalanceForecast.projected,
      riskyReceivableProjected: riskyForecast.projected,
      elapsedDays: ELAPSED,
      totalDays: TOTAL,
      targetAchievementPct,
    },
    salesForecast,
    profitForecast: { gross: grossForecast, realized: realizedForecast },
    collectionForecast,
    openBalanceForecast,
    riskForecast: { expectedRiskyReceivable: riskyForecast.projected, shareOfOpenPct, trend: riskTrend },
    shipmentForecast: {
      expectedNextWeek,
      expectedNextMonth,
      dailyAvg30: round1(dailyAvg30),
      intensity,
      trend: shipmentTrend,
      basis: `Son 30 gün ${win.last30} sevk → günlük ${round1(dailyAvg30)}; 90 gün günlük ${round1(dailyAvg90)}`,
    },
    staffForecast: limited && salesPerson ? staffForecast.filter((s) => s.label === salesPerson) : staffForecast,
    sourceTrends,
    dataQualityTrend: { currentScore, previousScore, change: qChange, trend: qTrend },
    alerts: alerts.slice(0, 10),
    filters: {
      month: query.month ?? null,
      salesPerson: salesPerson ?? null,
      salesSourceType: salesSourceType ?? null,
      limitedView: limited,
    },
    currency: 'TRY',
    today: TODAY,
    generatedAt: new Date().toISOString(),
  }
}
