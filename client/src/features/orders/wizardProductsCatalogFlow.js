/**
 * Ürünler adımı — katalog modalının otomatik açılması.
 * @param {{ locked?: boolean, hasProducts: boolean, userDismissed: boolean }} input
 */
export function shouldAutoOpenProductsCatalog({ locked = false, hasProducts, userDismissed }) {
  if (locked) return false
  if (hasProducts) return false
  if (userDismissed) return false
  return true
}
