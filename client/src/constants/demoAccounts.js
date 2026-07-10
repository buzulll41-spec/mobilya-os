/** Demo giriş hesapları — login ekranı yardım metni. */

/** @typedef {{ email: string; password: string; label: string }} DemoAccountHint */

/** @type {DemoAccountHint[]} */
export const DEMO_ACCOUNT_HINTS = [
  { email: 'admin@mobilya.local', password: 'admin123', label: 'Admin' },
  { email: 'manager@mobilya.local', password: 'manager123', label: 'Müdür' },
  { email: 'sales@mobilya.local', password: 'sales123', label: 'Satış' },
  { email: 'ops@mobilya.local', password: 'ops123', label: 'Operasyon' },
  { email: 'service@mobilya.local', password: 'service123', label: 'Servis' },
  { email: 'finance@mobilya.local', password: 'finance123', label: 'Finans' },
]

/** @returns {string} */
export function formatDemoAccountsHint() {
  return DEMO_ACCOUNT_HINTS.map((a) => `${a.email} / ${a.password}`).join(' · ')
}
