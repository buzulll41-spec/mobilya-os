import { SUPPLIER_HEALTH_STATUS } from '../../mappers/supply/supplierHealth.js'

/** @typedef {import('../../contracts/v1/supplierOperations.js').SupplierOpsListItemDto} SupplierOpsListItemDto */
/** @typedef {import('../../contracts/v1/supplierOperations.js').SupplyOperationsKpisDto} SupplyOperationsKpisDto */
/** @typedef {import('../../contracts/erpOpsTableRow.js').ErpOpsTableRow} ErpOpsTableRow */
/** @typedef {import('../../contracts/erpOpsTableRow.js').ErpRowTone} ErpRowTone */

/** @typedef {'all' | 'critical' | 'risky' | 'normal' | 'passive'} SupplyHealthFilterId */

export const SUPPLY_HEALTH_FILTERS = /** @type {const} */ ([
  { id: 'all', label: 'Tüm firmalar' },
  { id: 'critical', label: 'Kritik' },
  { id: 'risky', label: 'Riskli' },
  { id: 'normal', label: 'Normal' },
  { id: 'passive', label: 'Pasif' },
])

/**
 * @param {SupplierOpsListItemDto} row
 * @returns {ErpRowTone}
 */
function toneForSupplier(row) {
  if (row.healthStatus === SUPPLIER_HEALTH_STATUS.CRITICAL) return 'critical'
  if (row.healthStatus === SUPPLIER_HEALTH_STATUS.RISKY) return 'warning'
  if (!row.isActive) return 'neutral'
  return 'neutral'
}

/**
 * @param {SupplierOpsListItemDto} row
 * @returns {ErpOpsTableRow}
 */
export function supplierToErpTableRow(row) {
  const tone = toneForSupplier(row)
  return {
    id: row.id,
    orderNo: row.code || row.id,
    customer: row.companyName,
    category: row.healthLabel,
    statusLabel: row.isActive ? row.healthLabel : 'Pasif',
    dateLabel: row.lastActivityLabel,
    lastActionLabel: `${row.openProductCount} açık ürün`,
    nextActionLabel: `${row.pendingOrderCount} bekleyen sipariş`,
    actionButtonLabel: 'Detay',
    tone,
    priorityRank: tone === 'critical' ? 1 : tone === 'warning' ? 2 : null,
  }
}

/**
 * @param {SupplierOpsListItemDto[]} suppliers
 * @param {SupplyHealthFilterId} filterId
 */
export function filterSuppliersByHealth(suppliers, filterId) {
  if (filterId === 'all') return suppliers
  return suppliers.filter((s) => {
    switch (filterId) {
      case 'critical':
        return s.healthStatus === SUPPLIER_HEALTH_STATUS.CRITICAL
      case 'risky':
        return s.healthStatus === SUPPLIER_HEALTH_STATUS.RISKY
      case 'normal':
        return s.healthStatus === SUPPLIER_HEALTH_STATUS.NORMAL
      case 'passive':
        return !s.isActive || s.healthStatus === SUPPLIER_HEALTH_STATUS.PASSIVE
      default:
        return true
    }
  })
}

/**
 * @param {SupplyOperationsKpisDto | null} kpis
 * @param {SupplierOpsListItemDto[]} suppliers
 */
export function buildSupplyOpsSummary(kpis, suppliers) {
  const critical = suppliers.filter((s) => s.healthStatus === SUPPLIER_HEALTH_STATUS.CRITICAL).length
  return [
    {
      id: 'critical',
      label: 'Kritik tedarikçi',
      value: String(kpis?.criticalSupplierCount ?? critical),
      valueTone: critical > 0 ? /** @type {const} */ ('critical') : undefined,
    },
    { id: 'open', label: 'Açık ürün', value: String(kpis?.openProductCount ?? '—') },
    { id: 'missing', label: 'Eksik ürün', value: String(kpis?.missingProductQty ?? '—') },
    { id: 'incoming', label: 'Bugün gelen', value: String(kpis?.todayIncomingCount ?? '—') },
  ]
}

/**
 * @param {SupplierOpsListItemDto[]} suppliers
 * @param {SupplyHealthFilterId} filterId
 */
export function countSupplyHealthFilter(suppliers, filterId) {
  return filterSuppliersByHealth(suppliers, filterId).length
}
