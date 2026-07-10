/**
 * Mock Otonom CEO — deterministik demo çıktı.
 * Depo Katı satış kaynağı olarak hiçbir çıktıda görünmez.
 */

const TODAY = '2026-05-14'

/**
 * @returns {Promise<import('../contracts/v1/ceoIntelligence.js').CeoIntelligenceResponseDto>}
 */
export async function mockGetCeoIntelligence() {
  return {
    summary: {
      ceoScore: 56.2,
      ceoScoreBand: 'Orta',
      ceoDecision: 'FOCUS_COLLECTION',
      companyHealthScore: 57.4,
      boardScore: 51.9,
      boardDecision: 'DELAY_NEW_STORE',
      sourcesRead: 12,
      generatedAt: new Date().toISOString(),
    },
    ceoScore: 56.2,
    ceoDecision: 'FOCUS_COLLECTION',
    ceoReason: [
      'Şirket sağlık skoru 57.4 (Orta).',
      'Yönetim Kurulu kararı: DELAY_NEW_STORE (kurul skoru 51.9).',
      'Tahsilat oranı %62; açık bakiye 420.000 ₺, riskli alacak 185.000 ₺.',
      'Kârlılık marjı %28; 8 geciken sevk.',
      'Simülasyon: best case 64.1, worst case 39.7 (baseline 57.4).',
      'Genel Müdür: yönetici skoru 58, 2 P1 konu.',
      'Tahmin motoru ve aksiyon merkezi 6 açık aksiyon üretiyor.',
      'Stratejik merkez 5 öneri sunuyor.',
      'Nihai CEO kararı: Tahsilata Odaklan — Önümüzdeki 90 gün boyunca tahsilata odaklan.',
      'Veri kaynakları: 12 faz modülü sentezlendi.',
    ],
    topProblems: [
      {
        id: 'p1',
        title: 'Riskli alacak artışı',
        severity: 'CRITICAL',
        description: '185.000 ₺ riskli bakiye — tahsilat planı güncellenmeli.',
      },
      {
        id: 'p2',
        title: 'Geciken sevkiyatlar',
        severity: 'WARNING',
        description: '8 sipariş planlanan sevk tarihini geçti.',
      },
      {
        id: 'p3',
        title: 'Veri kalitesi düşük',
        severity: 'WARNING',
        description: 'Ortalama veri kalitesi skoru 72.5.',
      },
    ],
    topOpportunities: [
      {
        id: 'o1',
        title: 'Giriş Kat büyümesi',
        impact: '%12 artış',
        description: 'Ciro 1.850.000 ₺ — geçen aya göre güçlü performans.',
      },
      {
        id: 'o2',
        title: 'Ayşe performansı',
        impact: 'Skor 78',
        description: 'Ciro 920.000 ₺, hedef gerçekleşme %104.',
      },
    ],
    todayActions: [
      'Riskli müşteri tahsilat planını CEO onayı ile güncelle.',
      '185.000 ₺ riskli alacak için P1 takip listesi oluştur.',
      'Yeni mağaza yatırımını 90 gün dondur; nakit projeksiyonunu haftalık güncelle.',
      'Kısmi Sevk A.Ş. — 125.000 ₺ açık bakiye takibi.',
      'CEO kararını yönetim kuruluna ve departmanlara yazılı ilet.',
    ],
    next30Days: [
      'Haftalık tahsilat KPI takibi ve riskli segmentasyon.',
      'Açık bakiye > 50K müşterilerde ödeme planı revizyonu.',
      'Tahsilat performansını kurul gündemine haftalık taşı.',
    ],
    next90Days: [
      '90 gün sonunda tahsilat oranı +10 puan hedefi.',
      'Riskli alacak oranını %25 altına indir.',
      'Nakit akışı pozitif trend doğrulaması.',
    ],
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
      ],
    },
  }
}
