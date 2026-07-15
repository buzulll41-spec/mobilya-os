import { createPortal } from 'react-dom'
import { useEffect, useState } from 'react'

import { IconClose } from '../../components/Icons.jsx'
import MobileAccordionSection from '../../components/mobile/MobileAccordionSection.jsx'
import { MISSING_ITEM_STATUS } from '../../contracts/v1/missingItemStatuses.js'
import '../../styles/ssh-mobile-edition.css'

const RESPONSIBLE_OPTIONS = ['Servis Ekibi', 'Montaj Ekibi', 'Depo', 'Operasyon', 'Satış Sonrası']
const STATUS_OPTIONS = [
  { value: MISSING_ITEM_STATUS.OPEN, label: 'Açık' },
  { value: MISSING_ITEM_STATUS.ORDERED, label: 'Sipariş verildi' },
  { value: MISSING_ITEM_STATUS.ARRIVED, label: 'Parça geldi' },
  { value: MISSING_ITEM_STATUS.READY_FOR_SHIPMENT, label: 'Sevke hazır' },
  { value: MISSING_ITEM_STATUS.RESOLVED, label: 'Kapatıldı' },
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
export default function SshMobileActionSheet({
  open,
  card,
  detail,
  saving,
  error,
  onClose,
  onSave,
}) {
  const [openSection, setOpenSection] = useState('parts')
  const [category, setCategory] = useState('')
  const [note, setNote] = useState('')
  const [attachmentName, setAttachmentName] = useState('')
  const [responsiblePerson, setResponsiblePerson] = useState('Servis Ekibi')
  const [plannedDate, setPlannedDate] = useState('2026-05-14')
  const [status, setStatus] = useState(MISSING_ITEM_STATUS.OPEN)

  useSheetLifecycle(open, onClose)

  useEffect(() => {
    if (!open || !card) return
    setOpenSection('parts')
    setCategory(detail?.reason?.trim() || card.partTitle || 'SSH kaydı')
    setNote(detail?.supplierNote?.trim() || card.responsibleNote || '')
    setAttachmentName('')
    setResponsiblePerson('Servis Ekibi')
    setPlannedDate(detail?.createdAt?.slice(0, 10) || '2026-05-14')
    setStatus(detail?.status || card.wireStatus || MISSING_ITEM_STATUS.OPEN)
  }, [open, card, detail])

  if (!open || !card) return null

  const rawPhone = typeof card.customerPhone === 'string' ? card.customerPhone : ''
  const digits = rawPhone.replace(/\D/g, '')
  const normalizedPhone = digits.length < 10 ? null : digits.startsWith('90') ? digits : digits.startsWith('0') ? `90${digits.slice(1)}` : `90${digits}`
  const callHref = normalizedPhone ? `tel:+${normalizedPhone}` : null
  const whatsappHref = normalizedPhone ? `https://wa.me/${normalizedPhone}` : null

  async function submitStatus(nextStatus = status) {
    await onSave({
      status: nextStatus,
      supplierNote: note,
      resolutionNote: nextStatus === MISSING_ITEM_STATUS.RESOLVED ? note || 'Mobil SSH kapatma notu' : undefined,
      responsiblePerson,
      plannedDate,
      attachmentName,
    })
  }

  return createPortal(
    <div className="ssh-mobile-sheet" role="dialog" aria-modal="true" aria-labelledby="ssh-mobile-sheet-title">
      <button type="button" className="ssh-mobile-sheet__backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="ssh-mobile-sheet__panel">
        <header className="ssh-mobile-sheet__head">
          <div>
            <p className="ssh-mobile-sheet__eyebrow">SSH kartı</p>
            <h2 id="ssh-mobile-sheet-title" className="ssh-mobile-sheet__title">{card.customer}</h2>
            <p className="ssh-mobile-sheet__sub">{card.orderNumber} · {card.statusLabel}</p>
          </div>
          <button type="button" className="ssh-mobile-sheet__close" aria-label="Kapat" onClick={onClose}>
            <IconClose />
          </button>
        </header>

        <div className="ssh-mobile-sheet__body">
          <section className="ssh-mobile-sheet__accordion mos-mobile-accordion" aria-label="Eksik parça mobil detay">
            <MobileAccordionSection id="parts" label="1. Eksik parçalar" open={openSection === 'parts'} onOpen={setOpenSection}>
              <div className="ssh-mobile-sheet__grid">
                <article><span>Sipariş no</span><strong>{card.orderNumber}</strong></article>
                <article><span>Müşteri</span><strong>{card.customer}</strong></article>
                <article><span>Parça türü</span><strong>{category || card.partTitle}</strong></article>
                <article><span>Eksik parça sayısı</span><strong>{card.openCountOnOrder}</strong></article>
              </div>
            </MobileAccordionSection>

            <MobileAccordionSection id="eta" label="2. Beklenen tedarik tarihi" open={openSection === 'eta'} onOpen={setOpenSection}>
              <label className="ssh-mobile-sheet__field">
                <span>Tarih</span>
                <input type="date" value={plannedDate} onChange={(event) => setPlannedDate(event.target.value)} />
              </label>
            </MobileAccordionSection>

            <MobileAccordionSection id="supplier" label="3. Tedarikçi bilgisi" open={openSection === 'supplier'} onOpen={setOpenSection}>
              <label className="ssh-mobile-sheet__field">
                <span>Sorumlu</span>
                <select value={responsiblePerson} onChange={(event) => setResponsiblePerson(event.target.value)}>
                  {RESPONSIBLE_OPTIONS.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>
            </MobileAccordionSection>

            <MobileAccordionSection id="notes" label="4. Notlar" open={openSection === 'notes'} onOpen={setOpenSection}>
              <label className="ssh-mobile-sheet__field">
                <span>Parça türü</span>
                <input value={category} onChange={(event) => setCategory(event.target.value)} placeholder="Eksik parça / hasar / servis" />
              </label>
              <label className="ssh-mobile-sheet__field">
                <span>Not</span>
                <textarea rows={5} value={note} onChange={(event) => setNote(event.target.value)} placeholder="Müşteri açıklaması, tedarik notu, servis detayı…" />
              </label>
            </MobileAccordionSection>

            <MobileAccordionSection id="photos" label="5. Fotoğraflar" open={openSection === 'photos'} onOpen={setOpenSection}>
              <label className="ssh-mobile-sheet__field">
                <span>Dosya adı</span>
                <input value={attachmentName} onChange={(event) => setAttachmentName(event.target.value)} placeholder="örn. hasar-fotograf.jpg" />
              </label>
              <p className="ssh-mobile-sheet__hint">Belge alanı mobil akışta tutulur; kayıt notuna eşlik eder.</p>
            </MobileAccordionSection>

            <MobileAccordionSection id="history" label="6. Hareket geçmişi" open={openSection === 'history'} onOpen={setOpenSection}>
              <div className="ssh-mobile-sheet__grid">
                <article><span>Öncelik</span><strong>{card.locksShipment ? 'Kritik' : 'Normal'}</strong></article>
                <article><span>Durum</span><strong>{card.statusLabel}</strong></article>
                <article><span>Son güncelleme</span><strong>{card.openingDateLabel}</strong></article>
                <article><span>Beklenen tedarik</span><strong>{card.estimatedArrivalLabel}</strong></article>
              </div>
              <label className="ssh-mobile-sheet__field">
                <span>Durum</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)}>
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </label>
              {error ? <p className="ssh-mobile-sheet__error" role="alert">{error}</p> : null}
            </MobileAccordionSection>
          </section>
        </div>

        <footer className="ssh-mobile-sheet__footer">
          {callHref ? (
            <a className="ssh-mobile-sheet__action" href={callHref}>Ara</a>
          ) : (
            <button type="button" className="ssh-mobile-sheet__action" disabled>Ara</button>
          )}
          {whatsappHref ? (
            <a className="ssh-mobile-sheet__action" href={whatsappHref} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          ) : (
            <button type="button" className="ssh-mobile-sheet__action" disabled>WhatsApp</button>
          )}
          <button type="button" className="ssh-mobile-sheet__action" onClick={() => setOpenSection('photos')}>Fotoğraf</button>
          <button type="button" className="ssh-mobile-sheet__action ssh-mobile-sheet__action--primary" onClick={() => void submitStatus(MISSING_ITEM_STATUS.ARRIVED)} disabled={saving}>
            {saving ? 'Kaydediliyor…' : 'Parça Geldi'}
          </button>
          <button type="button" className="ssh-mobile-sheet__action ssh-mobile-sheet__action--danger" onClick={() => void submitStatus(MISSING_ITEM_STATUS.RESOLVED)} disabled={saving}>
            Kapat
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  )
}
