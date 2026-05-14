/**
 * İlk veri yüklemesi veya boş ekran yer tutucusu.
 * @param {{ title?: string; hint?: string }} props
 */
export default function LoadingBlock({ title = 'Veriler yükleniyor', hint = 'Mock API simülasyonu' }) {
  return (
    <div className="mos-loading-block" role="status" aria-live="polite">
      <span className="mos-spinner mos-spinner--surface" aria-hidden />
      <p className="mos-loading-title">{title}</p>
      <p className="mos-loading-hint">{hint}</p>
    </div>
  )
}
