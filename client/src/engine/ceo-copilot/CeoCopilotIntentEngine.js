import { CEO_COPILOT_INTENT } from '../../contracts/v1/ceoCopilot.js'

/**
 * @param {string} message
 * @param {{ lastIntent?: string }} [memory]
 */
export function detectCeoCopilotIntent(message, memory = {}) {
  const text = message.trim().toLowerCase()

  if (/ai.*(doğru|doğruluk)|tahmin.*doğr|ne kadar doğru/.test(text)) {
    return CEO_COPILOT_INTENT.LEARNING_ACCURACY
  }
  if (/en başarılı.*(tahmin|prediction)|hangi tahmin.*başarı/.test(text)) {
    return CEO_COPILOT_INTENT.LEARNING_BEST_PREDICTION
  }
  if (/en çok hata|hata yaptığı konu|yanlış tahmin/.test(text)) {
    return CEO_COPILOT_INTENT.LEARNING_WORST_TOPIC
  }
  if (/prediction.*güven|güven puanı|confidence/.test(text)) {
    return CEO_COPILOT_INTENT.LEARNING_CONFIDENCE
  }
  if (/en başarılı.*(ai worker|worker)|hangi worker.*başarı/.test(text)) {
    return CEO_COPILOT_INTENT.DECISION_BEST_WORKER
  }
  if (/en düşük kalite|düşük kalite.*karar/.test(text)) {
    return CEO_COPILOT_INTENT.DECISION_LOW_QUALITY
  }
  if (/son 30 gün.*(ai|performans)|30 gün.*ai performans/.test(text)) {
    return CEO_COPILOT_INTENT.DECISION_30_DAY_PERFORMANCE
  }
  if (/riski en çok azalt|risk azaltan karar/.test(text)) {
    return CEO_COPILOT_INTENT.DECISION_RISK_REDUCTION
  }
  if (/son bir ay|son 30 gün.*(geliş|gelişti)|ai.*nasıl gelişti/.test(text)) {
    return CEO_COPILOT_INTENT.OPTIMIZATION_MONTHLY_GROWTH
  }
  if (/en çok gelişen worker/.test(text)) {
    return CEO_COPILOT_INTENT.OPTIMIZATION_BEST_WORKER
  }
  if (/en çok strateji değiştiren|strateji değiştiren worker/.test(text)) {
    return CEO_COPILOT_INTENT.OPTIMIZATION_MOST_CHANGES
  }
  if (/hangi strateji|şu an.*strateji|aktif strateji/.test(text)) {
    return CEO_COPILOT_INTENT.OPTIMIZATION_CURRENT_STRATEGY
  }
  if (/bugün.*(konuş|mesaj|iletişim)|ai çalışan.*birbir|birbirleriyle ne/.test(text)) {
    return CEO_COPILOT_INTENT.COLLABORATION_TODAY_FEED
  }
  if (/en fazla yardım|yardım isteyen worker/.test(text)) {
    return CEO_COPILOT_INTENT.COLLABORATION_MOST_HELP
  }
  if (/en yoğun iş birliği|yoğun.*ekip|iş birliği hangi/.test(text)) {
    return CEO_COPILOT_INTENT.COLLABORATION_BUSIEST_TEAM
  }
  if (/yönetim kurulunu topla|board.*topla|kurulu topla/.test(text)) {
    return CEO_COPILOT_INTENT.BOARD_CONVENE
  }
  if (/bugünkü şirket toplantı|bugün.*toplantı|board meeting/.test(text)) {
    return CEO_COPILOT_INTENT.BOARD_TODAY_MEETING
  }
  if (/en önemli üç karar|3 karar|üç karar/.test(text)) {
    return CEO_COPILOT_INTENT.BOARD_TOP_DECISIONS
  }
  if (/yarın neye odak|yarın.*odak|tomorrow.*focus/.test(text)) {
    return CEO_COPILOT_INTENT.BOARD_TOMORROW_FOCUS
  }
  if (/board geçmiş|toplantı geçmiş/.test(text)) {
    return CEO_COPILOT_INTENT.BOARD_HISTORY
  }
  if (/neden satış|satış.*düşt|sales.*drop|satış neden/.test(text)) {
    return CEO_COPILOT_INTENT.BOARD_STRATEGIC_QUESTION
  }

  if (/detay|göster|\b(aç|git)\b|sayfa/.test(text)) {
    return CEO_COPILOT_INTENT.SHOW_DETAIL
  }
  if (/çöz|uygula|başlat|aksiyon/.test(text)) {
    return CEO_COPILOT_INTENT.EXECUTE_ACTION
  }
  if (/bugün.*sorun|sorun ne|kritik|ne oluyor/.test(text)) {
    return CEO_COPILOT_INTENT.TODAY_ISSUES
  }
  if (/bugün.*yap|ne yapmal|öncelik|priority/.test(text)) {
    return CEO_COPILOT_INTENT.TODAY_PRIORITIES
  }
  if (/tahsilat.*(neden|düş|düştü)|collection.*why|neden tahsilat/.test(text)) {
    return CEO_COPILOT_INTENT.COLLECTION_WHY
  }
  if (/ciro.*(neden|düş)|bu ay.*ciro|revenue/.test(text)) {
    return CEO_COPILOT_INTENT.REVENUE_WHY
  }
  if (/tahsilat.*(gecik|geciken)|geciken.*(tahsilat|ödeme).*(sevk|sevkiyat)|sevki hazır.*sipariş|sevk.*hazır.*sipariş/.test(text)) {
    return CEO_COPILOT_INTENT.GRAPH_OVERDUE_READY
  }
  if (/bugün.*(riskli|risk).*sipariş|hangi sipariş.*risk/.test(text)) {
    return CEO_COPILOT_INTENT.PREDICTION_RISKY_ORDERS
  }
  if (/yarın.*(gecik|gecikecek)|gecikme.*yaşayacağız/.test(text)) {
    return CEO_COPILOT_INTENT.PREDICTION_TOMORROW_DELAY
  }
  if (/en riskli müşteri/.test(text)) {
    return CEO_COPILOT_INTENT.PREDICTION_RISKY_CUSTOMERS
  }
  if (/bu hafta.*tahsilat.*risk|hafta.*tahsilat risk/.test(text)) {
    return CEO_COPILOT_INTENT.PREDICTION_WEEK_COLLECTION
  }
  if (/riskli müşteri|müşteri.*risk/.test(text) || /(\w+)'?(ın|in)?\s*riskli/.test(text)) {
    return CEO_COPILOT_INTENT.GRAPH_EMPLOYEE_RISKY
  }
  if (/risk|riskler/.test(text)) {
    return CEO_COPILOT_INTENT.RISKS
  }
  if (/collection|tahsilat.*durum/.test(text)) {
    return CEO_COPILOT_INTENT.WORKER_COLLECTION
  }
  if (/shipment|sevk.*durum|sevkiyat/.test(text)) {
    return CEO_COPILOT_INTENT.WORKER_SHIPMENT
  }
  if (/sales|satış.*durum/.test(text)) {
    return CEO_COPILOT_INTENT.WORKER_SALES
  }
  if (/procurement|tedarik.*durum/.test(text)) {
    return CEO_COPILOT_INTENT.WORKER_PROCUREMENT
  }
  if (/şirket sağlı|company health|sağlık|score|skor/.test(text)) {
    return CEO_COPILOT_INTENT.COMPANY_HEALTH
  }

  if (memory.lastIntent && /detay|devam|daha fazla/.test(text)) {
    return CEO_COPILOT_INTENT.SHOW_DETAIL
  }

  return CEO_COPILOT_INTENT.GENERAL
}

export function intentToDeepLinkPage(intent) {
  const map = {
    [CEO_COPILOT_INTENT.TODAY_ISSUES]: 'executive-command-center',
    [CEO_COPILOT_INTENT.TODAY_PRIORITIES]: 'executive-command-center',
    [CEO_COPILOT_INTENT.COLLECTION_WHY]: 'collection',
    [CEO_COPILOT_INTENT.REVENUE_WHY]: 'profitability-analytics',
    [CEO_COPILOT_INTENT.RISKS]: 'executive-command-center',
    [CEO_COPILOT_INTENT.WORKER_COLLECTION]: 'digital-workforce',
    [CEO_COPILOT_INTENT.WORKER_SHIPMENT]: 'digital-workforce',
    [CEO_COPILOT_INTENT.WORKER_SALES]: 'digital-workforce',
    [CEO_COPILOT_INTENT.WORKER_PROCUREMENT]: 'digital-workforce',
    [CEO_COPILOT_INTENT.COMPANY_HEALTH]: 'go-live',
    [CEO_COPILOT_INTENT.EXECUTE_ACTION]: 'executive-command-center',
  }
  return map[intent] ?? 'executive-command-center'
}

/** @param {string} message */
export function extractEmployeeNameFromMessage(message) {
  const m = message.match(/([A-Za-zÇĞİÖŞÜçğıöşü]+)'?(?:ın|in|nın|nin)?\s*riskli/i)
  if (m?.[1]) return m[1]
  const nazli = message.match(/nazl[ıi]/i)
  if (nazli) return 'Nazlı'
  return ''
}

export function intentToWorkerId(intent) {
  if (intent === CEO_COPILOT_INTENT.WORKER_COLLECTION) return 'dw-collection'
  if (intent === CEO_COPILOT_INTENT.WORKER_SHIPMENT) return 'dw-shipment'
  if (intent === CEO_COPILOT_INTENT.WORKER_SALES) return 'dw-sales'
  if (intent === CEO_COPILOT_INTENT.WORKER_PROCUREMENT) return 'dw-procurement'
  return null
}
