/** UI/API için gizli anahtar maskeleme — log veya tam değer döndürme. */
export function maskSecret(value: string | null | undefined): string {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return '—'
  if (trimmed.length <= 4) return '••••'
  return `${trimmed.slice(0, 4)}${'•'.repeat(Math.min(8, trimmed.length - 4))}`
}

/** Formdan gelen maskeli değer mi (mevcut secret korunacak)? */
export function isMaskedSecretInput(value: string | null | undefined): boolean {
  const trimmed = (value ?? '').trim()
  if (!trimmed) return true
  return trimmed.includes('•') || trimmed === '********'
}
