import type { OptimizationMetricsDto, WorkerStrategyDto } from '../../contracts/selfOptimizationDto.js'

const clamp = (n: number, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(n)))
const clamp01 = (n: number) => Math.min(1, Math.max(0, Math.round(n * 100) / 100))
const clampMultiplier = (n: number, max = 1.35) => Math.min(max, Math.max(0, Math.round(n * 100) / 100))

export function createDefaultStrategy(label = 'Balanced v1'): WorkerStrategyDto {
  return {
    label,
    predictionWeight: 0.25,
    humanApprovalRequired: false,
    aggressiveness: 0.55,
    confidenceMultiplier: 1,
  }
}

export function applyOptimizationRules(
  strategy: WorkerStrategyDto,
  metrics: OptimizationMetricsDto,
): { strategy: WorkerStrategyDto; reasons: string[] } {
  const reasons: string[] = []
  const next = { ...strategy }

  if (metrics.predictionAccuracy < 55) {
    next.predictionWeight = clamp01(next.predictionWeight - 0.08)
    reasons.push('Prediction başarısı düşük · ağırlık azaltıldı')
  }

  if (metrics.decisionScore >= 75) {
    next.aggressiveness = clamp01(next.aggressiveness + 0.05)
    next.label = next.label.includes('Strong') ? next.label : next.label.replace('Balanced', 'Strong')
    reasons.push('DecisionScore yüksek · strateji güçlendirildi')
  }

  if (metrics.approvalRate < 60) {
    next.humanApprovalRequired = true
    reasons.push('Approval oranı düşük · Human Approval artırıldı')
  }

  if (metrics.riskReduction < 50) {
    next.aggressiveness = clamp01(next.aggressiveness - 0.12)
    reasons.push('Risk yüksek · agresif aksiyon azaltıldı')
  }

  if (metrics.learningScore >= 70) {
    next.confidenceMultiplier = clampMultiplier(next.confidenceMultiplier + 0.06)
    reasons.push('Learning yükseldi · confidence artırıldı')
  }

  return { strategy: next, reasons }
}

export function computeOptimizationScore(metrics: OptimizationMetricsDto, strategy: WorkerStrategyDto): number {
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

export function strategiesEqual(a: WorkerStrategyDto, b: WorkerStrategyDto): boolean {
  return (
    a.predictionWeight === b.predictionWeight &&
    a.humanApprovalRequired === b.humanApprovalRequired &&
    a.aggressiveness === b.aggressiveness &&
    a.confidenceMultiplier === b.confidenceMultiplier &&
    a.label === b.label
  )
}

export function computeFullDistributionScore(
  optimizationScore: number,
  decisionScore: number,
  predictionConfidence: number,
  learningScore: number,
): number {
  return clamp(optimizationScore * 0.3 + decisionScore * 0.3 + predictionConfidence * 0.2 + learningScore * 0.2)
}
