import { mockGetProfitabilityAnalytics } from './mockProfitabilityAnalyticsApi.js'
import { mockGetDataQuality } from './mockDataQualityApi.js'
import { mockGetForecastEngine } from './mockForecastEngineApi.js'

/**
 * Mock AI Operasyon Danışmanı — backend kural motorunun (getOperationsAdvisor)
 * birebir aynası. Faz 4/5A/6 mock motorlarını yeniden kullanır; tavsiyeleri
 * deterministik kurallarla üretir. Depo Katı satış kaynağı olarak görünmez.
 */

const TODAY = '2026-05-14'
const MONTH = { from: '2026-05-01', to: '2026-05-31' }
const PREV = { from: '2026-04-01', to: '2026-04-30' }

const ADVISORIES_LIMIT = 20
const PROFIT_DROP_PCT = 15
const RISKY_SHARE_CRITICAL = 25
const PENDING_PROFIT_SHARE = 40
const SUPPLIER_OPEN_SHARE = 30
const OVERDUE_WARN_COUNT = 3
const SEVERITY_RANK = { CRITICAL: 3, WARNING: 2, INFO: 1 }
const LIMITED_CATEGORIES = new Set(['SALES', 'SHIPMENT', 'DATA_QUALITY'])

// Demo operasyon göstergeleri (cockpit mock'u ile uyumlu)
const DEMO_DELAYED_SHIPMENTS = 2
const DEMO_OVERDUE_COUNT = 3

const num = (s) => {
  const n = Number.parseFloat(s)
  return Number.isFinite(n) ? n : 0
}
const money = (n) => (Math.round(n * 100) / 100).toFixed(2)
const round1 = (n) => Math.round(n * 10) / 10

export async function mockGetOperationsAdvisor(query = {}) {
  const limited = query.limitedView === 'true' || query.limitedView === true || query.limitedView === '1'
  const salesPerson = query.salesPerson || undefined
  const createdAt = new Date().toISOString()

  const [maySrc, aprSrc, supplierRes, dq, forecast] = await Promise.all([
    mockGetProfitabilityAnalytics({ salesPerson, ...MONTH, groupBy: 'source' }),
    mockGetProfitabilityAnalytics({ salesPerson, ...PREV, groupBy: 'source' }),
    mockGetProfitabilityAnalytics({ salesPerson, ...MONTH, groupBy: 'supplier' }),
    mockGetDataQuality({}),
    mockGetForecastEngine({ salesPerson }),
  ])

  const out = []
  const push = (a) => out.push({ ...a, createdAt })

  // ── KÂRLILIK ──
  const prevByKey = new Map(aprSrc.rows.map((r) => [r.key, num(r.grossProfit)]))
  for (const r of maySrc.rows) {
    const cur = num(r.grossProfit)
    const prev = prevByKey.get(r.key) ?? 0
    if (prev > 0) {
      const changePct = round1(((cur - prev) / prev) * 100)
      if (changePct <= -PROFIT_DROP_PCT) {
        push({
          id: `profit-drop:${r.key}`,
          severity: 'WARNING',
          category: 'PROFITABILITY',
          title: `${r.label} kârlılığı düşüyor`,
          reason: `${r.label} kaynağının brüt kârı geçen aya göre %${Math.abs(changePct)} azaldı (${money(prev)} ₺ → ${money(cur)} ₺).`,
          impact: 'Bu kaynağın toplam kâra katkısı geriliyor; sürerse ay sonu kâr hedefi tutmayabilir.',
          recommendation: 'Bu kaynaktaki fiyatlama, maliyet ve satış adedini gözden geçirin; kampanya veya stok kararı alın.',
          evidence: { source: r.label, grossProfitLastMonth: prev, grossProfitCurrentMonth: cur, changePercent: changePct },
        })
      }
    }
  }

  const lowestMargin = [...maySrc.rows].filter((r) => num(r.revenue) > 0).sort((a, b) => a.profitMarginPct - b.profitMarginPct)[0]
  if (lowestMargin) {
    push({
      id: `low-margin:${lowestMargin.key}`,
      severity: 'INFO',
      category: 'PROFITABILITY',
      title: `${lowestMargin.label} en düşük kâr marjına sahip`,
      reason: `${lowestMargin.label} kaynağının kâr marjı %${round1(lowestMargin.profitMarginPct)} ile en düşük seviyede.`,
      impact: 'Düşük marj, ciro yüksek olsa bile kâra katkının sınırlı kalmasına yol açar.',
      recommendation: 'Bu kaynağın alış maliyetlerini ve iskonto politikasını inceleyin.',
      evidence: { source: lowestMargin.label, profitMarginPct: round1(lowestMargin.profitMarginPct), revenue: num(lowestMargin.revenue), grossProfit: num(lowestMargin.grossProfit) },
    })
  }

  const totalGross = num(maySrc.totals.grossProfit)
  const pendingProfit = num(maySrc.totals.pendingProfit)
  if (totalGross > 0 && pendingProfit > 0) {
    const sharePct = round1((pendingProfit / totalGross) * 100)
    if (sharePct >= PENDING_PROFIT_SHARE) {
      push({
        id: 'pending-profit',
        severity: 'WARNING',
        category: 'PROFITABILITY',
        title: 'Tahsilata bağlı kâr birikiyor',
        reason: `Bu ayki brüt kârın %${sharePct}'i (${money(pendingProfit)} ₺) henüz tahsil edilmedi.`,
        impact: 'Kâr kâğıt üzerinde görünüyor ama nakde dönmedi; tahsilat gecikirse kâr riske girer.',
        recommendation: 'Açık bakiyesi yüksek siparişlerde tahsilat planı uygulayın.',
        evidence: { pendingProfit, totalGrossProfit: totalGross, sharePercent: sharePct },
      })
    }
  }

  // ── TAHSİLAT ──
  const totalOpen = num(maySrc.totals.openBalance)
  const totalRisky = num(maySrc.totals.riskyReceivable)
  if (totalOpen > 0) {
    const riskyShare = round1((totalRisky / totalOpen) * 100)
    if (riskyShare >= RISKY_SHARE_CRITICAL) {
      push({
        id: 'risky-receivable',
        severity: 'CRITICAL',
        category: 'COLLECTION',
        title: 'Riskli alacak oranı kritik',
        reason: `Riskli alacak (${money(totalRisky)} ₺) toplam açık bakiyenin %${riskyShare}'ini oluşturuyor.`,
        impact: 'Tahsilat tahsil edilemezse doğrudan kâr ve nakit akışı zarar görür.',
        recommendation: 'Yüksek riskli siparişlerde teminat/peşinat isteyin, tahsilatı hızlandırın.',
        evidence: { riskyReceivable: totalRisky, openBalance: totalOpen, sharePercent: riskyShare },
      })
    }
  }

  if (forecast.riskForecast.trend === 'UP') {
    push({
      id: 'open-balance-trend',
      severity: 'WARNING',
      category: 'COLLECTION',
      title: 'Açık bakiye büyüme trendinde',
      reason: 'Son 7 günün açık bakiye hızı, 30 günlük ortalamanın üzerinde.',
      impact: 'Tahsil edilmemiş tutar büyüyor; nakit akışı baskı altına girebilir.',
      recommendation: 'Yeni satışlarda peşinat oranını ve vade politikasını gözden geçirin.',
      evidence: { trend: forecast.riskForecast.trend, projectedOpenBalance: num(forecast.openBalanceForecast.projected) },
    })
  }

  if (DEMO_OVERDUE_COUNT >= OVERDUE_WARN_COUNT) {
    push({
      id: 'overdue-count',
      severity: 'WARNING',
      category: 'COLLECTION',
      title: 'Gecikmiş tahsilat sayısı yüksek',
      reason: `${DEMO_OVERDUE_COUNT} siparişte tahsilat vadesi geçmiş durumda.`,
      impact: 'Gecikmeler büyüdükçe tahsil edilememe riski artar.',
      recommendation: 'Gecikmiş siparişler için müşteri araması ve ödeme planı başlatın.',
      evidence: { overdueCount: DEMO_OVERDUE_COUNT },
    })
  }

  // ── SEVK ──
  if (DEMO_DELAYED_SHIPMENTS > 10) {
    push({
      id: 'shipment-delay',
      severity: 'CRITICAL',
      category: 'SHIPMENT',
      title: 'Sevk gecikmeleri kritik seviyede',
      reason: `${DEMO_DELAYED_SHIPMENTS} sipariş planlanan sevk tarihini geçti ve hâlâ teslim edilmedi.`,
      impact: 'Müşteri memnuniyeti ve teslim taahhütleri ciddi risk altında.',
      recommendation: 'Sevk planını acilen önceliklendirin, montaj ekibi ve eksik ürünleri kontrol edin.',
      evidence: { delayedShipments: DEMO_DELAYED_SHIPMENTS },
    })
  } else if (DEMO_DELAYED_SHIPMENTS > 5) {
    push({
      id: 'shipment-delay',
      severity: 'WARNING',
      category: 'SHIPMENT',
      title: 'Sevk gecikmeleri artıyor',
      reason: `${DEMO_DELAYED_SHIPMENTS} sipariş planlanan sevk tarihini geçti.`,
      impact: 'Gecikmeler birikirse teslim taahhütleri aksayabilir.',
      recommendation: 'Geciken sevkleri gözden geçirip planlamayı güncelleyin.',
      evidence: { delayedShipments: DEMO_DELAYED_SHIPMENTS },
    })
  }
  if (forecast.shipmentForecast.intensity === 'HIGH') {
    push({
      id: 'shipment-intensity',
      severity: 'INFO',
      category: 'SHIPMENT',
      title: 'Sevk yoğunluğu yükseliyor',
      reason: `Önümüzdeki hafta ~${forecast.shipmentForecast.expectedNextWeek} sevk bekleniyor (yoğunluk: yüksek).`,
      impact: 'Ekip kapasitesi planlanmazsa sevkler sıkışabilir.',
      recommendation: 'Montaj/lojistik kapasitesini önceden planlayın.',
      evidence: { expectedNextWeek: forecast.shipmentForecast.expectedNextWeek, intensity: forecast.shipmentForecast.intensity },
    })
  }

  // ── VERİ KALİTESİ ──
  const score = dq.totals.averageQualityScore
  if (score < 80) {
    push({
      id: 'quality-score',
      severity: 'CRITICAL',
      category: 'DATA_QUALITY',
      title: 'Veri kalite skoru kritik',
      reason: `Ortalama veri kalite skoru ${score} (80 eşiğinin altında).`,
      impact: 'Eksik/hatalı snapshot alanları kâr ve kaynak raporlarını bozar.',
      recommendation: 'Veri Kalitesi Merkezi’ndeki problemli kayıtları düzeltin.',
      evidence: { averageQualityScore: score, threshold: 80 },
    })
  } else if (score < 90) {
    push({
      id: 'quality-score',
      severity: 'WARNING',
      category: 'DATA_QUALITY',
      title: 'Veri kalite skoru düşüyor',
      reason: `Ortalama veri kalite skoru ${score} (90 eşiğinin altında).`,
      impact: 'Veri kalitesi gerilerse raporların güvenilirliği azalır.',
      recommendation: 'Eksik kaynak/maliyet alanlarını tamamlayın.',
      evidence: { averageQualityScore: score, threshold: 90 },
    })
  }
  if (dq.totals.unknownCount > 0) {
    push({
      id: 'unknown-source',
      severity: 'WARNING',
      category: 'DATA_QUALITY',
      title: 'Bilinmeyen kaynaklı kayıtlar var',
      reason: `${dq.totals.unknownCount} satış kaleminde satış kaynağı Bilinmeyen olarak işaretli.`,
      impact: 'Bu kalemler satış kaynağı analitiğine doğru yansımaz.',
      recommendation: 'İlgili ürün kartlarının satış kaynağını tanımlayın.',
      evidence: { unknownCount: dq.totals.unknownCount },
    })
  }
  if (dq.totals.missingCostCount > 0) {
    push({
      id: 'zero-cost',
      severity: 'CRITICAL',
      category: 'DATA_QUALITY',
      title: 'Alış maliyeti eksik kayıtlar var',
      reason: `${dq.totals.missingCostCount} satış kaleminde alış maliyeti (soldUnitCost) sıfır veya eksik.`,
      impact: 'Maliyet eksik kalemler kâr hesabını şişirir; raporlar yanıltıcı olur.',
      recommendation: 'Eksik maliyetli kalemleri ürün kartından düzeltin.',
      evidence: { missingCostCount: dq.totals.missingCostCount },
    })
  }

  // ── SATIŞ ──
  const target = forecast.summary.targetAchievementPct
  if (target > 0 && target < 90) {
    push({
      id: 'sales-target-low',
      severity: 'WARNING',
      category: 'SALES',
      title: 'Ay sonu satış hedefin altında',
      reason: `Bu gidişle ay sonu ciro, geçen ayın %${round1(target)}'i seviyesinde bekleniyor.`,
      impact: 'Hedefin altında kalınırsa aylık kâr beklentisi tutmaz.',
      recommendation: 'Satış ekibiyle ay sonu kapanış planı yapın, bekleyen teklifleri hızlandırın.',
      evidence: { targetAchievementPct: round1(target), threshold: 90 },
    })
  } else if (target > 110) {
    push({
      id: 'sales-target-high',
      severity: 'INFO',
      category: 'SALES',
      title: 'Ay sonu satış hedefin üzerinde',
      reason: `Bu gidişle ay sonu ciro, geçen ayın %${round1(target)}'i seviyesinde bekleniyor.`,
      impact: 'Güçlü satış temposu; stok ve sevk kapasitesi buna hazır olmalı.',
      recommendation: 'Stok ve sevk planını artan taleple uyumlayın.',
      evidence: { targetAchievementPct: round1(target), threshold: 110 },
    })
  }
  const decliningSource = forecast.sourceTrends.find((s) => s.trend === 'DOWN' && num(s.revenue30) > 0)
  if (decliningSource) {
    push({
      id: `sales-trend-down:${decliningSource.key}`,
      severity: 'WARNING',
      category: 'SALES',
      title: `${decliningSource.label} satış trendi düşüyor`,
      reason: `${decliningSource.label} kaynağının 30 günlük satış hızı %${decliningSource.pct30} değişimle geriliyor.`,
      impact: 'Bu kaynaktan gelen ciro azalıyor; toplam satışı aşağı çekebilir.',
      recommendation: 'Bu kaynağa yönelik kampanya veya sergi/teşhir düzenlemesi değerlendirin.',
      evidence: { source: decliningSource.label, pct30: decliningSource.pct30, revenue30: num(decliningSource.revenue30) },
    })
  }

  // ── TEDARİKÇİ ──
  const supplierRows = supplierRes.rows
  const supplierOpenTotal = supplierRows.reduce((s, r) => s + num(r.openBalance), 0)
  if (supplierOpenTotal > 0) {
    const concentrated = supplierRows
      .map((r) => ({ row: r, sharePct: round1((num(r.openBalance) / supplierOpenTotal) * 100) }))
      .filter((x) => x.sharePct >= SUPPLIER_OPEN_SHARE)
      .sort((a, b) => b.sharePct - a.sharePct)[0]
    if (concentrated) {
      push({
        id: `supplier-concentration:${concentrated.row.key}`,
        severity: 'WARNING',
        category: 'SUPPLIER',
        title: `${concentrated.row.label} açık bakiyede yoğunlaşma`,
        reason: `${concentrated.row.label} tedarikçisi toplam açık bakiyenin %${concentrated.sharePct}'ini taşıyor.`,
        impact: 'Tek tedarikçiye bağımlılık tahsilat/tedarik riskini yoğunlaştırır.',
        recommendation: 'Bu tedarikçiye bağlı siparişlerin tahsilat ve tedarik durumunu yakından izleyin.',
        evidence: { supplier: concentrated.row.label, openBalance: num(concentrated.row.openBalance), totalSupplierOpen: round1(supplierOpenTotal), sharePercent: concentrated.sharePct },
      })
    }
  }
  const topProfitSupplier = [...supplierRows].sort((a, b) => num(b.grossProfit) - num(a.grossProfit))[0]
  if (topProfitSupplier && num(topProfitSupplier.grossProfit) > 0) {
    push({
      id: `supplier-top-profit:${topProfitSupplier.key}`,
      severity: 'INFO',
      category: 'SUPPLIER',
      title: `${topProfitSupplier.label} en yüksek kârı üretiyor`,
      reason: `${topProfitSupplier.label} bu ay ${money(num(topProfitSupplier.grossProfit))} ₺ brüt kâr ile başı çekiyor.`,
      impact: 'Bu tedarikçi kâr açısından stratejik öneme sahip.',
      recommendation: 'İlişkiyi ve stok devamlılığını koruyun; vade/iskonto avantajlarını değerlendirin.',
      evidence: { supplier: topProfitSupplier.label, grossProfit: num(topProfitSupplier.grossProfit) },
    })
  }

  // ── Filtre + sıralama + limit ──
  const fCategory = (query.category || '').trim().toUpperCase() || undefined
  const fSeverity = (query.severity || '').trim().toUpperCase() || undefined
  const fq = (query.q || '').trim().toLocaleLowerCase('tr') || undefined

  let filtered = out
  if (limited) filtered = filtered.filter((a) => LIMITED_CATEGORIES.has(a.category))
  if (fCategory) filtered = filtered.filter((a) => a.category === fCategory)
  if (fSeverity) filtered = filtered.filter((a) => a.severity === fSeverity)
  if (fq) filtered = filtered.filter((a) => `${a.title} ${a.reason} ${a.recommendation}`.toLocaleLowerCase('tr').includes(fq))

  filtered.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity])
  const advisories = filtered.slice(0, ADVISORIES_LIMIT)

  const criticalCount = advisories.filter((a) => a.severity === 'CRITICAL').length
  const warningCount = advisories.filter((a) => a.severity === 'WARNING').length
  const infoCount = advisories.filter((a) => a.severity === 'INFO').length
  const top = advisories[0] ?? null

  return {
    summary: {
      totalAdvisories: advisories.length,
      criticalCount,
      warningCount,
      infoCount,
      topIssue: top ? { category: top.category, title: top.title, severity: top.severity } : null,
    },
    advisories,
    filters: {
      category: fCategory ?? null,
      severity: fSeverity ?? null,
      date: (query.date || '').trim() || null,
      q: fq ?? null,
      salesPerson: salesPerson ?? null,
      limitedView: limited,
    },
    currency: 'TRY',
    today: TODAY,
    generatedAt: createdAt,
  }
}
