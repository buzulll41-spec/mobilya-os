/**
 * @returns {Promise<import('../contracts/v1/enterpriseCommandCenter.js').EnterpriseCommandCenterResponseDto>}
 */
export async function mockGetEnterpriseCommandCenter() {
  return {
    companyHealthScore: 62.4,
    commandDecision: 'FOCUS_COLLECTION',
    todayActions: [
      { id: 'brain-0', priority: 'P1', source: 'Business Brain', action: 'Tahsilat görüşmelerini hızlandır' },
      { id: 'goal-collection-rate', priority: 'P1', source: 'Goal Engine', action: 'Tahsilat oranını +%12 artır' },
      { id: 'opt-1', priority: 'P1', source: 'Optimization Engine', action: 'COLLECTION_FIRST: 100→120' },
      { id: 'brain-1', priority: 'P1', source: 'Business Brain', action: 'Riskli alacakları izle' },
      { id: 'goal-open-balance', priority: 'P1', source: 'Goal Engine', action: 'Açık bakiyeyi -%15 azalt' },
    ],
    criticalRisks: [
      { id: 'advisor-1', severity: 'CRITICAL', source: 'Operations Advisor', title: 'Yüksek açık bakiye baskısı', recommendation: 'Tahsilat ekibini önceliklendir.' },
      { id: 'ceo-1', severity: 'WARNING', source: 'CEO Intelligence', title: 'Marj baskısı', recommendation: 'Maliyet yapısını gözden geçir.' },
      { id: 'goal-risk-1', severity: 'HIGH', source: 'Goal Engine', title: 'Kârlılığı +%6 artır', recommendation: 'Marj hedeflerini gözden geçir.' },
    ],
    opportunities: [
      { id: 'strategic-1', source: 'Strategic Intelligence', title: 'Mağaza içi satış momentumu', impact: 8, recommendation: 'Vitrin ürünlerini güçlendir.' },
      { id: 'goal-opp-1', source: 'Goal Engine', title: 'Veri kalitesi momentumu yüksek', impact: 28, recommendation: 'DATA_QUALITY_FIRST ile sinerji.' },
      { id: 'chairman-opp-1', source: 'Chairman', title: 'Kontrollü büyüme penceresi', impact: 6, recommendation: 'Satış ekibi kapasitesini planla.' },
    ],
    goalStatus: { total: 9, atRisk: 2, achieved: 0 },
    learningSummary: {
      topSuccessful: [
        { strategy: 'COLLECTION_FIRST', successRate: 78, impactScore: 72 },
        { strategy: 'CONTROLLED_GROWTH', successRate: 65, impactScore: 58 },
        { strategy: 'COST_REDUCTION', successRate: 60, impactScore: 55 },
        { strategy: 'SUPPLIER_FOCUS', successRate: 55, impactScore: 50 },
        { strategy: 'CASH_PROTECTION', successRate: 52, impactScore: 48 },
      ],
      bottomFailed: [
        { strategy: 'AGGRESSIVE_GROWTH', successRate: 32, impactScore: 28 },
        { strategy: 'CASH_PROTECTION', successRate: 52, impactScore: 48 },
        { strategy: 'SUPPLIER_FOCUS', successRate: 55, impactScore: 50 },
        { strategy: 'COST_REDUCTION', successRate: 60, impactScore: 55 },
        { strategy: 'CONTROLLED_GROWTH', successRate: 65, impactScore: 58 },
      ],
    },
    optimizationSummary: {
      strategyChanges: 3,
      agentChanges: 2,
      topStrategyChange: 'COLLECTION_FIRST: 100→120',
      topAgentChange: 'COLLECTION_AGENT: 100→115',
    },
    operationsSummary: {
      openCases: 4,
      criticalCases: 2,
      pendingTasks: 12,
      automationQueue: 3,
    },
    managementBriefing: [
      'CEO motoru tahsilat odaklı karar üretti; nakit disiplini öncelikli.',
      'Başkan mevcut stratejik yönün korunmasını onayladı.',
      'İşletme beyni operasyon ve finans skorlarını dengeli izliyor.',
      'Tahsilat hedefleri plana göre ilerliyor; kârlılık hedefi geride.',
      'Kurumsal kumanda merkezi tüm yönetim katmanlarını sentezledi.',
    ],
    today: '2026-05-14',
    generatedAt: new Date().toISOString(),
    currency: 'TRY',
    meta: { depoKatiExcluded: true },
  }
}
