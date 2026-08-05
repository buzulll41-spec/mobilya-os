/** @typedef {'SIMPLE' | 'VARIABLE' | 'SET'} ProductType */

export const PRODUCT_TYPE = /** @type {const} */ ({
  SIMPLE: 'SIMPLE',
  VARIABLE: 'VARIABLE',
  SET: 'SET',
})

/** @type {Record<ProductType, string>} */
export const PRODUCT_TYPE_LABELS = {
  SIMPLE: 'Basit',
  VARIABLE: 'Varyantlı',
  SET: 'Takım / Set',
}

export const ASSEMBLY_TYPE_OPTIONS = [
  'Fabrika montajlı',
  'Flat-pack',
  'Saha montajı',
]

export const COATING_TYPE_OPTIONS = ['Lake', 'Melamin', 'Doğal ceviz', 'Mat boya']

export const MECHANISM_TYPE_OPTIONS = ['Soft-close', 'Push-open', 'Sabit', 'Yatay sürgü']
