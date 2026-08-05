import { useEffect, useMemo, useState } from 'react'

import { formatTry } from '../../../data/dashboardHelpers.js'

import { getOrderLines } from '../../../services/ordersClient.js'

import * as ordersClient from '../../../services/ordersClient.js'
import { getOrderPayments } from '../../../services/ordersClient.js'

import { useOrderLineReceiving } from '../../../hooks/useOrderLineReceiving.js'

import { useOrderDrawer } from '../../../state/OrderDrawerProvider.jsx'

import ErpOpsSummaryStrip from '../../../components/erp-ops/ErpOpsSummaryStrip.jsx'

import SupplySendModal from '../SupplySendModal.jsx'
import {
  buildSupplyOrderLineDetail,
  extractCustomerNoteFromOrderNotes,
} from '../../../mappers/supply/supplyOrderMessages.js'
import { revertOrderLineWarehouseArrival } from '../../../services/supplyOrderClient.js'
import {
  reconcileOrderLineSupplyState,
  revertOrderLineSupplySent,
} from '../../../services/supplyOrderClient.js'
import { SUPPLY_STATUS } from '../../../constants/supplyOrderStatus.js'
import {
  buildLineSupplySnapshot,
  resolveProductRowActionFlags,
} from '../../../lib/orderLineSupplyState.js'
import { isOrderLinePendingForIncomingEntry } from '../../../lib/incomingPendingLineRules.js'
import { navigateToSupplyIncomingEntry } from '../../../lib/supplyIncomingNavigation.js'

import {

  buildOrderPanelProductRows,

  buildOrderPanelProductsFooter,

  buildOrderPanelProductsSummary,

  filterOrderPanelProducts,

  ORDER_PANEL_PRODUCT_FILTERS,

  sortOrderPanelProducts,

} from '../../../mappers/order/orderPanelProductsModel.js'

import {
  buildOrderRealProfitMetrics,
  computeOrderRealProfit,
} from '../../../mappers/order/orderRealProfitModel.js'

import { isMissingItemResolvedStatus } from '../../../contracts/v1/missingItemStatuses.js'

import '../../../styles/order-panel-products.css'



/** @typedef {import('../../../mappers/order/orderPanelProductsModel.js').OrderPanelProductsFilterId} OrderPanelProductsFilterId */

/** @typedef {import('../../../mappers/order/orderPanelProductsModel.js').OrderPanelProductsSortKey} OrderPanelProductsSortKey */

/** @typedef {import('../../../contracts/v1/incomingGoods.js').OrderLineReceivingDto} OrderLineReceivingDto */

/** @typedef {import('../../../services/ordersClient.js').OrderLineDetailDto} OrderLineDetailDto */

/**
 * @param {{
 *   orderId: string
 *   customerName?: string
 *   orderNotes?: string
 *   refreshKey?: number
 *   onReceivingSaved?: () => void
 *   canReceive?: boolean
 *   canViewIncomingLink?: boolean
 * }} props
 */
export default function OrderPanelProductsTable({
  orderId,
  customerName = '',
  orderNotes = '',
  refreshKey = 0,
  onReceivingSaved,
  canReceive = false,
  canViewIncomingLink = false,
}) {
  const { closeOrderDrawer } = useOrderDrawer()

  const { lines: receivingLines, error: receivingError } = useOrderLineReceiving(orderId, refreshKey)



  const [orderLines, setOrderLines] = useState(/** @type {OrderLineDetailDto[] | null} */ (null))
  const [orderPayments, setOrderPayments] = useState(
    /** @type {import('../../../contracts/v1/payment.js').PaymentTransactionDto[]} */ ([]),
  )

  const [openMissingLineIds, setOpenMissingLineIds] = useState(/** @type {Set<string>} */ (new Set()))

  const [linesError, setLinesError] = useState(/** @type {string | null} */ (null))

  const [search, setSearch] = useState('')

  const [filterId, setFilterId] = useState(/** @type {OrderPanelProductsFilterId} */ ('all'))

  const [sortKey, setSortKey] = useState(/** @type {OrderPanelProductsSortKey} */ ('title'))

  const [sortDir, setSortDir] = useState(/** @type {'asc' | 'desc'} */ ('asc'))

  const [formError, setFormError] = useState(/** @type {string | null} */ (null))
  const [selectedRowId, setSelectedRowId] = useState(/** @type {string | null} */ (null))
  const [selectedLineIds, setSelectedLineIds] = useState(/** @type {Set<string>} */ (new Set()))
  const [supplyModalOpen, setSupplyModalOpen] = useState(false)
  const [revertingLineId, setRevertingLineId] = useState(/** @type {string | null} */ (null))
  const [actionLineId, setActionLineId] = useState(/** @type {string | null} */ (null))

  const customerNote = useMemo(() => extractCustomerNoteFromOrderNotes(orderNotes), [orderNotes])

  const selectedSupplyLines = useMemo(() => {
    if (!orderLines) return []
    const selected = orderLines.filter((line) => selectedLineIds.has(line.id))
    return selected.map((line) => buildSupplyOrderLineDetail(line, customerNote))
  }, [orderLines, selectedLineIds, customerNote])

  useEffect(() => {
    let cancelled = false

    setLinesError(null)

    Promise.all([getOrderLines(orderId), ordersClient.getOrderMissingItems(orderId), getOrderPayments(orderId)])

      .then(([lines, missingItems, payments]) => {

        if (cancelled) return

        setOrderLines(lines)
        setOrderPayments(payments)

        const ids = new Set(

          missingItems

            .filter((m) => m.lineId && !isMissingItemResolvedStatus(m.status))

            .map((m) => m.lineId)

            .filter(Boolean),

        )

        setOpenMissingLineIds(ids)

      })

      .catch((e) => {

        if (!cancelled) {

          setOrderLines([])

          setLinesError(e instanceof Error ? e.message : 'Ürün satırları yüklenemedi')

        }

      })

    return () => {

      cancelled = true

    }

  }, [orderId, refreshKey])



  const allRows = useMemo(

    () => buildOrderPanelProductRows(orderLines ?? [], receivingLines, openMissingLineIds),

    [orderLines, receivingLines, openMissingLineIds],

  )



  const summaryMetrics = useMemo(() => buildOrderPanelProductsSummary(allRows), [allRows])

  const realProfitMetrics = useMemo(() => {
    const profit = computeOrderRealProfit(allRows, orderPayments)
    return buildOrderRealProfitMetrics(profit)
  }, [allRows, orderPayments])



  const visibleRows = useMemo(() => {

    const filtered = filterOrderPanelProducts(allRows, filterId, search)

    return sortOrderPanelProducts(filtered, sortKey, sortDir)

  }, [allRows, filterId, search, sortKey, sortDir])



  const footer = useMemo(() => buildOrderPanelProductsFooter(visibleRows), [visibleRows])



  function toggleSort(key) {

    if (sortKey === key) {

      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))

    } else {

      setSortKey(key)

      setSortDir('asc')

    }

  }



  /** @param {OrderPanelProductsSortKey} key @param {string} label */

  function sortHeader(key, label) {

    const active = sortKey === key

    return (

      <button type="button" className={active ? 'is-sorted' : ''} onClick={() => toggleSort(key)}>

        {label}

        {active ? (sortDir === 'asc' ? ' ↑' : ' ↓') : null}

      </button>

    )

  }



  function goToIncomingEntry(row) {
    closeOrderDrawer()
    navigateToSupplyIncomingEntry({
      q: customerName.trim() || row.supplierName?.trim() || row.title?.trim() || orderId,
      orderId,
      orderLineId: row.id,
    })
  }

  const colSpan = 10

  const loading = orderLines === null



  return (

    <div className="oop-products" aria-label="Sipariş ürünleri">

      <ErpOpsSummaryStrip

        metrics={summaryMetrics}

        ariaLabel="Ürün özet göstergeleri"

        summaryClassName="mos-erp-summary--cols-6"

        onMetricClick={(id) => {

          if (id === 'total' || id === 'amount') setFilterId('all')

          else if (id === 'arrived') setFilterId('arrived')

          else if (id === 'waiting') setFilterId('waiting')

          else if (id === 'missing') setFilterId('missing')

          else if (id === 'ready') setFilterId('ready')

        }}

      />

      {!loading && allRows.length > 0 ? (
        <ErpOpsSummaryStrip
          metrics={realProfitMetrics}
          ariaLabel="Sipariş gerçek kâr özeti"
          summaryClassName="mos-erp-summary--cols-5 oop-products__profit-strip"
        />
      ) : null}



      {receivingError ? (

        <p className="oop-products__alert" role="status">

          Gelen ürün durumu API&apos;den alınamadı — satır durumları sipariş kalemlerinden hesaplanıyor.

        </p>

      ) : null}



      {linesError ? (

        <p className="mos-form-error" role="alert">

          {linesError}

        </p>

      ) : null}



      {formError ? (
        <p className="mos-form-error" role="alert">
          {formError}
        </p>
      ) : null}

      <p className="oop-products__entry-info" role="note">
        Ürün fiziksel girişleri Tedarik &amp; Gelen Ürün ekranından yapılır.
      </p>

      <div className="oop-products__toolbar">

        {canReceive ? (
          <button
            type="button"
            className="oop-products__supply-btn"
            disabled={selectedLineIds.size === 0}
            onClick={() => setSupplyModalOpen(true)}
          >
            Sipariş ver
          </button>
        ) : null}

        <input

          type="search"

          className="oop-products__search"

          placeholder="Ürün adı, tedarikçi, durum…"

          value={search}

          onChange={(e) => setSearch(e.target.value)}

          aria-label="Ürün ara"

        />

        <select

          className="oop-products__filter"

          value={filterId}

          onChange={(e) => setFilterId(/** @type {OrderPanelProductsFilterId} */ (e.target.value))}

          aria-label="Durum filtresi"

        >

          {ORDER_PANEL_PRODUCT_FILTERS.map((f) => (

            <option key={f.id} value={f.id}>

              {f.label}

            </option>

          ))}

        </select>

      </div>



      <section className="oop-products__table-panel" aria-label="Ürün tablosu">

        <div className="mos-erp-tbl-wrap">

          <table className="mos-erp-tbl oop-products__table">

            <thead>

              <tr>
                <th className="oop-products__check-col" aria-label="Seç" />
                <th>{sortHeader('title', 'Ürün')}</th>
                <th className="is-num">{sortHeader('qty', 'Adet')}</th>
                <th>{sortHeader('supplier', 'Tedarikçi')}</th>
                <th>Tedarik durumu</th>
                <th>Depo girişi</th>
                <th>{sortHeader('shipmentReady', 'Sevke hazır')}</th>
                <th>Aksiyon</th>
                <th className="is-num">{sortHeader('sale', 'Satış fiyatı')}</th>
                <th className="is-num">{sortHeader('total', 'Toplam')}</th>

              </tr>

            </thead>

            <tbody>

              {loading ? (

                <tr className="mos-erp-tbl-empty">

                  <td colSpan={colSpan}>Ürünler yükleniyor…</td>

                </tr>

              ) : visibleRows.length === 0 ? (

                <tr className="mos-erp-tbl-empty">

                  <td colSpan={colSpan}>Bu filtrede ürün yok.</td>

                </tr>

              ) : (

                visibleRows.map((row) => {
                  const supplySnapshot = buildLineSupplySnapshot(
                    {
                      supplyStatus: row.supplyStatus,
                      warehouseEntryStatus: row.warehouseEntryStatus,
                      shipmentReady: row.shipmentReadyRaw,
                    },
                    row.qtyOrdered,
                    row.qtyReceived,
                  )
                  const rowActions = resolveProductRowActionFlags(supplySnapshot, row.receivingLine)
                  const canSelectForSupply =
                    canReceive && row.supplyStatus !== SUPPLY_STATUS.SENT
                  const showGoToIncoming =
                    canViewIncomingLink &&
                    isOrderLinePendingForIncomingEntry({
                      supplyStatus: row.supplyStatus,
                      warehouseEntryStatus: row.warehouseEntryStatus,
                      shipmentReady: row.shipmentReadyRaw,
                      qtyOrdered: row.qtyOrdered,
                      qtyReceived: row.qtyReceived,
                    })
                  const showRevertArrival = canReceive && rowActions.showRevertArrival
                  const showRevertSupply = canReceive && rowActions.showRevertSupply
                  const rowBusy = actionLineId === row.id || revertingLineId === row.id

                  async function runRowAction(action) {
                    setActionLineId(row.id)
                    setFormError(null)
                    try {
                      await action()
                      onReceivingSaved?.()
                    } catch (err) {
                      setFormError(err instanceof Error ? err.message : 'İşlem başarısız')
                    } finally {
                      setActionLineId(null)
                      setRevertingLineId(null)
                    }
                  }

                  return (
                    <tr
                      key={row.id}
                      className={`mos-erp-tbl-row oop-products-row oop-products-row--${row.rowTone}${selectedRowId === row.id ? ' is-selected' : ''}${row.stateInconsistent ? ' oop-products-row--inconsistent' : ''}`}
                      aria-selected={selectedRowId === row.id}
                      onClick={() => setSelectedRowId(row.id)}
                    >
                      <td className="oop-products__check-col">
                        {canSelectForSupply ? (
                          <input
                            type="checkbox"
                            checked={selectedLineIds.has(row.id)}
                            aria-label={`${row.title} seç`}
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => {
                              setSelectedLineIds((prev) => {
                                const next = new Set(prev)
                                if (e.target.checked) next.add(row.id)
                                else next.delete(row.id)
                                return next
                              })
                            }}
                          />
                        ) : null}
                      </td>

                      <td>
                        <span className="oop-products__name">{row.title}</span>
                        {row.configHint ? (
                          <span className="oop-products__config">{row.configHint}</span>
                        ) : null}
                        {row.stateInconsistent ? (
                          <span className="oop-products__state-warning" role="alert">
                            Durum tutarsızlığı var
                            {canReceive ? (
                              <button
                                type="button"
                                className="oop-products__state-fix"
                                disabled={rowBusy}
                                onClick={(e) => {
                                  e.stopPropagation()
                                  void runRowAction(() =>
                                    reconcileOrderLineSupplyState(orderId, row.id),
                                  )
                                }}
                              >
                                Durumu düzelt
                              </button>
                            ) : null}
                          </span>
                        ) : null}
                      </td>

                      <td className="is-num">
                        {Number.isInteger(row.qtyOrdered) ? row.qtyOrdered : row.qtyOrdered.toFixed(2)}
                      </td>

                      <td>{row.supplierName || '—'}</td>

                      <td>
                        <span className={`oop-products__supply oop-products__supply--${row.supplyTone}`}>
                          {row.supplyTone === 'sent' ? '🟢' : '🔴'} {row.supplyStatusLabel}
                        </span>
                      </td>

                      <td>
                        <span className={`oop-products__warehouse oop-products__warehouse--${row.warehouseTone}`}>
                          {row.warehouseEntryLabel}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`oop-products__ready-flag${row.shipmentReadyLabel === 'Evet' ? ' oop-products__ready-flag--yes' : ' oop-products__ready-flag--no'}`}
                        >
                          {row.shipmentReadyLabel}
                        </span>
                      </td>

                      <td className="oop-products__action-cell">
                        <div className="oop-products__actions">
                          {showGoToIncoming ? (
                            <button
                              type="button"
                              className="oop-products__receive oop-products__incoming-link"
                              onClick={(e) => {
                                e.stopPropagation()
                                goToIncomingEntry(row)
                              }}
                            >
                              Gelen Ürün Kaydına Git
                            </button>
                          ) : null}
                          {showRevertArrival ? (
                            <button
                              type="button"
                              className="oop-products__receive oop-products__receive--revert"
                              disabled={rowBusy}
                              onClick={(e) => {
                                e.stopPropagation()
                                setRevertingLineId(row.id)
                                void runRowAction(() =>
                                  revertOrderLineWarehouseArrival(orderId, row.id),
                                )
                              }}
                            >
                              Gelişi geri al
                            </button>
                          ) : null}
                          {showRevertSupply ? (
                            <button
                              type="button"
                              className="oop-products__receive oop-products__receive--revert-supply"
                              disabled={rowBusy}
                              onClick={(e) => {
                                e.stopPropagation()
                                void runRowAction(() => revertOrderLineSupplySent(orderId, row.id))
                              }}
                            >
                              Tedarik geri al
                            </button>
                          ) : null}
                          {!showGoToIncoming &&
                          !showRevertArrival &&
                          !showRevertSupply ? (
                            <span className="oop-products__action-muted" aria-hidden>
                              —
                            </span>
                          ) : null}
                        </div>
                      </td>

                      <td className="is-num">{row.unitPrice != null ? formatTry(row.unitPrice) : '—'}</td>

                      <td className="is-num">{row.lineTotal != null ? formatTry(row.lineTotal) : '—'}</td>
                    </tr>
                  )
                })

              )}

            </tbody>

            {!loading && visibleRows.length > 0 ? (

              <tfoot>

                <tr className="oop-products__footer">

                  <td>Toplam ({visibleRows.length} kalem)</td>

                  <td className="is-num">

                    {Number.isInteger(footer.qtyTotal) ? footer.qtyTotal : footer.qtyTotal.toFixed(2)}

                  </td>

                  <td colSpan={6} />

                  <td className="is-num">—</td>

                  <td className="is-num">{formatTry(footer.saleTotal)}</td>

                </tr>

              </tfoot>

            ) : null}

          </table>

        </div>

      </section>



      <SupplySendModal
        open={supplyModalOpen}
        orderId={orderId}
        orderNumber={orderId}
        lineIds={[...selectedLineIds]}
        supplyLines={selectedSupplyLines}
        onClose={() => setSupplyModalOpen(false)}
        onConfirmed={() => {
          setSelectedLineIds(new Set())
          onReceivingSaved?.()
        }}
      />

    </div>

  )

}


