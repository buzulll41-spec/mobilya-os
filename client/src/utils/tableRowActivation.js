/**
 * Sipariş satırına tıklanınca detay açma — tablo `<tr>` için ortak props.
 * @template T
 * @param {T} row
 * @param {((item: T) => void) | undefined} onSelect
 */
export function tableRowActivationProps(row, onSelect) {
  if (!onSelect) return {}
  return {
    className: 'mos-tr-click',
    tabIndex: 0,
    role: 'button',
    onClick: () => onSelect(row),
    onKeyDown: (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(row)
      }
    },
  }
}
