/**
 * @returns {Promise<import('../contracts/v1/performanceFeedback.js').PerformanceFeedbackResponseDto>}
 */
export async function mockGetPerformanceFeedback() {
  const strategies = [
    { strategy: 'DEFENSIVE_MODE', executionCount: 18, successRate: 83, avgImpact: 72 },
    { strategy: 'COLLECTION_FIRST', executionCount: 22, successRate: 72, avgImpact: 68 },
    { strategy: 'PROFITABILITY_RECOVERY', executionCount: 8, successRate: 68, avgImpact: 55 },
    { strategy: 'WAIT_AND_MONITOR', executionCount: 6, successRate: 62, avgImpact: 48 },
    { strategy: 'CONTROLLED_GROWTH', executionCount: 7, successRate: 58, avgImpact: 45 },
    { strategy: 'COST_REDUCTION', executionCount: 5, successRate: 55, avgImpact: 42 },
    { strategy: 'SUPPLIER_RESTRUCTURE', executionCount: 4, successRate: 52, avgImpact: 40 },
    { strategy: 'INVESTMENT_WINDOW', executionCount: 3, successRate: 48, avgImpact: 38 },
    { strategy: 'STORE_EXPANSION', executionCount: 4, successRate: 61, avgImpact: 50 },
    { strategy: 'AGGRESSIVE_GROWTH', executionCount: 3, successRate: 45, avgImpact: 35 },
  ]

  return {
    feedbackScore: 64.2,
    activeStrategy: 'COLLECTION_FIRST',
    strategyPerformance: strategies,
    successfulStrategies: strategies,
    failedStrategies: [...strategies].sort((a, b) => a.successRate - b.successRate),
    impactAnalysis: {
      collectionImpact: 12.5,
      profitImpact: 4.2,
      riskImpact: -8.1,
      shipmentImpact: 6.3,
      operationsImpact: 3.8,
      summary: 'Tahsilat odaklı stratejiler pozitif etki gösteriyor.',
    },
    lessonsLearned: strategies.map((s) => ({
      strategy: s.strategy,
      lesson: `${s.strategy} — deterministik demo ders ${s.successRate}% başarı.`,
      successRate: s.successRate,
    })),
    recommendation: 'COLLECTION_FIRST önceliklendirilmeli — mevcut strateji yüksek başarı oranı gösteriyor.',
    today: '2026-05-14',
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true, sources: ['businessBrain', 'actionOrchestrator'] },
  }
}
