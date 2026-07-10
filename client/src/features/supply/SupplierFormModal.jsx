import { useState } from 'react'
import { useModalDismiss } from '../../hooks/useModalDismiss.js'
import { erpOpsButtonClass } from '../../lib/actionButtonVariants.js'

/** @typedef {import('../../contracts/v1/supplier.js').CreateSupplierRequest} CreateSupplierRequest */

/**
 * @param {{
 *   open: boolean
 *   saving?: boolean
 *   error?: string | null
 *   onClose: () => void
 *   onSubmit: (body: CreateSupplierRequest) => Promise<void>
 * }} props
 */
export default function SupplierFormModal({ open, saving, error, onClose, onSubmit }) {
  const [companyName, setCompanyName] = useState('')
  const [code, setCode] = useState('')
  const [contactName, setContactName] = useState('')
  const [phone, setPhone] = useState('')
  const [iban, setIban] = useState('')
  const [taxNumber, setTaxNumber] = useState('')
  const [taxOffice, setTaxOffice] = useState('')
  const [address, setAddress] = useState('')

  useModalDismiss(open, onClose)

  if (!open) return null

  async function handleSubmit(e) {
    e.preventDefault()
    /** @type {CreateSupplierRequest} */
    const body = {
      companyName: companyName.trim(),
      ...(code.trim() ? { code: code.trim() } : {}),
      ...(contactName.trim() ? { contactName: contactName.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
      ...(iban.trim() ? { iban: iban.trim() } : {}),
      ...(taxNumber.trim() ? { taxNumber: taxNumber.trim() } : {}),
      ...(taxOffice.trim() ? { taxOffice: taxOffice.trim() } : {}),
      ...(address.trim() ? { address: address.trim() } : {}),
    }
    await onSubmit(body)
    setCompanyName('')
    setCode('')
    setContactName('')
    setPhone('')
    setIban('')
    setTaxNumber('')
    setTaxOffice('')
    setAddress('')
  }

  return (
    <div className="mos-modal-root" role="presentation">
      <button type="button" className="mos-modal-backdrop" aria-label="Kapat" onClick={onClose} />
      <div className="mos-modal mos-modal--v1" role="dialog" aria-modal="true" aria-labelledby="supplier-form-title">
        <header className="mos-modal-head">
          <h2 id="supplier-form-title" className="mos-modal-title">
            Yeni tedarikçi
          </h2>
          <button type="button" className="mos-modal-x" onClick={onClose} aria-label="Kapat">
            ×
          </button>
        </header>
        <form className="mos-modal-form mos-modal-body mos-erp-modal-form" onSubmit={(e) => void handleSubmit(e)}>
          {error ? (
            <div className="mos-form-toast mos-form-toast--error" role="alert">
              {error}
            </div>
          ) : null}
          <label className="mos-field">
            <span className="mos-field-label">Firma adı *</span>
            <input
              className="mos-input"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              required
              disabled={saving}
            />
          </label>
          <label className="mos-field">
            <span className="mos-field-label">Kısa kod</span>
            <input className="mos-input" value={code} onChange={(e) => setCode(e.target.value)} disabled={saving} />
          </label>
          <div className="mos-erp-modal-row">
            <label className="mos-field">
              <span className="mos-field-label">Yetkili</span>
              <input
                className="mos-input"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="mos-field">
              <span className="mos-field-label">Telefon</span>
              <input className="mos-input" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={saving} />
            </label>
          </div>
          <label className="mos-field">
            <span className="mos-field-label">IBAN</span>
            <input className="mos-input" value={iban} onChange={(e) => setIban(e.target.value)} disabled={saving} />
          </label>
          <div className="mos-erp-modal-row">
            <label className="mos-field">
              <span className="mos-field-label">Vergi no</span>
              <input
                className="mos-input"
                value={taxNumber}
                onChange={(e) => setTaxNumber(e.target.value)}
                disabled={saving}
              />
            </label>
            <label className="mos-field">
              <span className="mos-field-label">Vergi dairesi</span>
              <input
                className="mos-input"
                value={taxOffice}
                onChange={(e) => setTaxOffice(e.target.value)}
                disabled={saving}
              />
            </label>
          </div>
          <label className="mos-field">
            <span className="mos-field-label">Adres</span>
            <input className="mos-input" value={address} onChange={(e) => setAddress(e.target.value)} disabled={saving} />
          </label>
          <footer className="mos-modal-actions">
            <button type="button" className={erpOpsButtonClass('Vazgeç')} onClick={onClose}>
              Vazgeç
            </button>
            <button
              type="submit"
              className={erpOpsButtonClass('Kaydet')}
              disabled={saving || !companyName.trim()}
            >
              Kaydet
            </button>
          </footer>
        </form>
      </div>
    </div>
  )
}
