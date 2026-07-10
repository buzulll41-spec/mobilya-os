/**
 * Mock Kurumsal Gelecek Motoru — deterministik demo.
 */

const TODAY = '2026-05-14'

function metrics(health, coll, risk) {
  return {
    revenue: '4.200.000',
    profit: '1.180.000',
    cashFlow: '890.000',
    openBalance: '380.000',
    risk,
    shipmentLoad: 6,
    staffLoad: 4,
    supplierRisk: 32,
    collectionRate: coll,
    companyHealth: health,
  }
}

function scenario(id, name, verdict, health365, coll365, risk365) {
  return {
    scenarioId: id,
    scenarioName: name,
    verdict,
    verdictLabel: verdict === 'RECOMMENDED' ? 'Önerilir' : verdict === 'AVOID' ? 'Kaçınılmalı' : 'Nötr',
    basis: `${name} senaryosu simülasyonu.`,
    horizons: [
      { days: 30, metrics: metrics(health365 + 2, coll365 - 2, risk365 + 2) },
      { days: 90, metrics: metrics(health365 + 1, coll365 - 1, risk365 + 1) },
      { days: 180, metrics: metrics(health365, coll365, risk365) },
      { days: 365, metrics: metrics(health365, coll365, risk365) },
    ],
  }
}

/**
 * @returns {Promise<import('../contracts/v1/futureEngine.js').FutureEngineResponseDto>}
 */
export async function mockGetFutureEngine() {
  const scenarios = [
    scenario('BASELINE', 'Mevcut Gidişat', 'NEUTRAL', 58, 72, 62),
    scenario('AGGRESSIVE_GROWTH', 'Agresif Büyüme', 'NEUTRAL', 55, 68, 58),
    scenario('DEFENSIVE', 'Defansif', 'RECOMMENDED', 64, 78, 68),
    scenario('COLLECTION_FIRST', 'Tahsilat Öncelikli', 'RECOMMENDED', 66, 82, 70),
    scenario('EXPANSION', 'Genişleme (Yeni Mağaza)', 'NEUTRAL', 54, 65, 55),
    scenario('CRISIS', 'Kriz Senaryosu', 'AVOID', 38, 55, 42),
  ]

  const best = scenarios.find((s) => s.scenarioId === 'COLLECTION_FIRST')
  const worst = scenarios.find((s) => s.scenarioId === 'CRISIS')

  return {
    summary: {
      futureScore: 59.2,
      futureScoreBand: 'Orta',
      scenarioCount: 6,
      bestScenarioId: 'COLLECTION_FIRST',
      worstScenarioId: 'CRISIS',
      chairmanDecision: 'STABILIZE_FIRST',
      ceoDecision: 'FOCUS_COLLECTION',
      horizons: [30, 90, 180, 365],
      generatedAt: new Date().toISOString(),
    },
    futureScore: 59.2,
    scenarios,
    bestScenario: best,
    worstScenario: worst,
    managementBriefing: [
      'Kurumsal Gelecek Motoru baseline sağlık 57 ve gelecek skoru 59 ile çalıştı. Başkan ve CEO tahsilat önceliğinde hizalı.',
      'En iyi 365 günlük senaryo: Tahsilat Öncelikli (sağlık 66). En kötü: Kriz (sağlık 38). Kontrollü tahsilat disiplini önerilir.',
      'Giriş Kat büyüme momentumu %12; 90 günlük ufukta baseline ciro artışı devam eder.',
      'Tahsilat oranı bugün %62; Tahsilat Öncelikli senaryoda 365. gün %82 hedeflenir.',
      'Başkan notu: Büyümeden önce stabilizasyon. Tahsilat Öncelikli senaryosu Önerilir; kriz planı referans bandı olarak izlenmeli.',
    ],
    today: TODAY,
    generatedAt: new Date().toISOString(),
    meta: {
      depoKatiExcluded: true,
      virtualOnly: true,
      sources: ['profitability', 'forecast', 'chairman', 'ceoIntelligence', 'companySimulation'],
    },
  }
}
