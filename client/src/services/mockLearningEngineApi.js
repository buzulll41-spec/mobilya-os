/**

 * @returns {Promise<import('../contracts/v1/learningEngine.js').LearningEngineResponseDto>}

 */

export async function mockGetLearningEngine() {

  const strategyTable = [

    { strategy: 'COLLECTION_FIRST', usageCount: 18, successRate: 78, impactScore: 72, overallScore: 75 },

    { strategy: 'CASH_PROTECTION', usageCount: 12, successRate: 74, impactScore: 68, overallScore: 71 },

    { strategy: 'CONTROLLED_GROWTH', usageCount: 9, successRate: 68, impactScore: 62, overallScore: 65 },

    { strategy: 'COST_REDUCTION', usageCount: 7, successRate: 62, impactScore: 58, overallScore: 60 },

    { strategy: 'SUPPLIER_FOCUS', usageCount: 6, successRate: 58, impactScore: 55, overallScore: 56 },

    { strategy: 'AGGRESSIVE_GROWTH', usageCount: 4, successRate: 48, impactScore: 42, overallScore: 45 },

  ]



  const agentLearning = [

    { agent: 'COLLECTION_AGENT', taskCount: 22, successRate: 76, impactScore: 70 },

    { agent: 'EXECUTIVE_AGENT', taskCount: 15, successRate: 72, impactScore: 68 },

    { agent: 'DATA_QUALITY_AGENT', taskCount: 11, successRate: 68, impactScore: 64 },

    { agent: 'SHIPMENT_AGENT', taskCount: 14, successRate: 65, impactScore: 60 },

    { agent: 'SUPPLIER_AGENT', taskCount: 9, successRate: 58, impactScore: 55 },

    { agent: 'SALES_AGENT', taskCount: 8, successRate: 52, impactScore: 48 },

  ]



  return {

    learningScore: 67.4,

    bestStrategy: strategyTable[0],

    worstStrategy: strategyTable[strategyTable.length - 1],

    strategyTable,

    agentLearning,

    decisionTrend: {

      days30: { score: 68.2, trend: 'UP' },

      days90: { score: 64.5, trend: 'FLAT' },

      days180: { score: 61.8, trend: 'DOWN' },

    },

    lessonsLearned: Array.from({ length: 10 }, (_, i) => ({

      id: `lesson-${i + 1}`,

      category: i < 3 ? 'STRATEGY' : i < 6 ? 'OPERATIONS' : 'FINANCE',

      lesson: `Deterministik demo ders ${i + 1} — kurumsal öğrenme motoru.`,

      confidence: 60 + i * 3,

    })),

    recommendations: [

      { id: 'rec-1', priority: 'P1', title: 'COLLECTION_FIRST stratejisini güçlendir', rationale: 'En yüksek başarı oranı.' },

      { id: 'rec-2', priority: 'P2', title: 'AGGRESSIVE_GROWTH gözden geçir', rationale: 'Düşük başarı oranı.' },

      { id: 'rec-3', priority: 'P2', title: 'COLLECTION_AGENT çıktılarını ölçeklendir', rationale: 'Yüksek ajan performansı.' },

      { id: 'rec-4', priority: 'P2', title: 'Nakit koruma protokolünü aktive et', rationale: 'Nakit baskısı izlenmeli.' },

      { id: 'rec-5', priority: 'P3', title: 'SALES_AGENT performansını iyileştir', rationale: 'En düşük ajan başarısı.' },

    ],

    summary: 'Kurumsal öğrenme skoru 67.4 — COLLECTION_FIRST en başarılı strateji. Karar kalitesi iyileşme eğiliminde.',

    today: '2026-05-14',

    generatedAt: new Date().toISOString(),

    meta: { depoKatiExcluded: true, virtualOnly: true },

  }

}


