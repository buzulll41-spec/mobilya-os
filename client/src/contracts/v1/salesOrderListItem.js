/**
 * Liste endpoint’i için contract DTO (wire).
 * Foundation slice: demo `Order` alanlarından üretilir; `salesPerson`, `plannedShipmentDate` list projection alanıdır.
 *
 * @typedef {import('./money.js').Money} Money
 * @typedef {import('./enums.js').OrderChannel} OrderChannel
 * @typedef {import('./enums.js').SalesOrderLifecycleStatus} SalesOrderLifecycleStatus
 * @typedef {import('./enums.js').RiskSeverity} RiskSeverity
 * @typedef {import('./orderOperationalState.js').OrderOperationalState} OrderOperationalState
 *
 * @typedef {Object} SalesOrderListItemDto
 * @property {string} id
 * @property {string} orderNumber İnsan okunur; demo’da `id` ile aynı olabilir
 * @property {string} customerId
 * @property {string} customerDisplayName
 * @property {string | null} customerPhone
 * @property {OrderChannel} channel
 * @property {string} currency
 * @property {string} placedAt ISO-8601 instant
 * @property {string} [createdAt] ISO-8601 instant — DB oluşturulma (liste sıralama)
 * @property {SalesOrderLifecycleStatus} lifecycleStatus
 * @property {number} version Optimistic concurrency
 * @property {Money} subtotalAmount
 * @property {Money} discountAmount
 * @property {Money} totalAmount
 * @property {Money} amountPaid
 * @property {Money} amountDue
 * @property {Money} remainingAmount
 * @property {number} fulfillmentProgress 0..1 (derived / önbellek)
 * @property {RiskSeverity} currentRiskSeverity
 * @property {string | null} earliestCommittedShipBy YYYY-MM-DD
 * @property {string | null} latestCommittedShipBy YYYY-MM-DD
 * @property {string} lineSummaryTitle Ana satır ürün özeti
 * @property {string} displayStatus UI durum etiketi (mevcut Türkçe status ile uyumlu)
 * @property {string | null} plannedShipmentDate YYYY-MM-DD — list projection
 * @property {string | undefined} salesPerson Satış temsilcisi — list projection
 * @property {Money | null} [lineCostAmount] Maliyet özeti — list projection (Foundation)
 * @property {string | null} [notesSnapshot] Operasyon notu — list projection (Foundation)
 * @property {string} [qtyOrderedTotal] Satır toplamı (derived)
 * @property {string} [qtyShippedTotal] Tamamlanan sevk (derived)
 * @property {string} [remainingQty] Kalan miktar (derived)
 * @property {boolean} [partiallyShipped] Kısmi sevk bayrağı (derived)
 * @property {number} [shipmentSummaryOpenCount] Açık sevk emri sayısı (derived)
 * @property {string | null} [shipmentSummaryNextPlannedDate] Sonraki plan sevk tarihi (derived)
 * @property {boolean} [hasShipmentIssue] Sevk / montaj ISSUE bayrağı (derived)
 * @property {boolean} [installationPending] Teslim edildi, montaj bekliyor (derived)
 * @property {number} [inTransitShipmentCount] Yoldaki sevk sayısı (derived)
 * @property {number} [paymentProgress] 0..1 tahsilat (derived)
 * @property {boolean} [hasOverdueBalance] Pozitif bakiye + termin gecikti (derived)
 * @property {string | null} [lastPaymentAt] Son POSTED CAPTURE anı (derived)
 * @property {boolean} [riskSignalOverduePartialShipment] Termin gecikti ∧ kısmi sevk (derived sinyal)
 * @property {number} [missingItemsCount] Toplam eksik kayıt
 * @property {number} [openMissingItemsCount] RESOLVED dışı eksik kayıt
 * @property {number} [resolvedMissingItemsCount] RESOLVED eksik kayıt
 * @property {number} [missingItemsOpenStatusCount] OPEN durumundaki eksik kayıt (risk)
 * @property {number} [pendingApprovalPaymentCount] Onay bekleyen tahsilat sayısı
 * @property {number} [pendingApprovalPaymentAmount] Onay bekleyen tahsilat tutarı (TRY)
 * @property {number} [pendingMailOrderApprovalCount] Onay bekleyen mail order sayısı
 * @property {boolean} [riskSignalShipmentWithoutReceipt] Sevk var, fiziksel geliş yok (altyapı)
 * @property {boolean} [riskSignalDueDatePendingReceive] Termin baskısı + eksik geliş (altyapı)
 * @property {OrderOperationalState} operationalState Çoklu operasyon katmanları (projection-only)
 */

export {}
