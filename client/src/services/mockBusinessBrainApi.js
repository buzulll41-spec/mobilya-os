const LIST = (prefix, n) => Array.from({ length: n }, (_, i) => `${prefix} ${i + 1} — deterministik demo.`)

/**
 * @returns {Promise<import('../contracts/v1/businessBrain.js').BusinessBrainResponseDto>}
 */
export async function mockGetBusinessBrain() {
  return {
    brainScore: 63.5,
    operationsScore: 68.2,
    financeScore: 61.4,
    growthScore: 58.7,
    riskScore: 55.3,
    futureScore: 64.5,
    investmentScore: 52.2,
    primaryDecision: 'COLLECTION_FIRST',
    todayActions: LIST('Bugün', 10),
    plan30Days: LIST('30 gün', 10),
    plan90Days: LIST('90 gün', 10),
    plan365Days: LIST('365 gün', 10),
    topRisks: LIST('Risk', 10),
    topOpportunities: LIST('Fırsat', 10),
    managementBriefing: LIST('Brifing', 10),
    today: '2026-05-14',
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true, sources: ['profitability', 'futureEngine', 'groupChairman'] },
  }
}
