/**
 * Mock Stratejik Karar Merkezi — deterministik demo.
 * Depo Katı satış kaynağı olarak görünmez.
 */

export async function mockGetStrategicIntelligence() {
  return {
    summary: {
      companyHealthScore: 62.5,
      companyHealthBand: 'Orta',
      topGrowthLabel: 'Giriş Kat',
      topRiskLabel: 'Tahsilat Riski',
      recommendationCount: 6,
      analysisMonth: '2026-05',
      generatedAt: new Date().toISOString(),
    },
    growthAnalysis: {
      topGrowthSource: { key: 'GROUND_FLOOR', label: 'Giriş Kat', currentRevenue: '450000.00', previousRevenue: '380000.00', changePct: 18.4, trend: 'UP' },
      topDecliningSource: { key: 'CATALOG', label: 'Dış Tedarik', currentRevenue: '120000.00', previousRevenue: '135000.00', changePct: -11.1, trend: 'DOWN' },
      topGrowthCategory: null,
      topDecliningCategory: null,
      sourceTrends: [],
      categoryTrends: [],
    },
    profitabilityAnalysis: {
      monthRevenue: '2156400.00',
      monthGrossProfit: '680000.00',
      profitMarginPct: 31.5,
      realizedProfit: '420000.00',
      pendingProfit: '260000.00',
      riskyReceivable: '169000.00',
      mostProfitableSource: 'Giriş Kat',
      mostProfitableSalesPerson: 'Ayşe',
    },
    supplierAnalysis: {
      bestSuppliers: [{ key: 's1', label: 'Marka A', revenue: '800000.00', grossProfit: '280000.00', openBalance: '50000.00', profitMarginPct: 35, score: 78, riskLevel: 'LOW' }],
      riskySuppliers: [],
      supplierScoreboard: [],
    },
    salesPersonAnalysis: {
      topSalesPeople: [{ key: 'p1', label: 'Ayşe', revenue: '900000.00', grossProfit: '320000.00', collected: '600000.00', openBalance: '80000.00', achievementPct: 112, score: 85, status: 'HEDEF_USTU' }],
      needsImprovement: [],
      salesScoreboard: [],
    },
    riskForecast: {
      horizonDays: 90,
      items: [
        { id: 'rf1', riskTitle: 'Tahsilat Riski', horizonDays: 90, severity: 'CRITICAL', description: '169.000 ₺ riskli alacak', mitigation: 'Tahsilat planı' },
        { id: 'rf2', riskTitle: 'Veri Kalitesi Riski', horizonDays: 90, severity: 'WARNING', description: 'Skor 76', mitigation: 'Maliyet düzeltme' },
      ],
    },
    companyHealth: {
      score: 62.5,
      band: 'Orta',
      breakdown: [
        { id: 'profitability', label: 'Kârlılık', score: 70, weight: 20, weighted: 14 },
        { id: 'collection', label: 'Tahsilat', score: 55, weight: 20, weighted: 11 },
      ],
      trend: 'FLAT',
      trendLabel: 'Stabil',
    },
    boardBriefing: {
      headline: 'Şirket sağlık endeksi 62.5 (Orta) — 2026-05 stratejik görünüm',
      biggestOpportunity: 'Giriş Kat satışlarının artırılması (%18 büyüme).',
      biggestRisk: 'Tahsilat Riski',
      recommendedActions: ['Giriş Kat yatırımını artır', 'Tahsilat stratejisi güncelle'],
      nextQuarterFocus: 'Giriş Kat büyümesini ölçeklendirmek ve tahsilat disiplinini güçlendirmek.',
    },
    recommendations: [
      { id: 'r1', category: 'GROWTH', title: 'Giriş Kat yatırımını artır', reason: '%18 büyüme', priority: 'HIGH' },
      { id: 'r2', category: 'FINANCE', title: 'Tahsilat stratejisi güncelle', reason: '169.000 ₺ riskli', priority: 'HIGH' },
    ],
    today: '2026-05-14',
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true },
  }
}
