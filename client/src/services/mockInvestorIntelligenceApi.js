/**

 * Mock Yatırımcı Merkezi — deterministik demo.

 */



const TODAY = '2026-05-14'



const SWOT_FILL = (prefix, n) =>

  Array.from({ length: n }, (_, i) => `${prefix} ${i + 1} — deterministik demo verisi.`)



/**

 * @returns {Promise<import('../contracts/v1/investorIntelligence.js').InvestorIntelligenceResponseDto>}

 */

export async function mockGetInvestorIntelligence() {

  return {

    summary: {

      investorScore: 62.4,

      investorScoreBand: 'Orta',

      companyRating: 'AVERAGE',

      investmentDecision: 'WATCH',

      newStoreReadiness: 'PARTIAL',

      growthPotential: 'MEDIUM',

      financingNeed: 'MEDIUM',

      investmentRisk: 'MEDIUM',

      valuationTrend: 'STABLE',

      futureScore: 59.2,

      chairmanScore: 54.8,

      ceoScore: 58.1,

      companyHealthScore: 57,

      sourcesRead: 15,

      generatedAt: new Date().toISOString(),

    },

    investorScore: 62.4,

    scoreComponents: {

      profitabilityScore: 68,

      growthScore: 58,

      collectionScore: 72,

      riskScore: 55,

      cashFlowScore: 60,

      stabilityScore: 58,

    },

    companyRating: 'AVERAGE',

    investmentDecision: 'WATCH',

    newStoreReadiness: {

      status: 'PARTIAL',

      reasons: [

        'Sağlık skoru 57 — genişleme için minimum 70 gerekli.',

        'Tahsilat oranı %72 — genişleme öncesi iyileştirme gerekli.',

        'En iyi senaryo (Tahsilat Öncelikli) önerilir durumda.',

      ],

    },

    growthPotential: 'MEDIUM',

    financingNeed: 'MEDIUM',

    investmentRisk: 'MEDIUM',

    valuationTrend: 'STABLE',

    strengths: SWOT_FILL('Güçlü yön', 10),

    weaknesses: SWOT_FILL('Zayıf yön', 10),

    opportunities: SWOT_FILL('Fırsat', 10),

    threats: SWOT_FILL('Tehdit', 10),

    investorBriefing: [

      'Yatırımcı Merkezi analizi 15 operasyonel modülün sentezi ile tamamlandı. Yatırımcı skoru 62.4 (Orta), şirket derecelendirmesi AVERAGE ve yatırım kararı WATCH olarak belirlendi.',

      'Finansal profil: ciro 4.200.000 ₺, brüt marj %18, tahsilat oranı %72. Kârlılık bileşeni 68, tahsilat bileşeni 72, nakit akış bileşeni 60.',

      'Büyüme dinamikleri: Giriş Kat kaynağı UP trendinde (%12 değişim). 365 günlük en iyi senaryo Tahsilat Öncelikli (Önerilir).',

      'Risk profili: risk bileşeni 55, stabilite bileşeni 58. Başkan kararı STABILIZE_FIRST, CEO kararı FOCUS_COLLECTION.',

      'Yatırımcı özeti: WATCH kararı AVERAGE derecelendirmesi ile uyumlu. Yeni mağaza hazırlığı PARTIAL, finansman ihtiyacı MEDIUM seviyesinde.',

    ],

    topRecommendations: Array.from({ length: 10 }, (_, i) => ({

      id: `rec:${i + 1}`,

      priority: i + 1,

      title: `Öneri ${i + 1}`,

      category: i < 3 ? 'Finans' : i < 6 ? 'Operasyon' : 'Büyüme',

      description: `Deterministik yatırımcı önerisi ${i + 1}.`,

    })),

    today: TODAY,

    generatedAt: new Date().toISOString(),

    meta: {

      depoKatiExcluded: true,

      sources: [

        'profitability',

        'forecast',

        'advisor',

        'actionCenter',

        'operationCases',

        'automation',

        'ceoControlCenter',

        'operationsAgents',

        'executiveDirector',

        'strategicIntelligence',

        'companySimulation',

        'boardDirectors',

        'ceoIntelligence',

        'chairman',

        'futureEngine',

      ],

    },

  }

}

