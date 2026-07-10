/**
 * Teknik operasyon kodları → mağaza dili.
 * @param {string} code
 */
export function operationalCodeLabelTr(code) {
  const map = {
    partialShipment: 'Kısmi sevk yapıldı',
    pendingCollection: 'Tahsilat bekleniyor',
    shipment_not_ready: 'Ürünler henüz hazır değil',
    NOT_PLANNED: 'Sevk planı yok',
    PARTIAL: 'Kısmi tahsilat',
    OVERDUE: 'Gecikmiş bakiye',
    READY: 'Sevke hazır',
    IN_PRODUCTION: 'Üretimde',
    shipment_ready: 'Sevk hazır',
    open_missing_ssh: 'Açık SSH kaydı var',
  }
  return map[code] ?? code.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}
