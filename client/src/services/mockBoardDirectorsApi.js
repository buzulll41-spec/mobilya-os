/**

 * Mock Otonom Yönetim Kurulu — deterministik demo çıktı.

 * Depo Katı satış kaynağı olarak hiçbir çıktıda görünmez.

 */



const TODAY = '2026-05-14'



const BOARD_DECISION_LABELS = {

  OPEN_NEW_STORE: 'Yeni Mağaza Aç',

  DELAY_NEW_STORE: 'Yeni Mağazayı Ertele',

  FOCUS_COLLECTION: 'Tahsilata Odaklan',

  FOCUS_OPERATIONS: 'Operasyona Odaklan',

  FOCUS_PROFITABILITY: 'Kârlılığa Odaklan',

  FOCUS_RISK_REDUCTION: 'Risk Azaltmaya Odaklan',

}



/**

 * @returns {import('../contracts/v1/boardDirectors.js').BoardDirectorsResponseDto}

 */

function buildMockResponse() {

  const boardDecision = 'FOCUS_COLLECTION'

  const boardScore = 58.4



  const directors = [

    {

      code: 'FINANCE_DIRECTOR',

      label: 'Finans Direktörü',

      vote: 'DELAY_NEW_STORE',

      voteLabel: 'Yeni Mağazayı Ertele',

      confidence: 82,

      weight: 25,

      reason: 'Riskli alacak payı %28 ve tahsilat oranı %62 — yeni yatırım ertelenmeli.',

    },

    {

      code: 'OPERATIONS_DIRECTOR',

      label: 'Operasyon Direktörü',

      vote: 'IMPROVE_OPERATIONS_FIRST',

      voteLabel: 'Önce Operasyonu İyileştir',

      confidence: 74,

      weight: 20,

      reason: '8 geciken sevk, 3 açık eksik kalem — büyüme durdurulmalı.',

    },

    {

      code: 'SALES_DIRECTOR',

      label: 'Satış Direktörü',

      vote: 'EXPAND_GROWTH',

      voteLabel: 'Büyümeyi Hızlandır',

      confidence: 68,

      weight: 20,

      reason: 'Mağaza içi satış %12 büyüdü — yatırım önerilir.',

    },

    {

      code: 'SUPPLIER_DIRECTOR',

      label: 'Tedarikçi Direktörü',

      vote: 'SUPPLIER_OPTIMIZATION',

      voteLabel: 'Tedarikçi Optimizasyonu',

      confidence: 71,

      weight: 10,

      reason: '2 riskli tedarikçi; açık bakiye yüksek — optimizasyon şart.',

    },

    {

      code: 'RISK_DIRECTOR',

      label: 'Risk Direktörü',

      vote: 'FOCUS_COLLECTION',

      voteLabel: 'Tahsilata Odaklan',

      confidence: 88,

      weight: 15,

      reason: 'Riskli alacak 185.000 ₺ — tahsilat riski büyümeden önce yönetilmeli.',

    },

    {

      code: 'EXECUTIVE_DIRECTOR',

      label: 'Genel Müdür',

      vote: 'FOCUS_COLLECTION',

      voteLabel: 'Tahsilata Odaklan',

      confidence: 79,

      weight: 10,

      reason: '2 P1 konu; ilk öncelik tahsilat — kritik müşteri takibi.',

    },

  ]



  return {

    summary: {

      directorCount: 6,

      boardScore,

      boardScoreBand: 'Orta',

      boardDecision,

      companyHealthScore: 62.4,

      analysisMonth: '2026-05',

      generatedAt: new Date().toISOString(),

    },

    boardScore,

    directors,

    boardDecision,

    boardReason: `${BOARD_DECISION_LABELS[boardDecision]} — 3 direktör destekliyor (Finans Direktörü, Risk Direktörü, Genel Müdür); ağırlıklı skor 28.4.`,

    topRisks: [

      {

        id: 'rf:collection',

        title: 'Tahsilat Riski',

        severity: 'WARNING',

        description: '90 gün içinde 185.000 ₺ riskli alacak tahsilat baskısı oluşturabilir.',

      },

      {

        id: 'rf:shipment',

        title: 'Sevkiyat Yoğunluğu Riski',

        severity: 'WARNING',

        description: '8 geciken sevk; yoğunluk HIGH.',

      },

      {

        id: 'rf:data-quality',

        title: 'Veri Kalitesi Riski',

        severity: 'WARNING',

        description: 'Ortalama veri kalite skoru 72.5; kârlılık raporları güvenilirliğini kaybedebilir.',

      },

    ],

    topOpportunities: [

      {

        id: 'opp:source:IN_STORE',

        title: 'Mağaza içi satış büyümesi',

        impact: '%12 artış',

        description: 'Ciro 2.200.000 ₺ — geçen aya göre güçlü performans.',

      },

      {

        id: 'opp:sales:Ayşe',

        title: 'Ayşe performansı',

        impact: 'Skor 78',

        description: 'Ciro 1.100.000 ₺, hedef gerçekleşme %92.',

      },

      {

        id: 'opp:brand:MarkaA',

        title: 'Marka A marjı',

        impact: '%28 marj',

        description: 'Ciro 800.000 ₺, brüt kâr 224.000 ₺.',

      },

    ],

    whatBoardWouldDoToday: [

      'Riskli müşteri tahsilat planını güncelle ve P1 aramaları başlat.',

      '185.000 ₺ riskli alacak için segmentasyon uygula.',

      'Riskli müşteri aramaları — 3 kritik müşteri ödeme planı görüşmesi.',

      'Kurul kararını ilgili departmanlara yazılı ilet ve 7 gün sonra durum raporu iste.',

      'Haftalık nakit akışı projeksiyonunu güncelle.',

    ],

    today: TODAY,

    generatedAt: new Date().toISOString(),

    meta: { depoKatiExcluded: true },

  }

}



/**

 * @returns {Promise<import('../contracts/v1/boardDirectors.js').BoardDirectorsResponseDto>}

 */

export async function mockGetBoardDirectors() {

  return buildMockResponse()

}


