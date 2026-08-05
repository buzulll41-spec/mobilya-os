const LIST_FILL = (prefix, n) =>
  Array.from({ length: n }, (_, i) => `${prefix} ${i + 1} — deterministik demo verisi.`)

/**
 * @returns {Promise<import('../contracts/v1/groupChairman.js').GroupChairmanResponseDto>}
 */
export async function mockGetGroupChairman() {
  return {
    summary: {
      groupChairmanScore: 64.8,
      groupChairmanScoreBand: 'Orta',
      groupDecision: 'CONTROLLED_GROWTH',
      groupHealth: 62.5,
      capitalStrategy: 'INVEST',
      companyCount: 5,
      capitalAllocationTotal: 100,
      generatedAt: new Date().toISOString(),
    },
    groupChairmanScore: 64.8,
    groupDecision: 'CONTROLLED_GROWTH',
    groupHealth: 62.5,
    capitalStrategy: 'INVEST',
    companyDecisions: [
      { companyId: 'EVTREND', companyName: 'EVTREND', decision: 'INVEST', reason: 'Portföy lideri — sermaye önceliği.' },
      { companyId: 'ATLAS_CONNECT', companyName: 'ATLAS CONNECT', decision: 'GROW', reason: 'Büyüme potansiyeli yüksek.' },
      { companyId: 'MONESKO', companyName: 'MONESKO', decision: 'MAINTAIN', reason: 'Kârlılık odaklı denge.' },
      { companyId: 'MOBILYA_OS', companyName: 'MOBILYA OS', decision: 'MAINTAIN', reason: 'ERP anker — mevcut konum korunmalı.' },
      { companyId: 'USTANET', companyName: 'USTANET', decision: 'REDUCE', reason: 'Düşük skor — sermaye azaltma.' },
    ],
    oneYearPlan: LIST_FILL('1Y plan', 10),
    threeYearPlan: LIST_FILL('3Y plan', 10),
    fiveYearPlan: LIST_FILL('5Y plan', 10),
    groupThreats: LIST_FILL('Grup tehdidi', 10),
    groupOpportunities: LIST_FILL('Grup fırsatı', 10),
    strategicActions: Array.from({ length: 10 }, (_, i) => ({
      priority: i + 1,
      action: `Stratejik aksiyon ${i + 1}`,
      horizon: i < 4 ? '1Y' : i < 7 ? '3Y' : '5Y',
    })),
    recommendedCapitalAllocation: [
      { companyId: 'EVTREND', companyName: 'EVTREND', percentage: 30 },
      { companyId: 'ATLAS_CONNECT', companyName: 'ATLAS CONNECT', percentage: 25 },
      { companyId: 'MONESKO', companyName: 'MONESKO', percentage: 20 },
      { companyId: 'MOBILYA_OS', companyName: 'MOBILYA OS', percentage: 15 },
      { companyId: 'USTANET', companyName: 'USTANET', percentage: 10 },
    ],
    chairmanBriefing: Array.from({ length: 5 }, (_, i) =>
      `Holding başkanı brifing paragraf ${i + 1} — deterministik demo metni.`,
    ),
    alignmentAnalysis: {
      ceoAlignment: 72,
      chairmanAlignment: 85,
      investorAlignment: 65,
      holdingAlignment: 95,
      overallAlignment: 79.3,
      summary: 'Grup kararı çoğunlukla uyumlu.',
    },
    today: '2026-05-14',
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true, sources: ['holdingCenter', 'investorIntelligence'] },
  }
}
