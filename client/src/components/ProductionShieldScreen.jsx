/**
 * Production Shield hata ekranı — startup guard başarısız olduğunda gösterilir.
 * Beyaz ekran / sonsuz loading / otomatik mock fallback OLUŞMAZ.
 * Mevcut hata paneli sınıflarını kullanır (yeni tasarım sistemi eklenmez).
 * Teknik ayrıntı kullanıcıya gösterilmez; kontrollü log'a yazılır.
 *
 * @param {{ onRetry: () => void }} props
 */
export default function ProductionShieldScreen({ onRetry }) {
  return (
    <div className="mos-api-error mos-api-timeout-panel" style={{ margin: '2rem' }} role="alert">
      <h2 className="mos-api-timeout-panel__title">Sistem güvenli şekilde durduruldu</h2>
      <p className="mos-api-error-text mos-api-timeout-panel__body">
        Production veri kaynağı yapılandırılmamış. Sistem güvenli şekilde durduruldu.
      </p>
      <button type="button" className="mos-btn mos-btn-primary mos-btn-sm" onClick={onRetry}>
        Yeniden dene
      </button>
    </div>
  )
}
