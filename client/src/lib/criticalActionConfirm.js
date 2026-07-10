/**
 * Kritik işlemlerde kullanıcı onayı.
 * @param {{ title: string, message: string, confirmLabel?: string, cancelLabel?: string }} input
 * @returns {Promise<boolean>}
 */
export async function confirmCriticalAction(input) {
  const { title, message, confirmLabel = 'Onayla', cancelLabel = 'Vazgeç' } = input
  const text = `${title}\n\n${message}`
  if (typeof window !== 'undefined' && typeof window.confirm === 'function') {
    return window.confirm(`${text}\n\n[${confirmLabel} / ${cancelLabel}]`)
  }
  return false
}

/**
 * @param {string} actionLabel
 * @param {string} [detail]
 */
export function confirmDestructiveAction(actionLabel, detail) {
  return confirmCriticalAction({
    title: `${actionLabel} — emin misiniz?`,
    message: detail ?? 'Bu işlem geri alınamaz olabilir.',
    confirmLabel: 'Evet, devam et',
    cancelLabel: 'Vazgeç',
  })
}
