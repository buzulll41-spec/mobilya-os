/** FAZ 111 — telefon/tablet demo test akışı adımları. */

/**
 * @typedef {Object} MobileTestFlowStep
 * @property {string} id
 * @property {string} label
 * @property {string} page
 * @property {string} hint
 * @property {number} order
 */

/** @type {MobileTestFlowStep[]} */
export const MOBILE_TEST_FLOW_STEPS = [
  {
    id: 'create-order',
    order: 1,
    label: 'Sipariş oluştur',
    page: 'orders',
    hint: 'Siparişler ekranında yeni sipariş sihirbazını açın.',
  },
  {
    id: 'deposit',
    order: 2,
    label: 'Kapora al',
    page: 'orders',
    hint: 'Sipariş detayından ödeme sekmesinde kapora kaydedin.',
  },
  {
    id: 'supply',
    order: 3,
    label: 'Tedarik ver',
    page: 'supply-incoming',
    hint: 'Tedarik ekranında bekleyen kalemleri onaylayın.',
  },
  {
    id: 'incoming',
    order: 4,
    label: 'Gelen ürün kaydı',
    page: 'supply-incoming',
    hint: 'Gelen ürün sekmesinde teslim alınan kalemleri işleyin.',
  },
  {
    id: 'ship-plan',
    order: 5,
    label: 'Sevk planla',
    page: 'shipment-ops',
    hint: 'Sevk operasyonunda planlı sevk oluşturun veya güncelleyin.',
  },
  {
    id: 'deliver',
    order: 6,
    label: 'Teslim et',
    page: 'shipment-ops',
    hint: 'Sevk listesinden teslim onayı verin.',
  },
  {
    id: 'collection',
    order: 7,
    label: 'Tahsilat al',
    page: 'collection',
    hint: 'Tahsilat ekranında kalan bakiyeyi tahsil edin.',
  },
  {
    id: 'ceo',
    order: 8,
    label: 'CEO ekranına bak',
    page: 'enterprise-ceo-dashboard',
    hint: 'CEO Dashboard KPI ve uyarıları kontrol edin.',
  },
  {
    id: 'ai-workforce',
    order: 9,
    label: 'AI Workforce kontrol et',
    page: 'digital-workforce',
    hint: 'Digital Workforce ekranında AI çalışan durumlarını inceleyin.',
  },
]
