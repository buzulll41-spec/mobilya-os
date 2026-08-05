import { memo, useEffect, useMemo, useState } from 'react'
import ErpOpsSummaryStrip from '../components/erp-ops/ErpOpsSummaryStrip.jsx'
import ErpOpsLeftFilters from '../components/erp-ops/ErpOpsLeftFilters.jsx'
import ErpOpsDetailStrip from '../components/erp-ops/ErpOpsDetailStrip.jsx'
import ErpOpsTable from '../components/erp-ops/ErpOpsTable.jsx'
import MobileStoreEmptyState from '../components/mobile/MobileStoreEmptyState.jsx'
import {
  Badge,
  Card,
  SectionHeader,
} from '../components/design-system/DSComponents.jsx'
import {
  SSH_QUICK_FILTERS,
  buildSshOpsSummary,
  countSshFilter,
  filterSshCards,
  sshCardToErpTableRow,
} from '../features/ssh/sshOpsCenterUi.js'
import SshMobileActionSheet from '../features/ssh/SshMobileActionSheet.jsx'
import PilotScopeToggle from '../components/pilot/PilotScopeToggle.jsx'
import { usePilotDataMode } from '../hooks/usePilotDataMode.js'
import { useViewportTier } from '../hooks/useViewportTier.js'
import { getOrderPilotKind } from '../lib/pilotRecordHeuristics.js'
import { buildDrawerQueue } from '../application/orderDrawerOrchestration.js'
import { consumeOpsDeepLink } from '../lib/opsDeepLink.js'
import { buildSshMissingPartCard } from '../mappers/ssh/sshMissingPartsModel.js'
import { formatApiErrorMessage } from '../utils/apiErrorMessage.js'
import * as ordersClient from '../services/ordersClient.js'
import '../styles/mos-erp-ops.css'
import '../styles/ssh-mobile-edition.css'

/** @typedef {import('../mappers/ssh/sshMissingPartsModel.js').SshMissingPartCard} SshMissingPartCard */
/** @typedef {import('../features/ssh/sshOpsCenterUi.js').SshQuickFilterId} SshQuickFilterId */
/** @typedef {import('../contracts/erpOpsTableRow.js').ErpOpsTableRow} ErpOpsTableRow */

/**
 * @param {{
 *   sshMissingParts: SshMissingPartCard[]
 *   onOpenSsh: (orderId: string, options?: import('../contracts/orderDrawer.js').OpenOrderDrawerOptions) => void
 *   highlightOrderId?: string | null
 * }} props
 */
function ServiceCenterPage({ sshMissingParts, onOpenSsh, highlightOrderId = null }) {
  const viewportTier = useViewportTier()
  const isPhone = viewportTier === 'phone'
  const [activeFilter, setActiveFilter] = useState(/** @type {SshQuickFilterId} */ ('all'))
  const [selectedRowId, setSelectedRowId] = useState(/** @type {string | null} */ (null))
  const [mobileCards, setMobileCards] = useState(sshMissingParts)
  const [sheetCardId, setSheetCardId] = useState(/** @type {string | null} */ (null))
  const [sheetDetail, setSheetDetail] = useState(/** @type {import('../contracts/v1/missingItem.js').MissingItemDto | null} */ (null))
  const [sheetLoading, setSheetLoading] = useState(false)
  const [sheetSaving, setSheetSaving] = useState(false)
  const [sheetError, setSheetError] = useState(/** @type {string | null} */ (null))

  useEffect(() => {
    const filter = consumeOpsDeepLink('ssh-service')
    if (filter === 'locked') setActiveFilter('locked')
    else if (filter === 'waiting') setActiveFilter('waiting')
    else if (filter === 'ready') setActiveFilter('ready')
    else if (filter === 'all') setActiveFilter('all')
  }, [])
  useEffect(() => {
    setMobileCards(sshMissingParts)
  }, [sshMissingParts])
  const { scope, setScope, canToggle, filterItems, modeHint } = usePilotDataMode()

  const scopedCards = useMemo(
    () =>
      filterItems(mobileCards, (card) =>
        getOrderPilotKind({
          id: card.orderId,
          orderNumber: card.orderNumber,
          customer: card.customer,
        }),
      ),
    [mobileCards, filterItems],
  )

  const filteredCards = useMemo(
    () => filterSshCards(scopedCards, activeFilter),
    [scopedCards, activeFilter],
  )

  const tableRows = useMemo(
    () => filteredCards.map(sshCardToErpTableRow),
    [filteredCards],
  )

  const summaryMetrics = useMemo(
    () => buildSshOpsSummary(scopedCards),
    [scopedCards],
  )

  const filterCounts = useMemo(() => {
    /** @type {Record<string, number>} */
    const counts = {}
    for (const f of SSH_QUICK_FILTERS) {
      counts[f.id] = countSshFilter(scopedCards, f.id)
    }
    return counts
  }, [scopedCards])

  const cardById = useMemo(() => new Map(filteredCards.map((c) => [c.id, c])), [filteredCards])

  const selectedRow = useMemo(
    () => tableRows.find((r) => r.id === selectedRowId) ?? tableRows[0] ?? null,
    [tableRows, selectedRowId],
  )

  useEffect(() => {
    if (tableRows.length === 0) {
      setSelectedRowId(null)
      return
    }
    if (!tableRows.some((r) => r.id === selectedRowId)) {
      setSelectedRowId(tableRows[0].id)
    }
  }, [tableRows, selectedRowId])

  useEffect(() => {
    if (!highlightOrderId) return
    const card = filteredCards.find((c) => c.orderId === highlightOrderId)
    if (card) setSelectedRowId(card.id)
  }, [highlightOrderId, filteredCards])

  const sheetCard = useMemo(
    () => filteredCards.find((card) => card.id === sheetCardId) ?? mobileCards.find((card) => card.id === sheetCardId) ?? null,
    [filteredCards, mobileCards, sheetCardId],
  )

  /** @param {string} orderId */
  function openSshWithQueue(orderId) {
    const orderIds = [...new Set(filteredCards.map((c) => c.orderId))]
    onOpenSsh(orderId, {
      tab: 'ssh',
      source: 'ssh',
      queue: buildDrawerQueue({
        queueId: `ssh:${activeFilter}`,
        filterSnapshot: { filter: activeFilter },
        rowIds: orderIds,
        activeOrderId: orderId,
        source: 'ssh',
      }),
    })
  }

  /** @param {string} metricId */
  function handleSummaryClick(metricId) {
    if (metricId === 'locked') setActiveFilter('locked')
    else if (metricId === 'completed') setActiveFilter('ready')
    else setActiveFilter('all')
  }

  /** @param {ErpOpsTableRow} row */
  function openRow(row) {
    const card = cardById.get(row.id)
    if (card) openSshWithQueue(card.orderId)
  }

  /** @param {SshMissingPartCard} card */
  async function openMobileCard(card) {
    setSheetCardId(card.id)
    setSheetLoading(true)
    setSheetError(null)
    try {
      const items = await ordersClient.getOrderMissingItems(card.orderId)
      const detail = items.find((item) => item.id === card.id) ?? items.find((item) => item.status !== 'RESOLVED') ?? null
      setSheetDetail(detail)
    } catch (error) {
      setSheetError(formatApiErrorMessage(error))
      setSheetDetail(null)
    } finally {
      setSheetLoading(false)
    }
  }

  function closeMobileCard() {
    setSheetCardId(null)
    setSheetDetail(null)
    setSheetError(null)
    setSheetLoading(false)
  }

  async function handleMobileSave(payload) {
    if (!sheetCard) return
    setSheetSaving(true)
    setSheetError(null)
    try {
      if (!sheetDetail?.id) throw new Error('SSH detay kaydı yüklenemedi')
      const response = await ordersClient.patchMissingItemStatus(sheetDetail.id, {
        status: payload.status,
        supplierNote: [payload.responsiblePerson, payload.plannedDate, payload.attachmentName, payload.supplierNote]
          .filter(Boolean)
          .join(' · '),
        ...(payload.resolutionNote ? { resolutionNote: payload.resolutionNote } : {}),
      })
      const updatedMissingItem = response?.missingItem ?? sheetDetail
      const nextCard = buildSshMissingPartCard(
        updatedMissingItem,
        /** @type {any} */ ({ id: sheetCard.orderId, customer: sheetCard.customer }),
        /** @type {any} */ ({ id: sheetCard.orderId, orderNumber: sheetCard.orderNumber, customerDisplayName: sheetCard.customer, openMissingItemsCount: sheetCard.openCountOnOrder }),
        '2026-05-14',
      )
      setSheetDetail(updatedMissingItem)
      setMobileCards((current) => current.map((card) => (card.id === sheetCard.id ? { ...card, ...nextCard } : card)))
      closeMobileCard()
    } catch (error) {
      setSheetError(formatApiErrorMessage(error))
    } finally {
      setSheetSaving(false)
    }
  }

  return (
    <div className="mos-page mos-erp-ops mos-erp-ops--ssh">
      <SectionHeader
        className="mos-erp-ops__head"
        eyebrow="SSH / Servis Merkezi"
        title="Eksik Parca Operasyonlari"
        body={`${scopedCards.length} acik kayit · ${tableRows.length} listede`}
        action={(
          <div className="mos-erp-ops__head-actions">
            <PilotScopeToggle
              scope={scope}
              onScopeChange={setScope}
              canToggle={canToggle}
              hint={modeHint}
            />
          </div>
        )}
      />

      <ErpOpsSummaryStrip
        metrics={summaryMetrics}
        ariaLabel="SSH operasyon özeti"
        onMetricClick={handleSummaryClick}
        summaryClassName="mos-erp-summary--cols-3 mos-erp-summary--ssh-kpi"
      />

      {isPhone ? (
        <div className="ssh-mobile-page">
          <ErpOpsLeftFilters
            groups={[{ title: 'Operasyon', options: SSH_QUICK_FILTERS }]}
            activeFilter={activeFilter}
            filterCounts={filterCounts}
            onFilterChange={(id) => setActiveFilter(/** @type {SshQuickFilterId} */ (id))}
            ariaLabel="Eksik parça filtreleri"
          />
          {filteredCards.length === 0 ? (
            <MobileStoreEmptyState
              context="ssh"
              onPrimary={() => setActiveFilter('all')}
              onSecondary={() => setActiveFilter('locked')}
            />
          ) : (
            <Card className="ssh-mobile-page__cards" aria-label="Eksik parça kart listesi">
              {filteredCards.map((card) => (
                <details
                  key={card.id}
                  className={`ssh-mobile-page__card${sheetCardId === card.id ? ' is-active' : ''}`}
                  onToggle={(event) => {
                    const target = /** @type {HTMLDetailsElement} */ (event.currentTarget)
                    if (target.open) setSheetCardId(card.id)
                  }}
                >
                  <summary className="ssh-mobile-page__summary" onClick={() => setSheetCardId(card.id)}>
                    <div className="ssh-mobile-page__card-head">
                      <div>
                        <p className="ssh-mobile-page__customer">{card.customer}</p>
                        <span className="ssh-mobile-page__order">{card.orderNumber}</span>
                      </div>
                      <Badge tone={card.locksShipment ? 'danger' : 'warning'}>
                        {card.locksShipment ? 'Kritik' : 'Normal'}
                      </Badge>
                    </div>
                  </summary>
                  <div className="ssh-mobile-page__rows">
                    <div className="ssh-mobile-page__row">
                      <span>Sipariş no</span>
                      <strong>{card.orderNumber}</strong>
                    </div>
                    <div className="ssh-mobile-page__row">
                      <span>Müşteri</span>
                      <strong>{card.customer}</strong>
                    </div>
                    <div className="ssh-mobile-page__row">
                      <span>Eksik parça sayısı</span>
                      <strong>{card.openCountOnOrder}</strong>
                    </div>
                    <div className="ssh-mobile-page__row">
                      <span>Öncelik</span>
                      <strong data-tone={card.locksShipment ? 'critical' : 'warning'}>{card.locksShipment ? 'Kritik' : 'Normal'}</strong>
                    </div>
                    <div className="ssh-mobile-page__row">
                      <span>Durum</span>
                      <strong>{card.statusLabel}</strong>
                    </div>
                    <div className="ssh-mobile-page__row">
                      <span>Son güncelleme</span>
                      <strong>{card.openingDateLabel}</strong>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="ssh-mobile-page__open-detail"
                    onClick={(event) => {
                      event.preventDefault()
                      event.stopPropagation()
                      void openMobileCard(card)
                    }}
                  >
                    Eksik Parça detayını aç
                  </button>
                </details>
              ))}
            </Card>
          )}
          <SshMobileActionSheet
            open={Boolean(sheetCardId) && !sheetLoading}
            card={sheetCard}
            detail={sheetDetail}
            saving={sheetSaving}
            error={sheetError}
            onClose={closeMobileCard}
            onSave={handleMobileSave}
          />
        </div>
      ) : (
        <div className="mos-erp-ops__workspace">
          <ErpOpsLeftFilters
            groups={[{ title: 'Operasyon', options: SSH_QUICK_FILTERS }]}
            activeFilter={activeFilter}
            filterCounts={filterCounts}
            onFilterChange={(id) => setActiveFilter(/** @type {SshQuickFilterId} */ (id))}
            ariaLabel="SSH filtreleri"
          />

          <div className="mos-erp-ops__main">
            <ErpOpsDetailStrip
              row={selectedRow}
              emptyLabel="Tablodan SSH kaydı seçin."
              onOpen={() => selectedRow && openRow(selectedRow)}
            />

            <Card className="mos-erp-ops__table-panel" aria-label="SSH listesi">
              <ErpOpsTable
                rows={tableRows}
                selectedRowId={selectedRow?.id ?? null}
                onSelectRow={(row) => setSelectedRowId(row.id)}
                onOpenRow={openRow}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}

export default memo(ServiceCenterPage)
