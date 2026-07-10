/**
 * Mock Holding Yönetim Merkezi — deterministik demo.
 */

const TODAY = '2026-05-14'

const LIST_FILL = (prefix, n) =>
  Array.from({ length: n }, (_, i) => `${prefix} ${i + 1} — deterministik demo verisi.`)

/**
 * @returns {Promise<import('../contracts/v1/holdingCenter.js').HoldingCenterResponseDto>}
 */
export async function mockGetHoldingCenter() {
  const companies = [
    {
      id: 'EVTREND',
      name: 'EVTREND',
      sector: 'Etkinlik & Trend Mobilya',
      companyScore: 74.2,
      companyHealth: 71.5,
      riskScore: 62.8,
      growthScore: 82.1,
      profitabilityScore: 58.4,
      revenueTl: 5200000,
      investmentRank: 1,
    },
    {
      id: 'ATLAS_CONNECT',
      name: 'ATLAS CONNECT',
      sector: 'Dağıtım & Bağlantı Platformu',
      companyScore: 68.7,
      companyHealth: 65.3,
      riskScore: 68.5,
      growthScore: 75.6,
      profitabilityScore: 61.2,
      revenueTl: 4100000,
      investmentRank: 2,
    },
    {
      id: 'MONESKO',
      name: 'MONESKO',
      sector: 'Finansal Mobilya Çözümleri',
      companyScore: 66.1,
      companyHealth: 63.8,
      riskScore: 55.2,
      growthScore: 58.3,
      profitabilityScore: 72.5,
      revenueTl: 3800000,
      investmentRank: 3,
    },
    {
      id: 'MOBILYA_OS',
      name: 'MOBILYA OS',
      sector: 'Mobilya Perakende & ERP',
      companyScore: 62.4,
      companyHealth: 57.0,
      riskScore: 55.0,
      growthScore: 58.0,
      profitabilityScore: 68.0,
      revenueTl: 37000,
      investmentRank: 4,
    },
    {
      id: 'USTANET',
      name: 'USTANET',
      sector: 'Usta Ağı & Özel Üretim',
      companyScore: 54.8,
      companyHealth: 52.1,
      riskScore: 48.5,
      growthScore: 61.2,
      profitabilityScore: 50.3,
      revenueTl: 2800000,
      investmentRank: 5,
    },
  ]

  const capitalAllocation = [
    { companyId: 'EVTREND', companyName: 'EVTREND', percentage: 28 },
    { companyId: 'ATLAS_CONNECT', companyName: 'ATLAS CONNECT', percentage: 24 },
    { companyId: 'MONESKO', companyName: 'MONESKO', percentage: 22 },
    { companyId: 'MOBILYA_OS', companyName: 'MOBILYA OS', percentage: 14 },
    { companyId: 'USTANET', companyName: 'USTANET', percentage: 12 },
  ]

  const toRanking = (key) =>
    [...companies]
      .sort((a, b) => b[key] - a[key])
      .map((c, i) => ({
        companyId: c.id,
        companyName: c.name,
        rank: i + 1,
        score: c[key],
      }))

  return {
    summary: {
      holdingScore: 65.2,
      holdingScoreBand: 'Orta',
      holdingDecision: 'GROW',
      bestCompany: 'EVTREND',
      worstCompany: 'USTANET',
      companyCount: 5,
      capitalAllocationTotal: 100,
      generatedAt: new Date().toISOString(),
    },
    holdingScore: 65.2,
    holdingDecision: 'GROW',
    companies,
    capitalAllocation,
    growthRanking: toRanking('growthScore'),
    riskRanking: toRanking('riskScore'),
    profitabilityRanking: toRanking('profitabilityScore'),
    investmentRanking: toRanking('companyScore'),
    bestCompany: 'EVTREND',
    worstCompany: 'USTANET',
    holdingOpportunities: LIST_FILL('Holding fırsatı', 10),
    holdingRisks: LIST_FILL('Holding riski', 10),
    holdingBriefing: LIST_FILL('Holding brifing paragrafı', 5),
    fiveYearVision: LIST_FILL('Beş yıllık vizyon', 10),
    today: TODAY,
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true, sources: ['investorIntelligence', 'futureEngine', 'chairman'] },
  }
}
