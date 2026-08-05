import { useEffect, useMemo, useRef, useState } from 'react'

import {
  buildWizardCustomerRegistry,
  filterWizardCustomerProfiles,
} from '../../mappers/order/wizardCustomerRegistryModel.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */
/** @typedef {import('../../mappers/order/wizardCustomerRegistryModel.js').WizardCustomerProfile} WizardCustomerProfile */

/**
 * @param {{
 *   orders: Order[]
 *   value: string
 *   selectedCustomerKey: string
 *   locked: boolean
 *   onSelectCustomer: (profile: WizardCustomerProfile) => void
 *   onClearCustomer: () => void
 *   onQueryChange: (query: string) => void
 * }} props
 */
export default function WizardCustomerPicker({
  orders,
  value,
  selectedCustomerKey,
  locked,
  onSelectCustomer,
  onClearCustomer,
  onQueryChange,
}) {
  const rootRef = useRef(/** @type {HTMLDivElement | null} */ (null))
  const [open, setOpen] = useState(false)

  const profiles = useMemo(() => buildWizardCustomerRegistry(orders), [orders])
  const filtered = useMemo(() => filterWizardCustomerProfiles(profiles, value), [profiles, value])
  const selectedProfile = useMemo(
    () => profiles.find((p) => p.id === selectedCustomerKey) ?? null,
    [profiles, selectedCustomerKey],
  )

  useEffect(() => {
    function onDocClick(e) {
      if (!rootRef.current?.contains(/** @type {Node} */ (e.target))) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  return (
    <div className="now-customer-picker" ref={rootRef}>
      <div className="now-customer-row">
        <input
          className="now-input"
          value={value}
          onChange={(e) => {
            onQueryChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          disabled={locked}
          autoFocus
          placeholder="Ad soyad veya firma ara…"
          autoComplete="off"
          role="combobox"
          aria-expanded={open}
          aria-controls="now-customer-picker-list"
          aria-autocomplete="list"
        />
        <button
          type="button"
          className="now-btn-secondary"
          disabled={locked}
          onClick={() => {
            onClearCustomer()
            setOpen(false)
          }}
        >
          Yeni müşteri
        </button>
      </div>

      {selectedProfile ? (
        <p className="now-customer-picker__selected" role="status">
          Kayıtlı müşteri seçildi — bilgiler otomatik dolduruldu, isterseniz düzenleyebilirsiniz.
        </p>
      ) : null}

      {open && filtered.length > 0 ? (
        <ul
          id="now-customer-picker-list"
          className="now-customer-picker__list"
          role="listbox"
          aria-label="Müşteri listesi"
        >
          {filtered.map((profile) => (
            <li key={profile.id} role="option" aria-selected={profile.id === selectedCustomerKey}>
              <button
                type="button"
                className={`now-customer-card${profile.id === selectedCustomerKey ? ' now-customer-card--active' : ''}`}
                disabled={locked}
                onClick={() => {
                  onSelectCustomer(profile)
                  setOpen(false)
                }}
              >
                <strong className="now-customer-card__name">{profile.displayName}</strong>
                <span className="now-customer-card__phone">
                  {profile.phone?.trim() || 'Telefon yok'}
                </span>
                <span className="now-customer-card__location">{profile.locationSummary}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {open && value.trim() && filtered.length === 0 ? (
        <p className="now-customer-picker__empty" role="status">
          Eşleşen müşteri yok — yeni kayıt olarak devam edebilirsiniz.
        </p>
      ) : null}
    </div>
  )
}
