/** @typedef {import('../../contracts/v1/selfOptimization.js').WorkerStrategyDto} WorkerStrategyDto */
/** @typedef {import('../../contracts/v1/selfOptimization.js').OptimizationMetricsDto} OptimizationMetricsDto */

const clamp = (n, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(n)))
const clamp01 = (n) => Math.min(1, Math.max(0, Math.round(n * 100) / 100))
const clampMultiplier = (n, max = 1.35) => Math.min(max, Math.max(0, Math.round(n * 100) / 100))

/** @returns {WorkerStrategyDto} */
export function createDefaultStrategy(label = 'Balanced v1') {
  return {
    label,
    predictionWeight: 0.25,
    humanApprovalRequired: false,
    aggressiveness: 0.55,
    confidenceMultiplier: 1,
  }
}

/**
 * @param {WorkerStrategyDto} strategy
 * @param {OptimizationMetricsDto} metrics
 */
export function applyOptimizationRules(strategy, metrics) {
  /** @type {string[]} */
  const reasons = []
  const next = { ...strategy }

  if (metrics.predictionAccuracy < 55) {
    next.predictionWeight = clamp01(next.predictionWeight - 0.08)
    reasons.push('Prediction başarısı düşük · ağırlık azaltıldı')
  } else if (metrics.predictionAccuracy >= 75) {
    next.predictionWeight = clamp01(next.predictionWeight + 0.03)
  }

  if (metrics.decisionScore >= 75) {
    next.aggressiveness = clamp01(next.aggressiveness + 0.05)
    next.label = strengthenLabel(next.label)
    reasons.push('DecisionScore yüksek · strateji güçlendirildi')
  }

  if (metrics.approvalRate < 60) {
    next.humanApprovalRequired = true
    reasons.push('Approval oranı düşük · Human Approval artırıldı')
  }

  if (metrics.riskReduction < 50 || metrics.decisionScore < 45) {
    next.aggressiveness = clamp01(next.aggressiveness - 0.12)
    reasons.push('Risk yüksek · agresif aksiyon azaltıldı')
  }

  if (metrics.learningScore >= 70) {
    next.confidenceMultiplier = clampMultiplier(next.confidenceMultiplier + 0.06)
    reasons.push('Learning yükseldi · confidence artırıldı')
  }

  return { strategy: next, reasons }
}

/** @param {string} label */
function strengthenLabel(label) {
  if (label.includes('Strong')) return label
  return label.replace('Balanced', 'Strong').replace('v1', 'v2')
}

/**
 * @param {OptimizationMetricsDto} metrics
 * @param {WorkerStrategyDto} strategy
 */
export function computeOptimizationScore(metrics, strategy) {
  const base =
    metrics.predictionAccuracy * strategy.predictionWeight * 0.2 +
    metrics.learningScore * 0.18 +
    metrics.decisionScore * 0.22 +
    metrics.executionSuccess * 0.15 +
    metrics.approvalRate * 0.12 +
    metrics.riskReduction * 0.13
  const approvalPenalty = strategy.humanApprovalRequired ? -2 : 0
  return clamp(base + approvalPenalty)
}

/**
 * @param {WorkerStrategyDto} a
 * @param {WorkerStrategyDto} b
 */
export function strategiesEqual(a, b) {
  return (
    a.predictionWeight === b.predictionWeight &&
    a.humanApprovalRequired === b.humanApprovalRequired &&
    a.aggressiveness === b.aggressiveness &&
    a.confidenceMultiplier === b.confidenceMultiplier &&
    a.label === b.label
  )
}

/**
 * @param {number} optimizationScore
 * @param {number} decisionScore
 * @param {number} predictionConfidence
 * @param {number} learningScore
 */
export function computeFullDistributionScore(
  optimizationScore,
  decisionScore,
  predictionConfidence,
  learningScore,
) {
  return clamp(
    optimizationScore * 0.3 + decisionScore * 0.3 + predictionConfidence * 0.2 + learningScore * 0.2,
  )
}

export {}
