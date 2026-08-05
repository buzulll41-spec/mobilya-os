/**
 * Enterprise 2.2 — Saha operasyonu duplicate guard yardımcıları (saf domain).
 *
 * Aynı kaynak kayıt için aynı tipte AKTİF bir operasyon iki kez oluşturulamaz.
 * Guard, `FieldOperation.dedupeKey` (unique) üzerinden DB seviyesinde uygulanır:
 * operasyon aktifken `dedupeKey = ${sourceType}:${sourceId}:${type}`, terminal
 * duruma geçince veya soft-delete olunca `dedupeKey = NULL` (NULL'lar unique'i bozmaz).
 */

import { FIELD_OPERATION_SOURCE_TYPE } from '../../constants/fieldOperationConstants.js'

export type FieldOperationSourceRefs = {
  orderId?: string | null
  shipmentPlanId?: string | null
  serviceRecordId?: string | null
}

export type ResolvedFieldOperationSource = {
  sourceType: string
  sourceId: string
} | null

/**
 * Kaynak referanslarından tekil kaynağı öncelik sırasıyla türetir:
 * ShipmentPlan → ServiceRecord → Order. Hiçbiri yoksa dedupe uygulanmaz (null).
 */
export function resolveFieldOperationSource(
  refs: FieldOperationSourceRefs,
): ResolvedFieldOperationSource {
  const shipmentPlanId = refs.shipmentPlanId?.trim()
  if (shipmentPlanId) {
    return { sourceType: FIELD_OPERATION_SOURCE_TYPE.SHIPMENT_PLAN, sourceId: shipmentPlanId }
  }
  const serviceRecordId = refs.serviceRecordId?.trim()
  if (serviceRecordId) {
    return { sourceType: FIELD_OPERATION_SOURCE_TYPE.SERVICE_RECORD, sourceId: serviceRecordId }
  }
  const orderId = refs.orderId?.trim()
  if (orderId) {
    return { sourceType: FIELD_OPERATION_SOURCE_TYPE.ORDER, sourceId: orderId }
  }
  return null
}

/**
 * Aktif operasyon için dedupe anahtarını üretir. Kaynak yoksa `null` döner
 * (kaynaksız operasyonlarda duplicate guard uygulanmaz — serbest saha görevi).
 */
export function buildFieldOperationDedupeKey(
  refs: FieldOperationSourceRefs,
  operationType: string,
): string | null {
  const source = resolveFieldOperationSource(refs)
  if (!source) return null
  return `${source.sourceType}:${source.sourceId}:${operationType}`
}
