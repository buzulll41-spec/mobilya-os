/**
 * Mock Otonom Şirket Simülasyonu — deterministik demo çıktı.
 * Depo Katı satış kaynağı olarak hiçbir çıktıda görünmez.
 */

const TODAY = '2026-05-14'

/**
 * @param {import('../contracts/v1/companySimulation.js').SimulationSnapshotDto} base
 * @param {Partial<import('../contracts/v1/companySimulation.js').SimulationSnapshotDto>} patch
 */
function snap(base, patch) {
  return { ...base, ...patch }
}

/**
 * @param {import('../contracts/v1/companySimulation.js').SimulationInputDto} input
 * @param {string|null} lastRunAt
 * @returns {import('../contracts/v1/companySimulation.js').CompanySimulationResponseDto}
 */
function buildMockResponse(input, lastRunAt) {
  const baseline = {
    companyHealthScore: 62.4,
    companyHealthBand: 'Orta',
    riskScore: 68.2,
    revenue: '3.700.000',
    profit: '1.050.000',
    openBalance: '420.000',
    riskyReceivable: '185.000',
    delayedShipments: 8,
    dataQualityScore: 72.5,
  }

  const collPct = input.collectionChangePercent ?? -20
  const storeRev = input.newStoreRevenue ?? 1_500_000
  const staff = input.additionalSalesStaff ?? 2
  const vehicles = input.additionalVehicles ?? 1
  const extPct = input.externalSupplyIncreasePercent ?? 50

  const scenarios = [
    {
      scenarioId: 'COLLECTION_DROP',
      scenarioName: 'Tahsilat Düşerse',
      before: baseline,
      after: snap(baseline, {
        companyHealthScore: collPct < 0 ? 54.1 : 66.8,
        riskScore: collPct < 0 ? 58.4 : 72.1,
        openBalance: collPct < 0 ? '520.000' : '360.000',
        riskyReceivable: collPct < 0 ? '225.000' : '160.000',
      }),
      basis: `Tahsilat ${collPct}% değişim simülasyonu.`,
      recommendation: collPct < 0 ? 'Tahsilat düşüşü açık bakiyeyi artırır; tahsilat planını güçlendirin.' : 'Tahsilat iyileşmesi nakit ve risk skorunu destekler.',
    },
    {
      scenarioId: 'NEW_STORE',
      scenarioName: 'Yeni Mağaza',
      before: baseline,
      after: snap(baseline, {
        companyHealthScore: 65.2,
        revenue: '5.200.000',
        profit: '1.500.000',
        delayedShipments: 9,
      }),
      basis: `+${storeRev.toLocaleString('tr-TR')} ₺ ek ciro, %30 marj.`,
      recommendation: 'Yeni mağaza açmadan önce tahsilat performansını düzeltin.',
    },
    {
      scenarioId: 'NEW_SALES_STAFF',
      scenarioName: 'Yeni Satış Personeli',
      before: baseline,
      after: snap(baseline, {
        companyHealthScore: 64.8,
        revenue: '4.600.000',
        profit: '1.220.000',
      }),
      basis: `${staff} personel × 450.000 ₺ hedef ciro.`,
      recommendation: staff > 3 ? 'Personel artışı verimliliği düşürebilir.' : 'Ek personel ciro ve kârı destekler.',
    },
    {
      scenarioId: 'NEW_VEHICLE',
      scenarioName: 'Yeni Sevk Aracı',
      before: baseline,
      after: snap(baseline, {
        companyHealthScore: 66.1,
        delayedShipments: Math.max(0, baseline.delayedShipments - vehicles * 3),
      }),
      basis: `${vehicles} araç × 3 geciken sevk azaltma.`,
      recommendation: 'Sevk kapasitesi artışı operasyon disiplinini iyileştirir.',
    },
    {
      scenarioId: 'EXTERNAL_SUPPLY_INCREASE',
      scenarioName: 'Dış Tedarik Artışı',
      before: baseline,
      after: snap(baseline, {
        companyHealthScore: 58.7,
        riskScore: 61.5,
        revenue: '4.100.000',
        profit: '1.080.000',
        delayedShipments: 10,
      }),
      basis: `Dış tedarik payı %${extPct} artış simülasyonu.`,
      recommendation: extPct > 30 ? 'Yüksek dış tedarik artışı risk ve marjı baskılar.' : 'Kontrollü dış tedarik büyümesi yönetilebilir.',
    },
  ]

  const bestCase = {
    scenarioId: 'BEST_CASE',
    scenarioName: 'Best Case',
    before: baseline,
    after: snap(baseline, {
      companyHealthScore: 74.6,
      riskScore: 78.4,
      openBalance: '340.000',
      riskyReceivable: '130.000',
      delayedShipments: 4,
      dataQualityScore: 84.5,
    }),
    basis: 'Riskli alacak azalır, veri kalitesi +12, geciken sevk -4, tahsilat +15%.',
    recommendation: 'Tüm iyileştirmeler birlikte sağlık skorunu yükseltir.',
  }

  const worstCase = {
    scenarioId: 'WORST_CASE',
    scenarioName: 'Worst Case',
    before: baseline,
    after: snap(baseline, {
      companyHealthScore: 41.3,
      riskScore: 48.2,
      openBalance: '610.000',
      riskyReceivable: '290.000',
      delayedShipments: 14,
      dataQualityScore: 57.5,
      profit: '966.000',
    }),
    basis: 'Tahsilat -25%, risk +35%, veri kalitesi -15, geciken sevk +6.',
    recommendation: 'Kötü senaryoda önleyici tahsilat ve sevk müdahalesi şart.',
  }

  return {
    summary: {
      baselineHealthScore: 62.4,
      scenarioCount: 7,
      bestCaseHealthAfter: bestCase.after.companyHealthScore,
      worstCaseHealthAfter: worstCase.after.companyHealthScore,
      lastRunAt,
    },
    baseline,
    scenarios,
    bestCase,
    worstCase,
    managementAdvice: 'Yeni mağaza açmadan önce tahsilat performansını düzeltin.',
    input,
    today: TODAY,
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true, virtualOnly: true },
  }
}

/**
 * @returns {Promise<import('../contracts/v1/companySimulation.js').CompanySimulationResponseDto>}
 */
export async function mockGetCompanySimulation() {
  return buildMockResponse({}, null)
}

/**
 * @param {import('../contracts/v1/companySimulation.js').SimulationInputDto} input
 * @returns {Promise<import('../contracts/v1/companySimulation.js').CompanySimulationResponseDto>}
 */
export async function mockRunCompanySimulation(input) {
  return buildMockResponse(input ?? {}, new Date().toISOString())
}
