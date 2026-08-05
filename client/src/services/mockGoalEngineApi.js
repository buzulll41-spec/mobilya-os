/**
 * @returns {Promise<import('../contracts/v1/goalEngine.js').GoalEngineResponseDto>}
 */
export async function mockGetGoalEngine() {
  const activeGoals = [
    { id: 'goal-collection-rate', title: 'Tahsilat oranını +%12 artır', category: 'COLLECTION', priority: 'P1', currentValue: '68%', targetValue: '80%', progressPercent: 62, status: 'ON_TRACK', reason: 'Tahsilat stratejisi öncelikli.' },
    { id: 'goal-open-balance', title: 'Açık bakiyeyi -%15 azalt', category: 'COLLECTION', priority: 'P1', currentValue: '32%', targetValue: '17%', progressPercent: 58, status: 'ON_TRACK', reason: 'Açık bakiye baskısı izleniyor.' },
    { id: 'goal-profit-margin', title: 'Kârlılığı +%6 artır', category: 'PROFITABILITY', priority: 'P1', currentValue: '18%', targetValue: '24%', progressPercent: 45, status: 'AT_RISK', reason: 'Marj hedefi geride.' },
    { id: 'goal-risky-receivable', title: 'Riskli alacağı -%10 azalt', category: 'RISK', priority: 'P1', currentValue: '22%', targetValue: '12%', progressPercent: 52, status: 'ON_TRACK', reason: 'Risk azaltma hedefi.' },
    { id: 'goal-data-quality', title: 'Veri kalitesini +8 puan artır', category: 'DATA_QUALITY', priority: 'P2', currentValue: '72', targetValue: '80', progressPercent: 71, status: 'ON_TRACK', reason: 'Veri kalitesi hızlı ilerliyor.' },
    { id: 'goal-shipment-delay', title: 'Sevk gecikmesini -%20 azalt', category: 'SHIPMENT', priority: 'P2', currentValue: '28%', targetValue: '8%', progressPercent: 48, status: 'AT_RISK', reason: 'Sevk gecikmeleri risk oluşturuyor.' },
    { id: 'goal-sales-growth', title: 'Satış hacmini +%8 artır', category: 'SALES', priority: 'P2', currentValue: '98%', targetValue: '103%', progressPercent: 55, status: 'ON_TRACK', reason: 'Kontrollü büyüme.' },
    { id: 'goal-supplier-health', title: 'Tedarik sağlığını +%10 artır', category: 'SUPPLIER', priority: 'P3', currentValue: '62%', targetValue: '70%', progressPercent: 50, status: 'ON_TRACK', reason: 'Tedarik ajanı izleniyor.' },
    { id: 'goal-operations-completion', title: 'Operasyon tamamlamayı +%15 artır', category: 'OPERATIONS', priority: 'P2', currentValue: '58%', targetValue: '73%', progressPercent: 54, status: 'ON_TRACK', reason: 'Otomasyon tamamlama hedefi.' },
  ]

  return {
    goalScore: 56.8,
    goalDecision: 'FOCUS_COLLECTION',
    activeGoals,
    goalProgress: activeGoals.map((g) => ({
      goalId: g.id,
      startValue: '50%',
      currentValue: g.currentValue,
      targetValue: g.targetValue,
      progressPercent: g.progressPercent,
      estimatedCompletion: '2026-06-30',
      trend: g.progressPercent >= 60 ? 'UP' : g.progressPercent < 50 ? 'DOWN' : 'FLAT',
    })),
    goalRisks: [
      { id: 'risk-1', severity: 'HIGH', goal: 'Kârlılığı +%6 artır', reason: 'Marj hedefi geride.', impact: 55, recommendation: 'Maliyet hedeflerini gözden geçir.' },
      { id: 'risk-2', severity: 'MEDIUM', goal: 'Sevk gecikmesini -%20 azalt', reason: 'Sevk gecikmeleri yüksek.', impact: 42, recommendation: 'SHIPMENT_AGENT ağırlığını artır.' },
    ],
    goalOpportunities: [
      { id: 'opp-1', goal: 'Veri kalitesini +8 puan artır', opportunity: 'Veri kalitesi momentumu yüksek.', expectedImpact: 28, recommendation: 'DATA_QUALITY_FIRST ile sinerji.' },
      { id: 'opp-2', goal: 'Tahsilat oranını +%12 artır', opportunity: 'Tahsilat hedefi plana uygun.', expectedImpact: 25, recommendation: 'COLLECTION_FIRST güçlendir.' },
    ],
    managementBriefing: [
      'Tahsilat hedefleri plana göre ilerliyor.',
      'Kârlılık hedefi geride kalıyor.',
      'Veri kalitesi hedefleri beklenenden hızlı ilerliyor.',
      'Sevk gecikmeleri hedef risk oluşturuyor.',
      'Öncelik tahsilat ve kârlılık olmalı.',
    ],
    today: '2026-05-14',
    generatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true },
  }
}

/**
 * @param {string} goalId
 */
export async function mockPatchGoalProgress(goalId) {
  return {
    status: 'UPDATED',
    goalId,
    progressPercent: 65,
    updatedAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true },
  }
}
