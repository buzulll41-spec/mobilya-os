/**
 * @typedef {import('./taskEnums.js').TaskStatus} TaskStatus
 * @typedef {import('./taskEnums.js').TaskPriority} TaskPriority
 *
 * @typedef {'auto' | 'manual' | 'event'} TaskSource
 *
 * @typedef {Object} TaskDto
 * @property {string} id
 * @property {string} salesOrderId
 * @property {string} title
 * @property {string | null} [description]
 * @property {TaskStatus} status
 * @property {TaskPriority} priority
 * @property {string} dedupeKey Idempotent üretim anahtarı
 * @property {TaskSource} source
 * @property {string | null} [relatedDomainEventId]
 * @property {string | null} [relatedEventType] Zaman çizgisi / event türü ile bağ
 * @property {string | null} [timelineHint] Drawer’da kısa bağ metni
 * @property {string} createdAt ISO instant
 * @property {string} updatedAt ISO instant
 * @property {'info' | 'warning' | 'critical'} [severity] Projection severity
 * @property {string} [subtitle] Kısa alt metin
 * @property {string} [customerName] Müşteri adı
 * @property {string} [sourceType] payment | shipment | risk | …
 * @property {string} [suggestedAction] Önerilen operasyon adımı
 */

export {}
