/**
 * Mock Otonom Şirket Başkanı — deterministik demo çıktı.
 * Depo Katı satış kaynağı olarak hiçbir çıktıda görünmez.
 */

const TODAY = '2026-05-14'

/**
 * @returns {Promise<import('../contracts/v1/chairmanIntelligence.js').ChairmanIntelligenceResponseDto>}
 */
export async function mockGetChairmanIntelligence() {
  return {
    summary: {
      chairmanScore: 54.8,
      chairmanScoreBand: 'Orta',
      chairmanDecision: 'STABILIZE_FIRST',
      ceoScore: 56.2,
      boardScore: 51.9,
      companyHealthScore: 57.4,
      sourcesRead: 7,
      generatedAt: new Date().toISOString(),
    },
    chairmanScore: 54.8,
    chairmanDecision: 'STABILIZE_FIRST',
    chairmanReason: [
      'Şirket sağlık skoru 57.4 (Orta) — uzun vadeli yön değerlendirmesi.',
      'CEO skoru 56.2, karar: FOCUS_COLLECTION.',
      'Yönetim Kurulu skoru 51.9, karar: DELAY_NEW_STORE.',
      'Tahsilat oranı %62; riskli alacak 185.000 ₺.',
      'Kârlılık marjı %28; veri kalitesi 72.5.',
      'Büyüme trendi: Giriş Kat UP (%12).',
      'Simülasyon aralığı: 39.7 – 64.1.',
      'Operasyon ajanları ve direktör 2 P1 konu raporluyor.',
      'Başkan kararı: Büyümeden önce stabilizasyon; risk ve tahsilat önceliklendirilsin.',
      '7 üst modül sentezlendi; CEO ve Kurul denetlendi.',
    ],
    oneYearPlan: [
      'Tahsilat oranını %62 → %77 artır.',
      'Riskli alacak payını %20 altına indir.',
      'Veri kalitesi skorunu 95 üzerine çıkar.',
      'Nakit rezerv hedefi ve haftalık tahsilat kurulu takibi.',
      'Yeni yatırım kararlarını 12 ay dondur.',
    ],
    threeYearPlan: [
      'Tahsilat oranı sektör üstü seviyede stabilize.',
      'Risk yönetim süreci ISO benzeri disiplin.',
      'Nakit pozisyon güçlendirme.',
      'Kontrollü büyüme için zemin hazırlığı.',
    ],
    fiveYearVision: [
      'Finansal disiplinle sürdürülebilir büyüme.',
      'Risk-minimize edilmiş portföy.',
      'Kademeli dijitalleşme.',
      'Güçlü nakit pozisyonu ile seçici genişleme.',
    ],
    topThreats: [
      {
        id: 'thr:p1',
        title: 'Riskli alacak artışı',
        severity: 'CRITICAL',
        horizon: '1Y',
        description: '185.000 ₺ riskli bakiye — uzun vadeli nakit riski.',
      },
      {
        id: 'thr:p2',
        title: 'Geciken sevkiyatlar',
        severity: 'WARNING',
        horizon: '3Y',
        description: '8 sipariş — operasyonel itibar riski.',
      },
    ],
    topOpportunities: [
      {
        id: 'opp:o1',
        title: 'Giriş Kat büyümesi',
        impact: '%12 artış',
        horizon: '1Y',
        description: 'Büyüme momentumu — 3 yıl genişleme potansiyeli.',
      },
      {
        id: 'opp:growth',
        title: 'Giriş Kat — 5 yıl büyüme potansiyeli',
        impact: '%12 momentum',
        horizon: '5Y',
        description: 'Bölgesel genişleme için temel kaynak.',
      },
    ],
    boardAlignment: {
      score: 65,
      status: 'PARTIAL',
      summary: 'CEO ve Kurul kısmen uyumlu; öncelik hizalaması gerekli.',
      details: [
        'CEO kararı: FOCUS_COLLECTION (collection)',
        'Kurul kararı: DELAY_NEW_STORE (stabilize)',
        'Kurul skoru: 51.9, CEO skoru: 56.2',
      ],
    },
    ceoAlignment: {
      score: 65,
      status: 'PARTIAL',
      summary: 'CEO orta vadeli odakta; Başkan uzun vadeli düzeltme öneriyor.',
      details: [
        'Başkan kararı: STABILIZE_FIRST (stabilize)',
        'CEO kararı: FOCUS_COLLECTION (collection)',
      ],
    },
    today: TODAY,
    generatedAt: new Date().toISOString(),
    meta: {
      depoKatiExcluded: true,
      sources: [
        'ceoControlCenter',
        'operationsAgents',
        'executiveDirector',
        'strategicIntelligence',
        'companySimulation',
        'boardDirectors',
        'ceoIntelligence',
      ],
    },
  }
}
