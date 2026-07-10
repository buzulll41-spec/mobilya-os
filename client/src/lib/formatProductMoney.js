/**
 * Ürün fiyat / maliyet gösterimi — standart TL formatı: 12.500,00 ₺
 * @param {string | number | null | undefined} amount
 */
export function formatProductMoney(amount) {
  const raw = String(amount ?? '').trim().replace(/\s/g, '').replace(',', '.')
  const n = Number.parseFloat(raw)
  if (!Number.isFinite(n)) return '—'
  return `${new Intl.NumberFormat('tr-TR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(n)} ₺`
}
