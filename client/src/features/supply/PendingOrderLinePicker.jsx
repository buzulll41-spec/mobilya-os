import { useEffect, useMemo, useState } from 'react'
import { formatShortDate } from '../../utils/dates.js'
import * as incomingGoodsClient from '../../services/incomingGoodsClient.js'
import { matchesIncomingPendingSearch } from '../../lib/incomingPendingLineRules.js'
import { PENDING_CUSTOMER_ORDER_EMPTY_MESSAGE } from './incomingCustomerOrderForm.js'

/** @typedef {import('../../contracts/v1/incomingGoods.js').PendingOrderLineForIncomingDto} PendingOrderLineForIncomingDto */

/**
 * @param {PendingOrderLineForIncomingDto} row
 * @param {string} supplierFilterId
 */
function matchesOptionalSupplierFilter(row, supplierFilterId) {
  if (!supplierFilterId) return true
  return row.supplierId === supplierFilterId || row.defaultSupplierId === supplierFilterId
}

/**
 * @param {{
 *   selectedId: string | null
 *   onSelect: (row: PendingOrderLineForIncomingDto | null) => void
 *   initialSearch?: string
 *   orderIdFilter?: string
 *   preferredLineId?: string
 *   supplierOptions?: { id: string, label: string }[]
 *   listResetKey?: boolean | number | string
 *   aiProcurementOrderIds?: Set<string>
 * }} props
 */
export default function PendingOrderLinePicker({
  selectedId,
  onSelect,
  initialSearch = '',
  orderIdFilter = '',
  preferredLineId = '',
  supplierOptions = [],
  listResetKey = false,
  aiProcurementOrderIds = new Set(),
}) {
  const [allRows, setAllRows] = useState(/** @type {PendingOrderLineForIncomingDto[]} */ ([]))
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(/** @type {string | null} */ (null))
  const [search, setSearch] = useState(initialSearch)
  const [optionalSupplierFilterId, setOptionalSupplierFilterId] = useState('')

  useEffect(() => {
    setSearch(initialSearch)
    setOptionalSupplierFilterId('')
  }, [initialSearch, listResetKey])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      setLoading(true)
      setLoadError(null)
      try {
        const list = await incomingGoodsClient.listPendingOrderLines()
        if (!cancelled) setAllRows(list)
      } catch (err) {
        if (!cancelled) {
          setAllRows([])
          setLoadError(err instanceof Error ? err.message : 'Bekleyen kalemler yüklenemedi')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [listResetKey])

  const searchFiltered = useMemo(() => {
    if (!search.trim()) return allRows
    return allRows.filter((row) =>
      matchesIncomingPendingSearch(
        {
          customerName: row.customerName,
          orderNumber: row.orderNumber,
          salesOrderId: row.salesOrderId,
          productTitle: row.productTitle,
          supplierName: row.supplierName,
        },
        search,
      ),
    )
  }, [allRows, search])

  const visibleRows = useMemo(() => {
    let rows = searchFiltered
    if (orderIdFilter.trim()) {
      const narrowed = rows.filter((row) => row.salesOrderId === orderIdFilter.trim())
      if (narrowed.length > 0) rows = narrowed
    }
    if (optionalSupplierFilterId) {
      rows = rows.filter((row) => matchesOptionalSupplierFilter(row, optionalSupplierFilterId))
    }
    return rows
  }, [searchFiltered, orderIdFilter, optionalSupplierFilterId])

  const optionalSupplierBlocked =
    Boolean(optionalSupplierFilterId) &&
    searchFiltered.length > 0 &&
    visibleRows.length === 0

  useEffect(() => {
    if (!preferredLineId || loading) return
    const hit = visibleRows.find((row) => row.orderLineId === preferredLineId)
    if (hit && selectedId !== preferredLineId) onSelect(hit)
  }, [preferredLineId, visibleRows, loading, selectedId, onSelect])

  if (loading) {
    return <p className="mos-muted">Bekleyen sipariş kalemleri yükleniyor…</p>
  }

  return (
    <div className="mos-incoming-picker">
      <input
        type="search"
        className="mos-input"
        placeholder="Müşteri, sipariş no, ürün, tedarikçi…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        aria-label="Bekleyen kalem ara"
      />

      {supplierOptions.length > 0 ? (
        <label className="mos-incoming-picker__supplier-filter">
          <span className="mos-label">Tedarikçi filtresi (isteğe bağlı)</span>
          <select
            className="mos-input"
            value={optionalSupplierFilterId}
            onChange={(e) => setOptionalSupplierFilterId(e.target.value)}
            aria-label="Tedarikçi filtresi"
          >
            <option value="">Tüm tedarikçiler</option>
            {supplierOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      {loadError ? (
        <p className="mos-form-error" role="alert">
          {loadError}
        </p>
      ) : null}

      {optionalSupplierBlocked ? (
        <div className="mos-incoming-picker__empty" role="status">
          <p>Bu tedarikçide bekleyen kayıt yok.</p>
          <button
            type="button"
            className="mos-incoming-picker__filter-link"
            onClick={() => setOptionalSupplierFilterId('')}
          >
            Aramayı tüm tedarikçilerde genişlet
          </button>
        </div>
      ) : null}

      {!optionalSupplierBlocked && visibleRows.length === 0 ? (
        <p className="mos-incoming-picker__empty-hint" role="status">
          {PENDING_CUSTOMER_ORDER_EMPTY_MESSAGE}
        </p>
      ) : null}

      {!optionalSupplierBlocked && visibleRows.length > 0 ? (
        <div className="mos-incoming-picker__list">
          {visibleRows.map((row) => {
            const active = selectedId === row.orderLineId
            return (
              <button
                key={row.orderLineId}
                type="button"
                className={`mos-incoming-picker__item${active ? ' is-active' : ''}`}
                onClick={() => onSelect(active ? null : row)}
              >
                <span className="mos-incoming-picker__title">
                  {row.customerName} · {row.orderNumber}
                  {aiProcurementOrderIds.has(row.salesOrderId) ? (
                    <span className="mos-incoming-picker__risk-badge" title="Tedarik Riski">
                      {' '}
                      📦 Tedarik Riski
                    </span>
                  ) : null}
                </span>
                <span className="mos-incoming-picker__product">{row.productTitle}</span>
                {row.supplierName ? (
                  <span className="mos-incoming-picker__supplier">Tedarikçi: {row.supplierName}</span>
                ) : null}
                <span className="mos-incoming-picker__qty">
                  Sipariş {row.qtyOrdered} · Gelen {row.qtyReceived} · Bekleyen {row.qtyPending}
                </span>
                {row.dueDate ? (
                  <span className="mos-incoming-picker__due">Teslim: {formatShortDate(row.dueDate)}</span>
                ) : null}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}
