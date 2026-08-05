/** @typedef {import('../contracts/v1/productMaster.js').ProductMasterVariantDto} ProductMasterVariantDto */

export const VARIANT_STOCK_STATUS = /** @type {const} */ ({
  IN_STOCK: 'IN_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  ON_ORDER: 'ON_ORDER',
  LOW_STOCK: 'LOW_STOCK',
})

/** @type {Record<keyof typeof VARIANT_STOCK_STATUS, string>} */
export const VARIANT_STOCK_STATUS_LABELS = {
  IN_STOCK: 'Stokta',
  OUT_OF_STOCK: 'Stok yok',
  ON_ORDER: 'Sipariş üzerine',
  LOW_STOCK: 'Düşük stok',
}

/**
 * @param {string} [productCode]
 */
export function emptyVariantForm(productCode = '') {
  return {
    variantCode: productCode ? `${productCode}-` : '',
    name: '',
    barcode: '',
    salePrice: '',
    purchasePrice: '',
    stockQuantity: '0',
    stockStatus: VARIANT_STOCK_STATUS.IN_STOCK,
    color: '',
    fabric: '',
    sizeLabel: '',
    isDefault: false,
  }
}

/**
 * @param {ProductMasterVariantDto} variant
 */
export function variantToForm(variant) {
  return {
    variantCode: variant.variantCode ?? variant.code ?? '',
    name: variant.name ?? variant.label ?? '',
    barcode: variant.barcode ?? '',
    salePrice: variant.salePrice?.replace(/[^\d.-]/g, '') ?? '',
    purchasePrice: variant.purchasePrice?.replace(/[^\d.-]/g, '') ?? '',
    stockQuantity: variant.stockQuantity != null ? String(variant.stockQuantity) : '0',
    stockStatus: variant.stockStatus ?? VARIANT_STOCK_STATUS.IN_STOCK,
    color: variant.color ?? '',
    fabric: variant.fabric ?? '',
    sizeLabel: variant.sizeLabel ?? '',
    isDefault: Boolean(variant.isDefault),
  }
}

/**
 * @param {ReturnType<typeof emptyVariantForm>} form
 */
export function buildVariantWritePayload(form) {
  const parseNum = (v) => {
    if (v === '' || v == null) return undefined
    const n = Number(String(v).replace(/[^\d.-]/g, ''))
    return Number.isFinite(n) ? n : undefined
  }
  const parseIntVal = (v) => {
    if (v === '' || v == null) return undefined
    const n = Number.parseInt(String(v), 10)
    return Number.isFinite(n) ? n : undefined
  }

  return {
    variantCode: form.variantCode.trim(),
    name: form.name.trim(),
    ...(form.barcode.trim() ? { barcode: form.barcode.trim() } : {}),
    ...(parseNum(form.salePrice) !== undefined ? { salePrice: parseNum(form.salePrice) } : {}),
    ...(parseNum(form.purchasePrice) !== undefined
      ? { purchasePrice: parseNum(form.purchasePrice) }
      : {}),
    ...(parseIntVal(form.stockQuantity) !== undefined
      ? { stockQuantity: parseIntVal(form.stockQuantity) }
      : {}),
    ...(form.stockStatus ? { stockStatus: form.stockStatus } : {}),
    ...(form.color.trim() ? { color: form.color.trim() } : {}),
    ...(form.fabric.trim() ? { fabric: form.fabric.trim() } : {}),
    ...(form.sizeLabel.trim() ? { sizeLabel: form.sizeLabel.trim() } : {}),
    isDefault: Boolean(form.isDefault),
  }
}
