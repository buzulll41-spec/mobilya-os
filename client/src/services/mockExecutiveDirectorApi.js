/**
 * Mock AI Operasyon Direktörü — deterministik demo çıktı.
 * Depo Katı satış kaynağı olarak hiçbir çıktıda görünmez.
 */

const TODAY = '2026-05-14'

/**
 * @returns {Promise<import('../contracts/v1/executiveDirector.js').ExecutiveDirectorResponseDto>}
 */
export async function mockGetExecutiveDirector() {
  return buildMockResponse(null)
}

/**
 * @returns {Promise<import('../contracts/v1/executiveDirector.js').ExecutiveDirectorResponseDto>}
 */
export async function mockRunExecutiveDirector() {
  return buildMockResponse(new Date().toISOString())
}

/**
 * @param {string|null} lastRunAt
 */
function buildMockResponse(lastRunAt) {
  const dailyPlan = [
    {
      id: 'plan-collection',
      category: 'COLLECTION',
      categoryLabel: 'Tahsilat',
      items: [
        {
          id: 'p1',
          title: 'Kısmi Sevk A.Ş.',
          detail: 'Risk: 125.000 ₺ açık bakiye',
          priority: 'P1',
          metric: 'Acil',
        },
      ],
    },
    {
      id: 'plan-dq',
      category: 'DATA_QUALITY',
      categoryLabel: 'Veri Kalitesi',
      items: [
        {
          id: 'p2',
          title: '12 eksik maliyet kaydı',
          detail: 'ZERO_COST — kâr hesabı bozuluyor',
          priority: 'P1',
        },
      ],
    },
    {
      id: 'plan-shipment',
      category: 'SHIPMENT',
      categoryLabel: 'Sevkiyat',
      items: [
        {
          id: 'p3',
          title: '8 geciken sipariş',
          detail: 'Planlanan sevk tarihi geçmiş',
          priority: 'P1',
        },
      ],
    },
    {
      id: 'plan-sales',
      category: 'SALES',
      categoryLabel: 'Satış',
      items: [
        {
          id: 'p4',
          title: 'Giriş Kat satışları %18 düştü',
          detail: 'Geçen aya göre ciro düşüşü',
          priority: 'P2',
        },
      ],
    },
  ]

  const priorityQueue = [
    {
      id: 'pq1',
      priority: 'P1',
      title: 'Riskli alacak toplamı',
      reason: '169.000 ₺ riskli alacak',
      sourceModule: 'COLLECTION_AGENT',
      category: 'COLLECTION',
    },
    {
      id: 'pq2',
      priority: 'P1',
      title: 'Kritik veri kalitesi',
      reason: 'Ortalama skor 30',
      sourceModule: 'DATA_QUALITY_AGENT',
      category: 'DATA_QUALITY',
    },
    {
      id: 'pq3',
      priority: 'P1',
      title: 'Geciken sevk: O1',
      reason: '4 gün gecikme',
      sourceModule: 'SHIPMENT_AGENT',
      category: 'SHIPMENT',
    },
  ]

  return {
    summary: {
      managerScore: 52.5,
      managerScoreBand: 'Zayıf',
      p1Count: 52,
      p2Count: 54,
      p3Count: 3,
      riskCount: 10,
      recommendedActionCount: 8,
      planSectionCount: dailyPlan.length,
      lastRunAt,
    },
    dailyPlan,
    priorityQueue,
    impactAnalysis: [
      {
        id: 'impact:collection',
        actionTitle: '125.000 ₺ tahsilat',
        actionDescription: 'Riskli alacak tahsilat senaryosu',
        metrics: [
          { label: 'Yönetici Skoru', before: 68, after: 74, delta: '+6', direction: 'UP' },
          { label: 'Risk Skoru', before: 72, after: 61, delta: '-11', direction: 'UP' },
          { label: 'Açık Bakiye', before: '486000.00', after: '361000.00', delta: '-125000.00', direction: 'UP' },
        ],
      },
      {
        id: 'impact:data-quality',
        actionTitle: '12 eksik maliyet düzeltildi',
        actionDescription: 'ZERO_COST düzeltme senaryosu',
        metrics: [
          { label: 'Veri Kalitesi', before: 76, after: 89, delta: '+13', direction: 'UP' },
        ],
      },
    ],
    riskMap: [
      {
        id: 'r1',
        riskTitle: 'Kritik veri kalitesi',
        severity: 'CRITICAL',
        impact: 'Ortalama skor 30 — kâr hesabı güvenilirliği düşük',
        suggestedAction: 'Eksik maliyetli kalemleri ürün kartından düzeltin',
      },
      {
        id: 'r2',
        riskTitle: 'Kısmi sevk alacağı',
        severity: 'CRITICAL',
        impact: '125.000 ₺ riskli açık bakiye',
        suggestedAction: 'Müşteriyle tahsilat görüşmesi yapın',
      },
      {
        id: 'r3',
        riskTitle: 'Geciken teslimatlar',
        severity: 'CRITICAL',
        impact: '8 sevk planlanan tarihi geçti',
        suggestedAction: 'Sevk operasyonunu koordine edin',
      },
    ],
    executiveBriefing: {
      headline: 'Bugün 52 kritik konu tespit edildi.',
      criticalTopics: ['Riskli alacak toplamı', 'Kritik veri kalitesi', 'Geciken sevkler'],
      todayPlan: [
        'Tahsilat: Kısmi Sevk A.Ş.',
        'Veri Kalitesi: 12 eksik maliyet kaydı',
        'Sevkiyat: 8 geciken sipariş',
      ],
      risks: ['Kritik veri kalitesi', 'Kısmi sevk alacağı', 'Geciken teslimatlar'],
      recommendedActions: ['İlk öncelik: Tahsilat listesi', 'Eksik maliyetleri düzeltin'],
    },
    executiveAgenda: [
      { timeRange: '09:00–10:00', focus: 'Tahsilat', description: 'Riskli müşteri aramaları' },
      { timeRange: '10:00–11:00', focus: 'Sevkiyat', description: '8 geciken sevk takibi' },
      { timeRange: '11:00–11:30', focus: 'Tedarikçi görüşmesi', description: 'Termin riski değerlendirmesi' },
      { timeRange: '11:30–12:00', focus: 'Veri Kalitesi', description: 'Eksik maliyet düzeltmeleri' },
    ],
    recommendedActions: [
      {
        id: 'ra1',
        title: 'Tahsilat listesi',
        reason: '169.000 ₺ riskli alacak',
        priority: 'P1',
        deepLinkPage: 'collection',
      },
      {
        id: 'ra2',
        title: 'Eksik maliyet düzelt',
        reason: '12 ZERO_COST kaydı',
        priority: 'P1',
        deepLinkPage: 'data-quality',
      },
    ],
    today: TODAY,
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true },
  }
}
