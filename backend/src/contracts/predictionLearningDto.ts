/** FAZ 105 — Prediction Learning Engine contracts. */

export const PREDICTION_LEARNING_STATUS = {
  PENDING: 'pending',
  EVALUATED: 'evaluated',
} as const

export type PredictionLearningStatus =
  (typeof PREDICTION_LEARNING_STATUS)[keyof typeof PREDICTION_LEARNING_STATUS]

export const PREDICTION_LEARNING_FIELD = {
  DELAY: 'delayPrediction',
  PAYMENT: 'paymentPrediction',
  CANCEL: 'cancelPrediction',
  SUPPLIER: 'supplierPrediction',
  STOCK: 'stockPrediction',
} as const

export type PredictionLearningField =
  (typeof PREDICTION_LEARNING_FIELD)[keyof typeof PREDICTION_LEARNING_FIELD]

export type PredictionOutcomeVector = Record<PredictionLearningField, number>

export type PredictionLearningRecordDto = {
  id: string
  orderId: string
  predictedAt: string
  evaluatedAt: string | null
  prediction: PredictionOutcomeVector
  actualResult: PredictionOutcomeVector | null
  accuracy: PredictionOutcomeVector | null
  accuracyOverall: number
  confidenceChange: number
  learningScore: number
  status: PredictionLearningStatus
}

export type PredictionLearningStatisticsDto = {
  totalRecords: number
  evaluatedRecords: number
  pendingRecords: number
  predictionAccuracy: number
  confidence: number
  learningScore: number
  bestField: string
  worstField: string
  fieldAccuracy: Record<string, number>
  meta: { durationMs: number }
}

export type CompanyPredictionLearningDto = {
  recentRecords: PredictionLearningRecordDto[]
  statistics: PredictionLearningStatisticsDto
}

export type OrderPredictionLearningDto = {
  orderId: string
  records: PredictionLearningRecordDto[]
}
