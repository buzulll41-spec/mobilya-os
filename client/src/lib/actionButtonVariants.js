/** @typedef {'primary' | 'success' | 'warning' | 'danger' | 'info'} ActionButtonTone */
/** @typedef {'head' | 'detail' | 'table' | 'modal' | 'inline'} MosButtonContext */

/** PRIMARY — Mavi */
const PRIMARY_RE =
  /kaydet|yeni|oluştur|giriş yap|sevk oluştur|sipariş oluştur|sipariş ekle|ekle|gelen ürün|ödeme kaydı|kaydet ve|aktifleştir|ürün ekle|yeni ürün|yeni tedarikçi|kayıt|^planla$|sevk planla/

/** SUCCESS — Yeşil */
const SUCCESS_RE =
  /onayla|tahsilat alındı|tamamlandı|ödeme al|tahsilat kaydet|tahsil|ödemeyi kaydet|ödeme gir|teslim edildi|teslim et/

/** WARNING — Turuncu (operasyon — sevk ekranında kullanılmaz) */
const WARNING_RE =
  /düzenle|beklet|sevkiyat|montaj|yükle|sevk operasyonu|yönet|makbuz|kopyala/

/** DANGER — Kırmızı */
const DANGER_RE =
  /^(sil|iptal|vazgeç|reddet|kapat)$|pasifleştir|pasife al|kaldır|teslim edilemedi|iptal et/

/** INFO — Lacivert */
const INFO_RE =
  /^(detay|görüntüle|aç|gör|siparişi aç|geri|listeye dön|yola çıktı|erte)$/

/**
 * FAZ 16A — Aksiyon etiketine göre standart ton.
 *
 * @param {string | null | undefined} label
 * @returns {ActionButtonTone}
 */
export function resolveActionButtonVariant(label) {
  const text = String(label ?? '').trim().toLocaleLowerCase('tr-TR')
  if (!text) return 'info'
  if (DANGER_RE.test(text)) return 'danger'
  if (SUCCESS_RE.test(text)) return 'success'
  if (WARNING_RE.test(text)) return 'warning'
  if (PRIMARY_RE.test(text)) return 'primary'
  if (INFO_RE.test(text)) return 'info'
  return 'info'
}

/**
 * @param {ActionButtonTone} tone
 */
function toneSuffix(tone) {
  return `--${tone}`
}

/**
 * @param {MosButtonContext} context
 * @param {string | null | undefined} label
 * @param {ActionButtonTone} [tone]
 * @param {string} [extra]
 */
export function mosButtonClass(context, label, tone, extra = '') {
  const variant = tone ?? resolveActionButtonVariant(label)
  const suffix = toneSuffix(variant)

  if (context === 'detail') {
    return ['mos-erp-detail__action', `mos-erp-detail__action${suffix}`, extra].filter(Boolean).join(' ')
  }
  if (context === 'table') {
    return ['mos-erp-tbl-op', `mos-erp-tbl-op${suffix}`, extra].filter(Boolean).join(' ')
  }
  return ['mos-erp-ops__btn', `mos-erp-ops__btn${suffix}`, extra].filter(Boolean).join(' ')
}

/** @deprecated Use mosButtonClass('head', label, tone, extra) */
export function erpOpsButtonClass(label, extra = '') {
  return mosButtonClass('head', label, undefined, extra)
}

/** @deprecated Use mosButtonClass('detail', label, tone, extra) */
export function erpDetailActionClass(label, extra = '') {
  return mosButtonClass('detail', label, undefined, extra)
}

/** @deprecated Use mosButtonClass('table', label, tone, extra) */
export function erpTableOpClass(label, extra = '') {
  return mosButtonClass('table', label, undefined, extra)
}
