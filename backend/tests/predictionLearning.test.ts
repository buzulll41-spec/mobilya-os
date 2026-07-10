import { describe, expect, it } from 'vitest'
import { PREDICTION_LEARNING_FIELD } from '../src/contracts/predictionLearningDto.js'
import {
  applyConfidenceChange,
  comparePredictionToActual,
  computeConfidenceChange,
  computeFieldAccuracyStats,
  DEFAULT_CONFIDENCE,
  deriveActualOutcomeFromInput,
} from '../src/services/learning/PredictionLearningEngine.js'

describe('Prediction Learning Engine (FAZ 105)', () => {
  describe('Prediction Compare', () => {
    it('accuracy hesaplar', () => {
      const result = comparePredictionToActual(
        {
          delayPrediction: 70,
          paymentPrediction: 60,
          cancelPrediction: 10,
          supplierPrediction: 50,
          stockPrediction: 40,
        },
        {
          delayPrediction: 75,
          paymentPrediction: 55,
          cancelPrediction: 5,
          supplierPrediction: 45,
          stockPrediction: 35,
        },
      )
      expect(result.accuracyOverall).toBeGreaterThan(80)
    })
  })

  describe('Learning Score', () => {
    it('field accuracy istatistikleri', () => {
      const stats = computeFieldAccuracyStats([
        {
          accuracy: {
            delayPrediction: 90,
            paymentPrediction: 80,
            cancelPrediction: 95,
            supplierPrediction: 70,
            stockPrediction: 60,
          },
        },
      ])
      expect(stats.fieldAccuracy[PREDICTION_LEARNING_FIELD.DELAY]).toBe(90)
      expect(stats.bestField).toBe(PREDICTION_LEARNING_FIELD.CANCEL)
    })
  })

  describe('Confidence Update', () => {
    it('yüksek accuracy güven artırır', () => {
      expect(applyConfidenceChange(DEFAULT_CONFIDENCE, computeConfidenceChange(82))).toBeGreaterThan(
        DEFAULT_CONFIDENCE,
      )
    })

    it('düşük accuracy güven düşürür', () => {
      expect(applyConfidenceChange(DEFAULT_CONFIDENCE, computeConfidenceChange(25))).toBeLessThan(
        DEFAULT_CONFIDENCE,
      )
    })
  })

  describe('Performance', () => {
    it('1000 compare < 50ms', () => {
      const prediction = {
        delayPrediction: 50,
        paymentPrediction: 50,
        cancelPrediction: 50,
        supplierPrediction: 50,
        stockPrediction: 50,
      }
      const actual = {
        delayPrediction: 60,
        paymentPrediction: 40,
        cancelPrediction: 10,
        supplierPrediction: 55,
        stockPrediction: 45,
      }
      const started = Date.now()
      for (let i = 0; i < 1000; i++) comparePredictionToActual(prediction, actual)
      expect(Date.now() - started).toBeLessThan(50)
    })
  })

  describe('Company Learning', () => {
    it('actual outcome türetir', () => {
      const actual = deriveActualOutcomeFromInput({
        displayStatus: 'Üretimde',
        remainingAmount: 5000,
        dueDate: '2026-01-01',
        terminOverdue: true,
        supplyWaiting: true,
        supplyPartial: false,
        supplyIncomplete: true,
      })
      expect(actual.delayPrediction).toBe(100)
      expect(actual.supplierPrediction).toBe(100)
    })
  })
})
