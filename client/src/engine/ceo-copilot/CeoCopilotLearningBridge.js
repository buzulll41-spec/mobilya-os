import { CEO_COPILOT_INTENT } from '../../contracts/v1/ceoCopilot.js'
import { PREDICTION_LEARNING_FIELD } from '../../contracts/v1/predictionLearning.js'
import { fetchCompanyLearning, fetchLearningStatistics } from '../../services/learningClient.js'

const FIELD_LABELS = {
  [PREDICTION_LEARNING_FIELD.DELAY]: 'Teslim gecikmesi',
  [PREDICTION_LEARNING_FIELD.PAYMENT]: 'Tahsilat riski',
  [PREDICTION_LEARNING_FIELD.CANCEL]: 'İptal',
  [PREDICTION_LEARNING_FIELD.SUPPLIER]: 'Tedarik gecikmesi',
  [PREDICTION_LEARNING_FIELD.STOCK]: 'Stok riski',
}

/**
 * @param {string} intent
 * @param {string} message
 * @param {{
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   todayIso: string
 * }} runtimeCtx
 */
export async function buildLearningCopilotReply(intent, message, runtimeCtx) {
  const company = await fetchCompanyLearning(runtimeCtx)
  const stats = company.statistics

  if (intent === CEO_COPILOT_INTENT.LEARNING_ACCURACY) {
    return [
      'Learning Engine · Tahmin doğruluğu',
      `Son dönem doğruluk: %${stats.predictionAccuracy}`,
      `Değerlendirilen tahmin: ${stats.evaluatedRecords}`,
      `Learning Score: ${stats.learningScore}/100`,
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.LEARNING_BEST_PREDICTION) {
    const bestLabel = FIELD_LABELS[stats.bestField] ?? stats.bestField
    const bestScore = stats.fieldAccuracy[stats.bestField] ?? 0
    return [
      'Learning Engine · En başarılı tahmin',
      `${bestLabel} · doğruluk %${bestScore}`,
      `Genel güven: ${stats.confidence}/100`,
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.LEARNING_WORST_TOPIC) {
    const worstLabel = FIELD_LABELS[stats.worstField] ?? stats.worstField
    const worstScore = stats.fieldAccuracy[stats.worstField] ?? 0
    return [
      'Learning Engine · En çok hata yapılan konu',
      `${worstLabel} · doğruluk %${worstScore}`,
      `Bekleyen değerlendirme: ${stats.pendingRecords}`,
    ].join('\n')
  }

  if (intent === CEO_COPILOT_INTENT.LEARNING_CONFIDENCE) {
    const detail = await fetchLearningStatistics(runtimeCtx)
    return [
      'Learning Engine · Prediction güven puanı',
      `Confidence: ${detail.confidence}/100`,
      `Learning Score: ${detail.learningScore}/100`,
      `Prediction Accuracy: ${detail.predictionAccuracy}/100`,
    ].join('\n')
  }

  void message
  return null
}

export {}
