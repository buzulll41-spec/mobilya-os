import { describe, expect, it } from 'vitest'

import {
  buildWizardCustomerRegistry,
  buildWizardFormPatchFromCustomer,
  filterWizardCustomerProfiles,
  parseStructuredAddressFromNotes,
} from '../../src/mappers/order/wizardCustomerRegistryModel.js'

describe('wizard customer registry', () => {
  it('adres satırlarını notes snapshotından ayrıştırır', () => {
    const parsed = parseStructuredAddressFromNotes(
      'Adres: Cumhuriyet Mah., Atatürk Cad. No:12, Kadıköy, İstanbul',
    )
    expect(parsed?.neighborhood).toBe('Cumhuriyet Mah.')
    expect(parsed?.district).toBe('Kadıköy')
    expect(parsed?.city).toBe('İstanbul')
  })

  it('müşteri kartları yalnızca müşteri düzeyinde gruplanır', () => {
    const profiles = buildWizardCustomerRegistry([
      {
        id: 'S-1',
        customer: 'Ayşe Yılmaz',
        phone: '0532 111 22 33',
        product: 'Koltuk',
        status: 'Üretimde',
        amount: 100_000,
        orderDate: '2026-05-10',
        notes: 'Adres: Ev Mah., Sokak 1, Kadıköy, İstanbul',
      },
      {
        id: 'S-2',
        customer: 'Ayşe Yılmaz',
        phone: '0532 111 22 33',
        product: 'Sehpa',
        status: 'Hazır',
        amount: 20_000,
        orderDate: '2026-05-12',
        notes: 'Adres: Yazlık Sitesi, Blok B, Gebze, Kocaeli',
      },
      {
        id: 'S-3',
        customer: 'Mehmet Kaya',
        phone: '0542 999 88 77',
        product: 'Masa',
        status: 'Bekleniyor',
        amount: 30_000,
        orderDate: '2026-05-08',
        notes: 'Adres: Merkez, Ofis Plaza, Ümraniye, İstanbul',
      },
    ])

    expect(profiles).toHaveLength(2)
    const ayse = profiles.find((p) => p.displayName === 'Ayşe Yılmaz')
    expect(ayse?.phone).toBe('0532 111 22 33')
    expect(ayse?.locationSummary).toContain('Kocaeli')
    expect(ayse?.addresses.length).toBeGreaterThanOrEqual(2)
    expect(filterWizardCustomerProfiles(profiles, 'Mehmet')).toHaveLength(1)
  })

  it('NIHAL araması ASCII I ve Türkçe İ ile eşleşir', () => {
    const profiles = buildWizardCustomerRegistry([
      {
        id: 'S-9',
        customer: 'NİHAL AYDIN',
        phone: '0532 555 00 01',
        product: 'Koltuk',
        status: 'Üretimde',
        amount: 80_000,
        orderDate: '2026-05-12',
        notes: 'Adres: Merkez Mah., Cadde 1, Kadıköy, İstanbul',
      },
      {
        id: 'S-10',
        customer: 'Aykut Elmas',
        phone: '0542 111 22 33',
        product: 'Masa',
        status: 'Hazır',
        amount: 40_000,
        orderDate: '2026-05-10',
        notes: '',
      },
    ])
    expect(filterWizardCustomerProfiles(profiles, 'NIHAL')).toHaveLength(1)
    expect(filterWizardCustomerProfiles(profiles, 'NİHAL')).toHaveLength(1)
    expect(filterWizardCustomerProfiles(profiles, 'AYKUT')).toHaveLength(1)
  })

  it('müşteri seçilince form alanları otomatik dolar', () => {
    const [profile] = buildWizardCustomerRegistry([
      {
        id: 'S-10',
        customer: 'Kurumsal A.Ş.',
        phone: '0212 444 55 66',
        phone2: '0533 000 00 00',
        taxNumber: '1234567890',
        taxOffice: 'Kadıköy',
        product: 'Ofis mobilyası',
        status: 'Üretimde',
        amount: 200_000,
        orderDate: '2026-05-14',
        notes: [
          '--- Müşteri ek ---',
          'Vergi no: 1234567890',
          'Vergi dairesi: Kadıköy',
          '--- /Müşteri ek ---',
          'Adres: Levent Mah., Plaza Cad., Beşiktaş, İstanbul',
        ].join('\n'),
      },
    ])

    const patch = buildWizardFormPatchFromCustomer(profile, profile.addresses[0]?.id)
    expect(patch.customer).toBe('Kurumsal A.Ş.')
    expect(patch.phone).toBe('0212 444 55 66')
    expect(patch.phone2).toBe('0533 000 00 00')
    expect(patch.taxNumber).toBe('1234567890')
    expect(patch.taxOffice).toBe('Kadıköy')
    expect(patch.district).toBe('Beşiktaş')
    expect(patch.city).toBe('İstanbul')
  })
})
