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
] as const

export const PRODUCT_SUITE_TYPES = ['Tekil', 'Takım', 'Modül', 'Koltuk', 'Masa', 'Dolap'] as const

/** Satış marjı bu oranın altındaysa “kritik düşük kâr” */
export const LOW_MARGIN_RATIO_THRESHOLD = 0.15
