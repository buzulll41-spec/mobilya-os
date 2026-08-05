import { DOMAIN_EVENT_TYPE } from '../../contracts/v1/domainEventTypes.js'

/** @type {Record<string, string>} */
const WIRE_EVENT_LABELS = {
  'incoming_goods.recorded': 'Ürün depoya giriş yaptı',
  'supply.order.sent': 'Tedarik emri verildi',
  'warehouse.arrival.reverted': 'Depo girişi geri alındı',
  'payment.posted': 'Tahsilat alındı',
  'payment.pending': 'Tahsilat beklemede',
  'shipment.plan.created': 'Sevk planlandı',
  'shipment.plan.updated': 'Sevk planı güncellendi',
  'shipment.dispatch_sheet_printed': 'Araç çıkış fişi yazdırıldı',
  'shipment.group.created': 'Sevk grubu oluşturuldu',
  'shipment.group.applied': 'Sevk grubu uygulandı',
  'dispatch.advice.generated': 'Operasyon tavsiyesi üretildi',
  'dispatch.auto_planned': 'Otomatik sevk planlandı',
  'dispatch.risk_detected': 'Operasyon riski tespit edildi',
  'policy.override': 'Politika istisnası uygulandı',
}

/** @param {string} type */
function humanizeUnknownEventType(type) {
  if (WIRE_EVENT_LABELS[type]) return WIRE_EVENT_LABELS[type]
  if (!type.includes('.')) return 'Operasyon kaydı'

  const parts = type.split('.')
  /** @type {Record<string, string>} */
  const partTr = {
    payment: 'Tahsilat',
    shipment: 'Sevk',
    installation: 'Montaj',
    missing_item: 'Eksik parça',
    order: 'Sipariş',
    task: 'Görev',
    delivery: 'Teslimat',
    risk: 'Risk',
    incoming_goods: 'Depo girişi',
    sales: 'Satış',
    dispatch: 'Sevk operasyonu',
    recorded: 'kaydedildi',
    posted: 'alındı',
    pending: 'beklemede',
    planned: 'planlandı',
    created: 'oluşturuldu',
    updated: 'güncellendi',
    completed: 'tamamlandı',
    resolved: 'çözüldü',
    delivered: 'teslim edildi',
    dispatched: 'yola çıktı',
    loaded: 'yüklendi',
    issue: 'sorun bildirildi',
    escalated: 'güncellendi',
    changed: 'değişti',
    failed: 'başarısız',
    printed: 'yazdırıldı',
  }

  const translated = parts.map((p) => partTr[p] ?? p.replace(/_/g, ' ')).join(' — ')
  return translated.charAt(0).toUpperCase() + translated.slice(1)
}

/** @param {string} type */
export function domainEventTypeLabelTr(type) {
  switch (type) {
    case DOMAIN_EVENT_TYPE.TASK_CREATED:
      return 'Görev oluşturuldu'
    case DOMAIN_EVENT_TYPE.TASK_COMPLETED:
      return 'Görev tamamlandı'
    case DOMAIN_EVENT_TYPE.AI_SALES_TASK_CREATED:
      return 'AI Task Created'
    case DOMAIN_EVENT_TYPE.AI_SALES_TASK_COMPLETED:
      return 'AI Sales görevi tamamlandı'
    case DOMAIN_EVENT_TYPE.AI_SALES_CALL_LOGGED:
      return 'AI satış araması kaydedildi'
    case DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_CREATED:
      return 'AI Collection Task Created'
    case DOMAIN_EVENT_TYPE.AI_COLLECTION_TASK_COMPLETED:
      return 'AI Collection görevi tamamlandı'
    case DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_CREATED:
      return 'AI Shipment Task Created'
    case DOMAIN_EVENT_TYPE.AI_SHIPMENT_TASK_COMPLETED:
      return 'AI Shipment görevi tamamlandı'
    case DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_CREATED:
      return 'AI Procurement Task Created'
    case DOMAIN_EVENT_TYPE.AI_PROCUREMENT_TASK_COMPLETED:
      return 'AI Procurement görevi tamamlandı'
    case DOMAIN_EVENT_TYPE.AI_ORCHESTRATION_CHAIN_COMPLETED:
      return 'AI operasyon zinciri tamamlandı'
    case DOMAIN_EVENT_TYPE.PAYMENT_POSTED:
      return 'Tahsilat alındı'
    case DOMAIN_EVENT_TYPE.PAYMENT_PENDING:
      return 'Tahsilat beklemede'
    case DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCHED:
      return 'Sevk yola çıktı'
    case DOMAIN_EVENT_TYPE.SHIPMENT_PARTIAL:
      return 'Kısmi sevk yapıldı'
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLANNED:
      return 'Sevk planlandı'
    case DOMAIN_EVENT_TYPE.SHIPMENT_LOADED:
      return 'Araç yüklendi'
    case DOMAIN_EVENT_TYPE.SHIPMENT_DELIVERED:
      return 'Teslim edildi'
    case DOMAIN_EVENT_TYPE.INSTALLATION_COMPLETED:
      return 'Montaj tamamlandı'
    case DOMAIN_EVENT_TYPE.INSTALLATION_ISSUE:
      return 'Montaj sorunu bildirildi'
    case DOMAIN_EVENT_TYPE.RISK_ESCALATED:
      return 'Risk seviyesi güncellendi'
    case DOMAIN_EVENT_TYPE.ORDER_LIFECYCLE_CHANGED:
      return 'Sipariş durumu değişti'
    case DOMAIN_EVENT_TYPE.ORDER_LINE_COMMITTED_SHIP_BY_CHANGED:
      return 'Termin tarihi güncellendi'
    case DOMAIN_EVENT_TYPE.ORDER_PLACED:
      return 'Sipariş oluşturuldu'
    case DOMAIN_EVENT_TYPE.DELIVERY_FAILED:
      return 'Teslimat sorunu'
    case DOMAIN_EVENT_TYPE.DELIVERY_COMPLETED:
      return 'Teslimat tamamlandı'
    case DOMAIN_EVENT_TYPE.MISSING_ITEM_CREATED:
      return 'Eksik parça kaydı açıldı'
    case DOMAIN_EVENT_TYPE.MISSING_ITEM_ORDERED:
      return 'Eksik parça sipariş edildi'
    case DOMAIN_EVENT_TYPE.MISSING_ITEM_ARRIVED:
      return 'Eksik parça depoya geldi'
    case DOMAIN_EVENT_TYPE.MISSING_ITEM_READY_FOR_SHIPMENT:
      return 'Eksik parça sevke hazır'
    case DOMAIN_EVENT_TYPE.MISSING_ITEM_RESOLVED:
      return 'Eksik parça çözüldü'
    case DOMAIN_EVENT_TYPE.SALES_CONTRACT_PRINTED:
      return 'Satış sözleşmesi yazdırıldı'
    case DOMAIN_EVENT_TYPE.POLICY_OVERRIDE:
    case 'policy.override':
      return 'Politika istisnası uygulandı'
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_CREATED:
    case 'shipment.plan.created':
      return 'Sevk planlandı'
    case DOMAIN_EVENT_TYPE.SHIPMENT_PLAN_UPDATED:
    case 'shipment.plan.updated':
      return 'Sevk planı güncellendi'
    case DOMAIN_EVENT_TYPE.SHIPMENT_GROUP_CREATED:
    case 'shipment.group.created':
      return 'Sevk grubu oluşturuldu'
    case DOMAIN_EVENT_TYPE.SHIPMENT_GROUP_APPLIED:
    case 'shipment.group.applied':
      return 'Sevk grubu uygulandı'
    case DOMAIN_EVENT_TYPE.SHIPMENT_DISPATCH_SHEET_PRINTED:
    case 'shipment.dispatch_sheet_printed':
      return 'Araç çıkış fişi yazdırıldı'
    case DOMAIN_EVENT_TYPE.DISPATCH_ADVICE_GENERATED:
    case 'dispatch.advice.generated':
      return 'Operasyon tavsiyesi üretildi'
    case DOMAIN_EVENT_TYPE.DISPATCH_AUTO_PLANNED:
    case 'dispatch.auto_planned':
      return 'Otomatik sevk planlandı'
    case DOMAIN_EVENT_TYPE.DISPATCH_RISK_DETECTED:
    case 'dispatch.risk_detected':
      return 'Operasyon riski tespit edildi'
    default:
      return humanizeUnknownEventType(type)
  }
}
