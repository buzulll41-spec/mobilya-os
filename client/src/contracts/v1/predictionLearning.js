/** FAZ 105 — Prediction Learning Engine contracts. */

export const PREDICTION_LEARNING_STATUS = {
  PENDING: 'pending',
  EVALUATED: 'evaluated',
}

export const PREDICTION_LEARNING_FIELD = {
  DELAY: 'delayPrediction',
  PAYMENT: 'paymentPrediction',
  CANCEL: 'cancelPrediction',
  SUPPLIER: 'supplierPrediction',
  STOCK: 'stockPrediction',
}

/**
 * @typedef {Object} PredictionOutcomeVector
 * @property {number} delayPrediction
 * @property {number} paymentPrediction
 * @property {number} cancelPrediction
 * @property {number} supplierPrediction
 * @property {number} stockPrediction
 */

/**
 * @typedef {Object} PredictionLearningRecordDto
 * @property {string} id
 * @property {string} orderId
 * @property {string} predictedAt
 * @property {string | null} evaluatedAt
 * @property {PredictionOutcomeVector} prediction
 * @property {PredictionOutcomeVector | null} actualResult
 * @property {PredictionOutcomeVector | null} accuracy
 * @property {number} accuracyOverall
 * @property {number} confidenceChange
 * @property {number} learningScore
 * @property {typeof PREDICTION_LEARNING_STATUS[keyof typeof PREDICTION_LEARNING_STATUS]} status
 */

/**
 * @typedef {Object} PredictionLearningStatisticsDto
 * @property {number} totalRecords
 * @property {number} evaluatedRecords
 * @property {number} pendingRecords
 * @property {number} predictionAccuracy
 * @property {number} confidence
 * @property {number} learningScore
 * @property {string} bestField
 * @property {string} worstField
 * @property {Record<string, number>} fieldAccuracy
 * @property {{ durationMs: number }} meta
 */

/**
 * @typedef {Object} CompanyPredictionLearningDto
 * @property {PredictionLearningRecordDto[]} recentRecords
 * @property {PredictionLearningStatisticsDto} statistics
 */

export {}
