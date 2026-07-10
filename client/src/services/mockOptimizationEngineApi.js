/**
 * @returns {Promise<import('../contracts/v1/optimizationEngine.js').OptimizationEngineResponseDto>}
 */
export async function mockGetOptimizationEngine() {
  const strategyOptimizations = [
    { strategy: 'COLLECTION_FIRST', currentWeight: 100, recommendedWeight: 135, successRate: 82, reason: 'Tahsilat stratejisi yüksek başarı üretiyor.' },
    { strategy: 'DATA_QUALITY_FIRST', currentWeight: 100, recommendedWeight: 118, successRate: 74, reason: 'Veri kalitesi kârlılık hesaplarını güçlendiriyor.' },
    { strategy: 'DEFENSIVE_MODE', currentWeight: 100, recommendedWeight: 112, successRate: 70, reason: 'Savunmacı mod risk döneminde etkili.' },
    { strategy: 'CONTROLLED_GROWTH', currentWeight: 100, recommendedWeight: 105, successRate: 64, reason: 'Kontrollü büyüme dengeli sonuç veriyor.' },
    { strategy: 'BALANCED_MODE', currentWeight: 100, recommendedWeight: 100, successRate: 58, reason: 'Dengeli mod korunmalı.' },
    { strategy: 'COST_REDUCTION', currentWeight: 100, recommendedWeight: 95, successRate: 52, reason: 'Maliyet indirimi sınırlı etki.' },
    { strategy: 'SUPPLIER_RESTRUCTURE', currentWeight: 100, recommendedWeight: 88, successRate: 48, reason: 'Tedarik yeniden yapılandırma izlenmeli.' },
    { strategy: 'AGGRESSIVE_GROWTH', currentWeight: 100, recommendedWeight: 70, successRate: 41, reason: 'Büyüme stratejisi mevcut risk seviyesinde zayıf kalıyor.' },
  ]

  const agentOptimizations = [
    { agent: 'COLLECTION_AGENT', currentWeight: 100, recommendedWeight: 128, successRate: 78, impactScore: 72, reason: 'Tahsilat ajanı yüksek performans.' },
    { agent: 'DATA_QUALITY_AGENT', currentWeight: 100, recommendedWeight: 115, successRate: 70, impactScore: 68, reason: 'Veri kalitesi ajanı kritik.' },
    { agent: 'SHIPMENT_AGENT', currentWeight: 100, recommendedWeight: 108, successRate: 66, impactScore: 62, reason: 'Sevk ajanı stabil.' },
    { agent: 'EXECUTIVE_AGENT', currentWeight: 100, recommendedWeight: 102, successRate: 60, impactScore: 58, reason: 'Yönetici ajanı dengeli.' },
    { agent: 'SUPPLIER_AGENT', currentWeight: 100, recommendedWeight: 92, successRate: 54, impactScore: 50, reason: 'Tedarik ajanı iyileştirilmeli.' },
    { agent: 'SALES_AGENT', currentWeight: 100, recommendedWeight: 85, successRate: 48, impactScore: 45, reason: 'Satış ajanı düşük etki.' },
  ]

  return {
    optimizationScore: 68.4,
    optimizationDecision: 'BOOST_COLLECTION_STRATEGY',
    strategyOptimizations,
    agentOptimizations,
    recommendedChanges: [
      { id: 'chg-1', targetType: 'STRATEGY', target: 'COLLECTION_FIRST', currentValue: '100', recommendedValue: '135', impact: 17.5, reason: 'Tahsilat stratejisi yüksek başarı.', priority: 'P1' },
      { id: 'chg-2', targetType: 'AGENT', target: 'COLLECTION_AGENT', currentValue: '100', recommendedValue: '128', impact: 12.6, reason: 'Collection Agent artırılmalı.', priority: 'P2' },
      { id: 'chg-3', targetType: 'STRATEGY', target: 'AGGRESSIVE_GROWTH', currentValue: '100', recommendedValue: '70', impact: 15, reason: 'Büyüme stratejisi düşürülmeli.', priority: 'P1' },
    ],
    managementBriefing: [
      'Tahsilat stratejisi mevcut dönemde en başarılı strateji.',
      'Büyüme stratejisi risk nedeniyle geçici olarak düşürülmeli.',
      'Veri kalitesi aksiyonları kârlılık hesaplarını güçlendiriyor.',
      'Collection Agent ağırlığı artırılmalı.',
      'Sistem dengeli ama tahsilat öncelikli modda çalışmalı.',
    ],
    today: '2026-05-14',
    generatedAt: new Date().toISOString(),
    applyStatus: 'PENDING',
    lastAppliedAt: null,
    meta: { depoKatiExcluded: true, virtualOnly: true },
  }
}

/**
 * @returns {Promise<import('../contracts/v1/optimizationEngine.js').OptimizationApplyResponseDto>}
 */
export async function mockApplyOptimizationEngine() {
  return {
    status: 'APPLIED',
    appliedChanges: 8,
    runAt: new Date().toISOString(),
    meta: { depoKatiExcluded: true, virtualOnly: true },
  }
}
