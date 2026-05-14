export function formatShortDate(iso) {
  if (!iso) return '—'
  return new Date(iso + 'T12:00:00').toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'short',
  })
}
