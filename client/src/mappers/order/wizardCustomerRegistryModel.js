import { parseCustomerExtraFromNotes } from '../../features/orders/newOrderWizardModel.js'

/** @typedef {import('../../data/seedOrders.js').Order} Order */

/** @typedef {'home' | 'summer' | 'office' | 'store' | 'other'} WizardCustomerAddressKind */

/**
 * @typedef {Object} WizardCustomerAddress
 * @property {string} id
 * @property {WizardCustomerAddressKind} kind
 * @property {string} label
 * @property {string} city
 * @property {string} district
 * @property {string} neighborhood
 * @property {string} address
 */

/**
 * @typedef {Object} WizardCustomerProfile
 * @property {string} id
 * @property {string} displayName
 * @property {string} phone
 * @property {string} phone2
 * @property {string} nationalId
 * @property {string} taxNumber
 * @property {string} taxOffice
 * @property {string} city
 * @property {string} district
 * @property {string} locationSummary
 * @property {WizardCustomerAddress[]} addresses
 * @property {number} orderCount
 */

export const WIZARD_DELIVERY_ADDRESS_LABELS = /** @type {const} */ ({
  home: 'Ev',
  summer: 'Yazlık',
  office: 'Ofis',
  store: 'Mağaza',
  other: 'Diğer',
})

const ADDRESS_KIND_ORDER = /** @type {const} */ (['home', 'summer', 'office', 'store', 'other'])

/**
 * @param {string} name
 */
export function normalizeWizardCustomerKey(name) {
  return name.trim().toLocaleLowerCase('tr-TR')
}

/**
 * @param {string} name
 */
export function wizardCustomerIdFromName(name) {
  const key = normalizeWizardCustomerKey(name)
  if (!key) return ''
  return `cust-${key.replace(/[^a-z0-9ğüşıöç]/gi, '-').replace(/-+/g, '-')}`
}

/**
 * @param {string | undefined | null} notes
 */
export function parseStructuredAddressFromNotes(notes) {
  const raw = notes?.trim() ?? ''
  if (!raw) return null

  const addrMatch = raw.match(/Adres:\s*([^\n]+)/i)
  const cityFromTag = raw.match(/İl:\s*([^\n,]+)/i)?.[1]?.trim() ?? ''
  const districtFromTag = raw.match(/İlçe:\s*([^\n,]+)/i)?.[1]?.trim() ?? ''

  if (!addrMatch?.[1]?.trim() && !cityFromTag && !districtFromTag) return null

  /** @type {{ neighborhood: string, address: string, district: string, city: string }} */
  let neighborhood = ''
  let address = ''
  let district = districtFromTag
  let city = cityFromTag

  if (addrMatch?.[1]?.trim()) {
    const parts = addrMatch[1]
      .split(',')
      .map((p) => p.trim())
      .filter(Boolean)
    if (parts.length >= 4) {
      neighborhood = parts[0]
      district = district || parts[parts.length - 2]
      city = city || parts[parts.length - 1]
      address = parts.slice(1, -2).join(', ')
    } else if (parts.length === 3) {
      neighborhood = parts[0]
      address = parts[1]
      district = district || parts[2]
    } else if (parts.length === 2) {
      address = parts[0]
      district = district || parts[1]
    } else if (parts.length === 1) {
      address = parts[0]
    }
  }

  if (!neighborhood && !address && !district && !city) return null
  return { neighborhood, address, district, city }
}

/**
 * @param {string} text
 * @param {number} index
 * @returns {WizardCustomerAddressKind}
 */
function inferAddressKind(text, index) {
  const q = text.toLocaleLowerCase('tr-TR')
  if (/yazlık|yazlik|yaz evi/.test(q)) return 'summer'
  if (/ofis|iş yeri|is yeri|plaza/.test(q)) return 'office'
  if (/mağaza|magaza|dükkan|dukkan|showroom/.test(q)) return 'store'
  if (/ev|konut|site|daire|villa/.test(q)) return 'home'
  return ADDRESS_KIND_ORDER[index] ?? 'other'
}

/**
 * @param {{ neighborhood: string, address: string, district: string, city: string }} addr
 */
function addressFingerprint(addr) {
  return [addr.city, addr.district, addr.neighborhood, addr.address]
    .map((v) => v.trim().toLocaleLowerCase('tr-TR'))
    .join('|')
}

/**
 * @param {WizardCustomerAddressKind} kind
 */
export function wizardDeliveryAddressLabel(kind) {
  return WIZARD_DELIVERY_ADDRESS_LABELS[kind] ?? WIZARD_DELIVERY_ADDRESS_LABELS.other
}

/**
 * @param {Order} order
 * @param {number} index
 * @returns {WizardCustomerAddress | null}
 */
function addressFromOrder(order, index) {
  const parsed = parseStructuredAddressFromNotes(order.notes)
  if (!parsed) return null
  const hint = `${order.notes ?? ''}`
  const kind = inferAddressKind(hint, index)
  const fp = addressFingerprint(parsed)
  return {
    id: `${fp}-${kind}`,
    kind,
    label: wizardDeliveryAddressLabel(kind),
    city: parsed.city,
    district: parsed.district,
    neighborhood: parsed.neighborhood,
    address: parsed.address,
  }
}

/**
 * @param {WizardCustomerAddress[]} addresses
 * @param {WizardCustomerAddress} candidate
 */
function upsertAddress(addresses, candidate) {
  const fp = addressFingerprint(candidate)
  const existingIdx = addresses.findIndex((a) => addressFingerprint(a) === fp)
  if (existingIdx === -1) {
    addresses.push(candidate)
    return
  }
  const existing = addresses[existingIdx]
  if (existing.kind === 'other' && candidate.kind !== 'other') {
    addresses[existingIdx] = { ...candidate, id: existing.id }
  }
}

/**
 * @param {WizardCustomerAddress[]} addresses
 */
function dedupeAddressLabels(addresses) {
  const used = new Set()
  return addresses.map((addr, index) => {
    let label = wizardDeliveryAddressLabel(addr.kind)
    if (used.has(label)) {
      label = `${label} ${index + 1}`
    }
    used.add(label.split(' ')[0])
    return { ...addr, label }
  })
}

/**
 * @param {Order[]} orders
 * @returns {WizardCustomerProfile[]}
 */
export function buildWizardCustomerRegistry(orders) {
  /** @type {Map<string, { name: string, orders: Order[] }>} */
  const groups = new Map()

  for (const order of orders) {
    const name = order.customer?.trim()
    if (!name) continue
    const key = normalizeWizardCustomerKey(name)
    const hit = groups.get(key)
    if (hit) hit.orders.push(order)
    else groups.set(key, { name, orders: [order] })
  }

  /** @type {WizardCustomerProfile[]} */
  const profiles = []

  for (const [key, group] of groups) {
    const sorted = [...group.orders].sort((a, b) =>
      String(b.orderDate ?? '').localeCompare(String(a.orderDate ?? '')),
    )
    const latest = sorted[0]
    const extra = parseCustomerExtraFromNotes(latest.notes)

    /** @type {WizardCustomerAddress[]} */
    const addresses = []
    sorted.forEach((order) => {
      const addr = addressFromOrder(order, addresses.length)
      if (addr) upsertAddress(addresses, addr)
    })

    const normalizedAddresses = dedupeAddressLabels(addresses)
    const primary = normalizedAddresses[0]
    const district = primary?.district ?? ''
    const city = primary?.city ?? ''
    const locationSummary = [district, city].filter(Boolean).join(' / ') || '—'

    profiles.push({
      id: wizardCustomerIdFromName(group.name),
      displayName: group.name,
      phone: latest.phone?.trim() ?? '',
      phone2: latest.phone2?.trim() ?? extra.phone2 ?? '',
      nationalId: latest.nationalId?.trim() ?? extra.nationalId ?? '',
      taxNumber: latest.taxNumber?.trim() ?? extra.taxNumber ?? '',
      taxOffice: latest.taxOffice?.trim() ?? extra.taxOffice ?? '',
      city,
      district,
      locationSummary,
      addresses: normalizedAddresses,
      orderCount: sorted.length,
    })
  }

  return profiles.sort((a, b) => a.displayName.localeCompare(b.displayName, 'tr'))
}

/** ASCII I / Turkish İ·ı aramasını eşleştirir (NIHAL ↔ NİHAL). */
function foldTurkishSearchText(text) {
  return text.trim().toLocaleLowerCase('tr-TR').replace(/ı/g, 'i')
}

/**
 * @param {WizardCustomerProfile[]} profiles
 * @param {string} query
 */
export function filterWizardCustomerProfiles(profiles, query) {
  const q = foldTurkishSearchText(query)
  if (!q) return profiles.slice(0, 24)
  return profiles
    .filter((p) => {
      const hay = foldTurkishSearchText(`${p.displayName} ${p.phone} ${p.locationSummary}`)
      return hay.includes(q)
    })
    .slice(0, 24)
}

/**
 * @param {WizardCustomerProfile} profile
 * @param {string | undefined | null} addressId
 */
export function buildWizardFormPatchFromCustomer(profile, addressId) {
  const address =
    profile.addresses.find((a) => a.id === addressId) ??
    profile.addresses[0] ??
    null

  return {
    customer: profile.displayName,
    phone: profile.phone,
    phone2: profile.phone2,
    nationalId: profile.nationalId,
    taxNumber: profile.taxNumber,
    taxOffice: profile.taxOffice,
    city: address?.city ?? profile.city,
    district: address?.district ?? profile.district,
    neighborhood: address?.neighborhood ?? '',
    address: address?.address ?? '',
    selectedCustomerKey: profile.id,
    selectedDeliveryAddressId: address?.id ?? '',
  }
}

/**
 * @param {WizardCustomerAddress} address
 */
export function buildWizardFormPatchFromDeliveryAddress(address) {
  return {
    city: address.city,
    district: address.district,
    neighborhood: address.neighborhood,
    address: address.address,
    selectedDeliveryAddressId: address.id,
  }
}
