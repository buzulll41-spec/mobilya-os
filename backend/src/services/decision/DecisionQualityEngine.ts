import type { DecisionCriteriaScores } from '../../contracts/decisionQualityDto.js'

export const CRITERIA_WEIGHTS: Record<keyof DecisionCriteriaScores, number> = {
  predictionAccuracy: 0.15,
  learningScore: 0.12,
  executionSuccess: 0.14,
  approvalRate: 0.1,
  userFeedback: 0.08,
  businessImpact: 0.15,
  timeSaved: 0.11,
  riskReduction: 0.15,
}

const clamp = (n: number) => Math.min(100, Math.max(0, Math.round(n)))

export function scoreDecisionCriteria(
  decisionType: string,
  priority: string | undefined,
  signals: Partial<DecisionCriteriaScores & { workerScore?: number }>,
): DecisionCriteriaScores {
  let businessImpact = 55
  let riskReduction = 50
  let timeSaved = 45
  let executionSuccess = signals.executionSuccess ?? 72

  if (decisionType === 'RISK_REDUCED') {
    riskReduction = 92
    businessImpact = 70
  } else if (decisionType === 'CREATE_TASK') {
    businessImpact = priority === 'CRITICAL' ? 88 : 75
    timeSaved = 68
    executionSuccess = 78
  } else if (decisionType === 'COLLECTION_PRIORITY' || decisionType === 'SHIPMENT_PRIORITY') {
    businessImpact = 82
    riskReduction = 74
    timeSaved = 60
  }

  if (signals.workerScore != null) {
    businessImpact = clamp((businessImpact + signals.workerScore) / 2)
    executionSuccess = clamp((executionSuccess + signals.workerScore) / 2)
  }

  return {
    predictionAccuracy: clamp(signals.predictionAccuracy ?? 65),
    learningScore: clamp(signals.learningScore ?? 68),
    executionSuccess: clamp(executionSuccess),
    approvalRate: clamp(signals.approvalRate ?? 70),
    userFeedback: clamp(signals.userFeedback ?? 72),
    businessImpact: clamp(businessImpact),
    timeSaved: clamp(timeSaved),
    riskReduction: clamp(riskReduction),
  }
}

export function computeDecisionScore(criteria: DecisionCriteriaScores): number {
  let sum = 0
  for (const [key, weight] of Object.entries(CRITERIA_WEIGHTS)) {
    sum += (criteria[key as keyof DecisionCriteriaScores] ?? 0) * weight
  }
  return clamp(sum)
}

export function computeDecisionConfidence(
  decisionScore: number,
  predictionConfidence: number,
  learningScore: number,
): number {
  return clamp(decisionScore * 0.45 + predictionConfidence * 0.3 + learningScore * 0.25)
}

export function computeCombinedDistributionScore(
  decisionScore: number,
  predictionConfidence: number,
  learningScore: number,
): number {
  return clamp(decisionScore * 0.4 + predictionConfidence * 0.35 + learningScore * 0.25)
}
