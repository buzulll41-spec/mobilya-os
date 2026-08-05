/** @typedef {import('../contracts/v1/product.js').ProductStockType} ProductStockType */

export const PRODUCT_CATEGORIES = [
  'Yatak odası',
  'Oturma grubu',
  'Yemek odası',
  'Mutfak',
  'Gardırop',
  'Çocuk',
  'Banyo',
  'Aksesuar',
  'Diğer',
]

export const PRODUCT_SUITE_TYPES = ['Tekil', 'Takım', 'Modül', 'Koltuk', 'Masa', 'Dolap']

export const PRODUCT_STOCK_TYPE = /** @type {const} */ ({
  ORDER: 'ORDER',
  STOCK: 'STOCK',
  DISPLAY: 'DISPLAY',
})

/** @type {Record<ProductStockType, string>} */
export const PRODUCT_STOCK_TYPE_LABELS = {
  ORDER: 'Sipariş',
  STOCK: 'Stok',
  DISPLAY: 'Teşhir',
}

/** Satış marjı bu oranın altındaysa kritik düşük kâr */
export const LOW_MARGIN_RATIO_THRESHOLD = 0.15

export const PRODUCT_PAGE_SIZE = 40

/** Katalog seçici — sayfa başına ürün */
export const CATALOG_PICKER_PAGE_SIZE = 20

/** Sol kategori navigasyonu — label (UI) + value (API category) */
export const CATALOG_NAV_CATEGORIES = [
  { key: 'all', label: 'Tümü', value: '' },
  { key: 'oturma', label: 'Oturma Grubu', value: 'Oturma grubu' },
  { key: 'yatak', label: 'Yatak Odası', value: 'Yatak odası' },
  { key: 'yemek', label: 'Yemek Odası', value: 'Yemek odası' },
  { key: 'tv', label: 'TV Üniteleri', value: 'TV ünitesi' },
  { key: 'sehpa', label: 'Sehpalar', value: 'Sehpa' },
  { key: 'genc', label: 'Genç Odası', value: 'Genç odası' },
  { key: 'aksesuar', label: 'Aksesuar', value: 'Aksesuar' },
  { key: 'bahce', label: 'Bahçe Mobilyası', value: 'Bahçe mobilyası' },
]

/** Katalog filtre paneli kategorileri (seed + operasyon) */
export const CATALOG_FILTER_CATEGORIES = [
  'Oturma grubu',
  'Yatak odası',
  'Yemek odası',
  'TV ünitesi',
  'Sehpa',
  'Genç odası',
  'Mutfak',
  'Gardırop',
  'Aksesuar',
  'Bahçe mobilyası',
  'Çocuk',
  'Banyo',
  'Diğer',
]
