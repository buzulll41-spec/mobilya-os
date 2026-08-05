/** @param {string | null | undefined} fullName */
export function initialsFrom(fullName) {
  const raw = String(fullName || '').trim()
  if (!raw) return 'MO'
  const parts = raw.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
}

/** @param {import('../../contracts/v1/user.js').UserRole | undefined | null} role */
export function roleLabel(role) {
  if (role === 'MANAGER') return 'Magaza Muduru'
  if (role === 'SALES') return 'Satis Uzmani'
  if (role === 'OPERATION') return 'Operasyon Uzmani'
  if (role === 'SERVICE') return 'Servis Uzmani'
  if (role === 'FINANCE') return 'Finans Uzmani'
  if (role === 'WAREHOUSE') return 'Depo Uzmani'
  if (role === 'ADMIN') return 'Yonetici'
  return 'Operasyon Uzmani'
}
