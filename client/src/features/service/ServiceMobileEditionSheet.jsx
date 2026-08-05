import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

import { IconClose } from '../../components/Icons.jsx'
import MobileAccordionSection from '../../components/mobile/MobileAccordionSection.jsx'
import { MISSING_ITEM_STATUS } from '../../contracts/v1/missingItemStatuses.js'
import '../../styles/service-mobile-edition.css'

const PERSONNEL_OPTIONS = ['Servis Ekibi', 'Montaj Ekibi', 'Depo', 'Operasyon', 'Satış Sonrası']
const STATUS_OPTIONS = [
  { value: MISSING_ITEM_STATUS.OPEN, label: 'Açık' },
  { value: MISSING_ITEM_STATUS.ORDERED, label: 'Sipariş verildi' },
  { value: MISSING_ITEM_STATUS.ARRIVED, label: 'Parça geldi' },
  { value: MISSING_ITEM_STATUS.READY_FOR_SHIPMENT, label: 'Sevke hazır' },
  { value: MISSING_ITEM_STATUS.RESOLVED, label: 'Tamamlandı' },
]

/**
 * @param {boolean} open
 * @param {() => void} onClose
 */
function useSheetLifecycle(open, onClose) {
  useEffect(() => {
    if (!open) return
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previousOverflow
    }
  }, [open])
}

/**
 * @param {string | undefined} phone
 */
function buildPhoneDialHref(phone) {
  const raw = String(phone ?? '').trim()
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10) return null
  if (digits.startsWith('90')) return `tel:+${digits}`
  if (digits.startsWith('0')) return `tel:+90${digits.slice(1)}`
  return `tel:+90${digits}`
}

/**
 * @param {string | undefined} phone
 */
function buildWhatsappHref(phone) {
  const raw = String(phone ?? '').trim()
  if (!raw) return null
  const digits = raw.replace(/\D/g, '')
  if (digits.length < 10) return null
  if (digits.startsWith('90')) return `https://wa.me/${digits}`
  if (digits.startsWith('0')) return `https://wa.me/90${digits.slice(1)}`
  return `https://wa.me/90${digits}`
}

/**
 * @param {{
 *   open: boolean
 *   card: import('../../mappers/ssh/sshMissingPartsModel.js').SshMissingPartCard | null
 *   detail: import('../../contracts/v1/missingItem.js').MissingItemDto | null
 *   saving: boolean
 *   error: string | null
 *   onClose: () => void
 *   onSave: (payload: {
 *     status: string
 *     supplierNote: string
 *     resolutionNote?: string
 *     responsiblePerson: string
 *     plannedDate: string
 *     attachmentName: string
 *   }) => Promise<void>
 * }} props
 */
export default function ServiceMobileEditionSheet({
  open,
  card,
  detail,
  saving,
  error,
  onClose,
  onSave,
}) {
  const [activeSection, setActiveSection] = useState('summary')
  const [missingPartName, setMissingPartName] = useState('')
  const [quantity, setQuantity] = useState('1')
  const [description, setDescription] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [supplierName, setSupplierName] = useState('Servis Ekibi')
  const [expectedDate, setExpectedDate] = useState('2026-05-14')
  const [status, setStatus] = useState(MISSING_ITEM_STATUS.OPEN)

  useSheetLifecycle(open, onClose)

  useEffect(() => {
    if (!open || !card) return
    setActiveSection('summary')
    setMissingPartName(card.partTitle || detail?.reason?.trim() || 'Eksik parça kaydı')
    setQuantity(detail?.quantity?.toString().trim() || '1')
    setDescription(detail?.reason?.trim() || card.sshTypeLabel || '')
    setAttachmentName('')
    setSupplierName((detail?.supplierNote?.split('·')[0] || 'Servis Ekibi').trim())
    setExpectedDate(detail?.createdAt?.slice(0, 10) || '2026-05-14')
    setStatus(detail?.status || card.wireStatus || MISSING_ITEM_STATUS.OPEN)
  }, [open, card, detail])

  if (!open || !card) return null

  const phoneDialHref = buildPhoneDialHref(card.customerPhone)
  const whatsappHref = buildWhatsappHref(card.customerPhone)

  async function submitStatus(nextStatus = status) {
    const noteBody = [
      `Parça: ${missingPartName || card.partTitle}`,
      `Adet: ${quantity || card.quantityLabel || '1'}`,
      description ? `Açıklama: ${description}` : null,
    ].filter(Boolean).join(' | ')

    await onSave({
      status: nextStatus,
      supplierNote: noteBody,
      resolutionNote:
        nextStatus === MISSING_ITEM_STATUS.RESOLVED
          ? noteBody || 'Mobil servis kapanış notu'
          : undefined,
      responsiblePerson: supplierName,
      plannedDate: expectedDate,
      attachmentName,
    })
  }

  return createPortal(
    <div className="service-mobile-sheet" role="dialog" aria-modal="true" aria-labelledby="service-mobile-sheet-title">
      <button type="button" className="service-mobile-sheet__backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="service-mobile-sheet__panel">
        <header className="service-mobile-sheet__head">
          <div>
            <p className="service-mobile-sheet__eyebrow">Eksik Parça kartı</p>
            <h2 id="service-mobile-sheet-title" className="service-mobile-sheet__title">{card.customer}</h2>
            <p className="service-mobile-sheet__sub">{card.orderNumber} · {card.statusLabel}</p>
          </div>
          <button type="button" className="service-mobile-sheet__close" aria-label="Kapat" onClick={onClose}>
            <IconClose />
          </button>
        </header>

        <div className="service-mobile-sheet__body">
          <section className="service-mobile-sheet__accordion mos-mobile-accordion" aria-label="Servis mobil detayları">
            <MobileAccordionSection id="summary" label="1. Servis özeti" open={activeSection === 'summary'} onOpen={setActiveSection}>
              <div className="service-mobile-sheet__grid">
                <article><span>Müşteri</span><strong>{card.customer}</strong></article>
                <article><span>Sipariş no</span><strong>{card.orderNumber}</strong></article>
                <article><span>Servis türü</span><strong>{card.sshTypeLabel}</strong></article>
                <article><span>Açılış tarihi</span><strong>{card.openingDateLabel}</strong></article>
                <article><span>Öncelik</span><strong>{card.locksShipment ? 'Kritik' : 'Normal'}</strong></article>
                <article><span>Sorumlu personel</span><strong>{supplierName || 'Belirlenmedi'}</strong></article>
                <article><span>Planlanan tarih</span><strong>{expectedDate || card.estimatedArrivalLabel || '—'}</strong></article>
                <article><span>Durum</span><strong>{card.statusLabel}</strong></article>
              </div>
            </MobileAccordionSection>

            <MobileAccordionSection id="issue" label="2. Sorun ve açıklama" open={activeSection === 'issue'} onOpen={setActiveSection}>
              <label className="service-mobile-sheet__field">
                <span>Sorun başlığı</span>
                <input
                  value={missingPartName}
                  onChange={(event) => setMissingPartName(event.target.value)}
                  placeholder="Örn. Eksik aparat"
                />
              </label>
              <label className="service-mobile-sheet__field">
                <span>Açıklama</span>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Eksik parçanın detayını yazın"
                />
              </label>
            </MobileAccordionSection>

            <MobileAccordionSection id="media" label="3. Fotoğraf / belge" open={activeSection === 'media'} onOpen={setActiveSection}>
              <label className="service-mobile-sheet__field">
                <span>Dosya adı</span>
                <input
                  value={attachmentName}
                  onChange={(event) => setAttachmentName(event.target.value)}
                  placeholder="örn. servis-fotograf.jpg"
                />
              </label>
            </MobileAccordionSection>

            <MobileAccordionSection id="part" label="4. Eksik parça bilgisi" open={activeSection === 'part'} onOpen={setActiveSection}>
              <label className="service-mobile-sheet__field">
                <span>Eksik parça</span>
                <input
                  value={missingPartName}
                  onChange={(event) => setMissingPartName(event.target.value)}
                  placeholder="Örn. Kol dayama modülü"
                />
              </label>
              <label className="service-mobile-sheet__field">
                <span>Adet</span>
                <input
                  value={quantity}
                  onChange={(event) => setQuantity(event.target.value)}
                  inputMode="numeric"
                  placeholder="Örn. 2"
                />
              </label>
            </MobileAccordionSection>

            <MobileAccordionSection id="plan" label="5. Personel ve planlanan tarih" open={activeSection === 'plan'} onOpen={setActiveSection}>
              <label className="service-mobile-sheet__field">
                <span>Sorumlu personel</span>
                <select value={supplierName} onChange={(event) => setSupplierName(event.target.value)}>
                  {PERSONNEL_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
              <label className="service-mobile-sheet__field">
                <span>Planlanan tarih</span>
                <input type="date" value={expectedDate} onChange={(event) => setExpectedDate(event.target.value)} />
              </label>
            </MobileAccordionSection>

            <MobileAccordionSection id="history" label="6. İşlem geçmişi" open={activeSection === 'history'} onOpen={setActiveSection}>
              <div className="service-mobile-sheet__grid">
                <article><span>Açılış</span><strong>{card.openingDateLabel}</strong></article>
                <article><span>Son durum</span><strong>{card.statusLabel}</strong></article>
                <article><span>Tedarik notu</span><strong>{card.responsibleNote || '—'}</strong></article>
                <article><span>Risk</span><strong>{card.riskLabel}</strong></article>
              </div>
            </MobileAccordionSection>

            <MobileAccordionSection id="status" label="7. Durum güncelleme" open={activeSection === 'status'} onOpen={setActiveSection}>
              <label className="service-mobile-sheet__field">
                <span>Durum</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="service-mobile-sheet__inline-save"
                disabled={saving}
                onClick={() => void submitStatus(status)}
              >
                {saving ? 'Kaydediliyor...' : 'Durumu kaydet'}
              </button>
              {error ? <p className="service-mobile-sheet__error" role="alert">{error}</p> : null}
            </MobileAccordionSection>

            <MobileAccordionSection id="close" label="8. Servisi kapat" open={activeSection === 'close'} onOpen={setActiveSection}>
              <p className="service-mobile-sheet__hint">Bu adım kaydı Tamamlandı durumuna geçirir.</p>
              <button
                type="button"
                className="service-mobile-sheet__inline-close"
                disabled={saving}
                onClick={() => void submitStatus(MISSING_ITEM_STATUS.RESOLVED)}
              >
                {saving ? 'Kapatılıyor...' : 'Servisi kapat'}
              </button>
              {error ? <p className="service-mobile-sheet__error" role="alert">{error}</p> : null}
            </MobileAccordionSection>
          </section>
        </div>

        <footer className="service-mobile-sheet__footer">
          {phoneDialHref ? (
            <a className="service-mobile-sheet__action" href={phoneDialHref}>Ara</a>
          ) : (
            <button type="button" className="service-mobile-sheet__action" disabled>Ara</button>
          )}

          {whatsappHref ? (
            <a className="service-mobile-sheet__action" href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          ) : (
            <button type="button" className="service-mobile-sheet__action" disabled>WhatsApp</button>
          )}

          <button type="button" className="service-mobile-sheet__action" onClick={() => setActiveSection('media')}>
            Fotoğraf
          </button>

          <button
            type="button"
            className="service-mobile-sheet__action service-mobile-sheet__action--primary"
            disabled={saving}
            onClick={() => void submitStatus(status)}
          >
            {saving ? 'Kaydediliyor...' : 'Durum Güncelle'}
          </button>

          <button
            type="button"
            className="service-mobile-sheet__action service-mobile-sheet__action--danger"
            disabled={saving}
            onClick={() => void submitStatus(MISSING_ITEM_STATUS.RESOLVED)}
          >
            Kapat
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
