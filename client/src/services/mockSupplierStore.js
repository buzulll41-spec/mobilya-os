import { DEMO_TODAY } from '../data/constants.js'

/** @typedef {import('../contracts/v1/supplier.js').SupplierDetailDto} SupplierDetailDto */

/** @type {SupplierDetailDto[]} */
let memorySuppliers = []

const CITIES = ['İstanbul', 'Ankara', 'İzmir', 'Bursa', 'Antalya', 'Kocaeli', 'Adana']
const NAME_STEMS = [
  'Butik Mobilya',
  'Mayer Köşe',
  'Delta Koltuk',
  'Nova Ahşap',
  'Zen Mobilya',
  'Atlas Dekor',
  'Vega Koltuk',
  'Linea Design',
  'Modül Mobilya',
  'Kale Ahşap',
]

/** @returns {SupplierDetailDto[]} */
function buildGeneratedSuppliers() {
  /** @type {SupplierDetailDto[]} */
  const generated = []
  for (let i = 0; i < 42; i++) {
    const stem = NAME_STEMS[i % NAME_STEMS.length]
    const city = CITIES[i % CITIES.length]
    const balance = ((i % 9) + 1) * 12_500 + (i % 5) * 8000
    const daysAgo = i % 120
    const d = new Date(`${DEMO_TODAY}T12:00:00`)
    d.setDate(d.getDate() - daysAgo)
    const lastAt = daysAgo < 95 ? d.toISOString().slice(0, 10) : null
    generated.push({
      id: `sup-gen-${i + 1}`,
      code: `T${String(i + 10).padStart(3, '0')}`,
      companyName: i < 10 ? `${stem} ${city}` : `${stem} ${i + 1}`,
      contactName: i % 3 === 0 ? 'Operasyon Yetkilisi' : null,
      phone: `053${i % 10} ${100 + i} ${20 + (i % 70)} ${10 + (i % 80)}`,
      iban: null,
      taxNumber: String(1_000_000_000 + i),
      taxOffice: city,
      address: city,
      isActive: daysAgo < 100,
      openBalance: balance.toFixed(2),
      currency: 'TRY',
      lastMovementAt: lastAt,
      createdAt: '2026-04-01T10:00:00.000Z',
      updatedAt: '2026-05-14T08:00:00.000Z',
    })
  }
  return generated
}

const SEED_SUPPLIERS = /** @type {SupplierDetailDto[]} */ ([
  {
    id: 'sup-abc',
    code: 'ABC',
    companyName: 'ABC Mobilya',
    contactName: 'Mehmet Yılmaz',
    phone: '0532 111 22 33',
    iban: 'TR00 0001 0000 0000 0000 0000 01',
    taxNumber: '1234567890',
    taxOffice: 'Kadıköy',
    address: 'İstanbul',
    isActive: true,
    openBalance: '45000.00',
    currency: 'TRY',
    lastMovementAt: '2026-05-14',
    createdAt: '2026-05-01T10:00:00.000Z',
    updatedAt: '2026-05-14T08:00:00.000Z',
  },
  {
    id: 'sup-delta',
    code: 'DLT',
    companyName: 'Delta Koltuk',
    contactName: 'Ayşe Demir',
    phone: '0533 444 55 66',
    iban: null,
    taxNumber: '9876543210',
    taxOffice: 'Ümraniye',
    address: 'İstanbul',
    isActive: true,
    openBalance: '12000.00',
    currency: 'TRY',
    lastMovementAt: '2026-05-13',
    createdAt: '2026-05-02T10:00:00.000Z',
    updatedAt: '2026-05-13T12:00:00.000Z',
  },
  {
    id: 'sup-passive',
    code: 'OLD',
    companyName: 'Eski Tedarik Ltd.',
    contactName: null,
    phone: null,
    iban: null,
    taxNumber: null,
    taxOffice: null,
    address: null,
    isActive: false,
    openBalance: '0.00',
    currency: 'TRY',
    lastMovementAt: null,
    createdAt: '2026-04-01T10:00:00.000Z',
    updatedAt: '2026-05-01T10:00:00.000Z',
  },
])

export function hydrateSupplierStore() {
  if (memorySuppliers.length === 0) {
    memorySuppliers = [...SEED_SUPPLIERS, ...buildGeneratedSuppliers()].map((s) => ({ ...s }))
  }
}

export function resetMockSupplierStore() {
  memorySuppliers = []
}

export function getAllSuppliersSnapshot() {
  hydrateSupplierStore()
  return memorySuppliers.map((s) => ({ ...s }))
}

/**
 * @param {string} id
 */
export function findSupplierById(id) {
  hydrateSupplierStore()
  const row = memorySuppliers.find((s) => s.id === id)
  return row ? { ...row } : null
}

/**
 * @param {SupplierDetailDto} row
 */
export function upsertSupplier(row) {
  hydrateSupplierStore()
  const i = memorySuppliers.findIndex((s) => s.id === row.id)
  if (i === -1) memorySuppliers.push({ ...row })
  else memorySuppliers[i] = { ...row }
  return { ...row }
}

/**
 * @param {Omit<SupplierDetailDto, 'id' | 'createdAt' | 'updatedAt' | 'openBalance' | 'lastMovementAt'> & { id?: string }} draft
 */
export function createSupplierInStore(draft) {
  hydrateSupplierStore()
  const now = new Date().toISOString()
  const id = draft.id ?? `sup-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  const row = /** @type {SupplierDetailDto} */ ({
    id,
    code: draft.code ?? null,
    companyName: draft.companyName,
    contactName: draft.contactName ?? null,
    phone: draft.phone ?? null,
    iban: draft.iban ?? null,
    taxNumber: draft.taxNumber ?? null,
    taxOffice: draft.taxOffice ?? null,
    address: draft.address ?? null,
    isActive: draft.isActive !== false,
    openBalance: '0.00',
    currency: 'TRY',
    lastMovementAt: null,
    createdAt: now,
    updatedAt: now,
  })
  memorySuppliers.push(row)
  return { ...row }
}
