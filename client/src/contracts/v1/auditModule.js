/** @typedef {'ORDER' | 'COLLECTION' | 'SHIPMENT' | 'SUPPLY' | 'INCOMING_GOODS' | 'SUPPLIER_LEDGER' | 'SSH' | 'PRODUCT_MASTER' | 'SALES' | 'SYSTEM'} AuditModule */

export const AUDIT_MODULE = /** @type {const} */ ({
  ORDER: 'ORDER',
  COLLECTION: 'COLLECTION',
  SHIPMENT: 'SHIPMENT',
  SUPPLY: 'SUPPLY',
  INCOMING_GOODS: 'INCOMING_GOODS',
  SUPPLIER_LEDGER: 'SUPPLIER_LEDGER',
  SSH: 'SSH',
  PRODUCT_MASTER: 'PRODUCT_MASTER',
  SALES: 'SALES',
  SYSTEM: 'SYSTEM',
})

/** @param {AuditModule | string} module */
export function auditModuleLabelTr(module) {
  switch (module) {
    case AUDIT_MODULE.ORDER:
      return 'Sipariş'
    case AUDIT_MODULE.COLLECTION:
      return 'Tahsilat'
    case AUDIT_MODULE.SHIPMENT:
      return 'Sevk'
    case AUDIT_MODULE.SUPPLY:
      return 'Tedarik'
    case AUDIT_MODULE.INCOMING_GOODS:
      return 'Gelen Ürün'
    case AUDIT_MODULE.SUPPLIER_LEDGER:
      return 'Tedarikçi Cari'
    case AUDIT_MODULE.SSH:
      return 'SSH'
    case AUDIT_MODULE.SALES:
      return 'Satış'
    case AUDIT_MODULE.PRODUCT_MASTER:
      return 'Ürün Master'
    default:
      return 'Sistem'
  }
}
