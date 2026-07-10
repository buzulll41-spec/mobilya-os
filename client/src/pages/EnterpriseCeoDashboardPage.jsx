import { useCallback, useEffect, useMemo, useState } from 'react'
import { getOperationalToday } from '../data/constants.js'
import { useOrders } from '../state/useOrders.js'
import { useShipmentPlans } from '../hooks/useShipmentPlans.jsx'
import { useViewportTier } from '../hooks/useViewportTier.js'
import { getEnterpriseCommandCenter } from '../services/enterpriseCommandCenterClient.js'
import { getLatestBoardMeetingLocal } from '../services/boardMeetingClient.js'
import { getEnterpriseReleaseReportLocal } from '../services/enterprise/EnterpriseReleaseService.js'
import { ensureDefaultBoardMeeting } from '../services/board/BoardMeetingService.js'
import {
  buildPendingApprovalQueueRows,
  loadPendingApprovalPayments,
} from '../mappers/collection/collectionPendingApprovalQueueModel.js'
import { buildExecutiveMobileView } from '../mappers/mobile/executiveMobileModel.js'
import * as ordersClient from '../services/ordersClient.js'
import ExecutiveMobileDashboard from '../components/mobile/executive/ExecutiveMobileDashboard.jsx'
import LoadingBlock from '../components/LoadingBlock.jsx'
import PageRefreshBar from '../components/PageRefreshBar.jsx'
import { toastInfo, toastSuccess } from '../lib/toastBus.js'
import { remainingBalance } from '../utils/orderFinance.js'
import '../styles/enterprise-ceo-dashboard.css'
import '../styles/executive-mobile-faz116.css'

const CEO_EMPTY = {
  decisions: 'Bugün için CEO kararı önerisi yok. Operasyon akışı dengeli görünüyor.',
  risks: 'Kritik risk tespit edilmedi. Risk motoru veriyi izlemeye devam ediyor.',
  opportunities: 'Fırsat sinyali henüz oluşmadı. Tahmin motoru yeni veri bekliyor.',
  prediction: 'Tahmin özeti henüz oluşmadı. Sipariş ve tahsilat verisi yüklendiğinde burada görünür.',
  aiBoard: 'AI Board toplantı özeti henüz yok. Board Meeting sekmesinden oturum başlatabilirsiniz.',
}

/**
 * @param {{
 *   items: unknown[]
 *   emptyMessage: string
 *   renderItem: (item: unknown, index: number) => import('react').ReactNode
 *   getKey: (item: unknown, index: number) => string
 * }} props
 */
function CeoPanelList({ items, emptyMessage, renderItem, getKey }) {
  if (!items.length) {
    return <p className="ecd__empty">{emptyMessage}</p>
  }
  return <ul>{items.map((item, index) => <li key={getKey(item, index)}>{renderItem(item, index)}</li>)}</ul>
}

/** @param {{ onNavigate?: (pageId: string) => void }} props */
export default function EnterpriseCeoDashboardPage({ onNavigate }) {
  const {
    orders,
    salesOrderListItemDtos: dtos,
    collectionRowVMs,
    domainEvents,
    mutating,
    refreshOrders,
  } = useOrders()
  const { plans } = useShipmentPlans()
  const viewportTier = useViewportTier()
  const isExecutiveMobile = viewportTier === 'phone' || viewportTier === 'tablet'
  const todayIso = getOperationalToday()
  const runtimeCtx = useMemo(() => ({ orders, dtos, todayIso }), [orders, dtos, todayIso])

  const [ecc, setEcc] = useState(null)
  const [loading, setLoading] = useState(true)
  const [lastRefresh, setLastRefresh] = useState(/** @type {string | null} */ (null))
  const [pendingPayments, setPendingPayments] = useState(
    /** @type {import('../contracts/v1/payment.js').PaymentTransactionDto[]} */ ([]),
  )
  const [approvalKey, setApprovalKey] = useState(0)

  const openCollectionRows = useMemo(
    () => collectionRowVMs.filter((r) => remainingBalance(r) > 0.009),
    [collectionRowVMs],
  )

  const load = useCallback(async () => {
    setLoading(true)
    try {
      ensureDefaultBoardMeeting(runtimeCtx)
      getEnterpriseReleaseReportLocal(runtimeCtx)
      const data = await getEnterpriseCommandCenter()
      setEcc(data)
    } finally {
      setLoading(false)
    }
  }, [runtimeCtx])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    let cancelled = false
    void loadPendingApprovalPayments(dtos).then((rows) => {
      if (!cancelled) setPendingPayments(rows)
    })
    return () => {
      cancelled = true
    }
  }, [dtos, approvalKey])

  const pendingApprovalRows = useMemo(
    () =>
      buildPendingApprovalQueueRows(openCollectionRows, domainEvents, todayIso, pendingPayments, new Map(dtos.map((d) => [d.id, d]))),
    [openCollectionRows, domainEvents, todayIso, pendingPayments, dtos],
  )

  const mobileView = useMemo(
    () =>
      buildExecutiveMobileView({
        orders,
        listItemDtos: dtos,
        collectionRows: collectionRowVMs,
        shipmentPlans: plans,
        domainEvents,
        todayIso,
        ecc,
        pendingApprovals: pendingApprovalRows,
      }),
    [orders, dtos, collectionRowVMs, plans, domainEvents, todayIso, ecc, pendingApprovalRows],
  )

  const board = getLatestBoardMeetingLocal()
  const release = getEnterpriseReleaseReportLocal(runtimeCtx)

  async function handleRefresh() {
    await load()
    setApprovalKey((k) => k + 1)
    await refreshOrders()
    setLastRefresh(new Date().toLocaleTimeString('tr-TR'))
    toastSuccess('CEO Dashboard yenilendi')
  }

  /** @param {import('../mappers/collection/collectionPendingApprovalQueueModel.js').PendingApprovalQueueRow} row */
  async function handleApprove(row) {
    await ordersClient.approveOrderPayment(row.orderId, row.paymentId, { approvalNote: 'CEO mobil onay' })
    setApprovalKey((k) => k + 1)
    await refreshOrders()
    toastSuccess('Tahsilat onaylandı')
  }

  /** @param {import('../mappers/collection/collectionPendingApprovalQueueModel.js').PendingApprovalQueueRow} row */
  async function handleReject(row) {
    await ordersClient.rejectOrderPayment(row.orderId, row.paymentId, {
      rejectionNote: 'CEO mobil red',
    })
    setApprovalKey((k) => k + 1)
    await refreshOrders()
    toastInfo('Tahsilat reddedildi', 'info')
  }

  /** @param {import('../mappers/collection/collectionPendingApprovalQueueModel.js').PendingApprovalQueueRow} row */
  function handleReview(row) {
    onNavigate?.('collection')
    window.location.hash = `#page=collection&order=${encodeURIComponent(row.orderId)}`
  }

  /** @param {'meeting-note' | 'voice-note' | 'reminder'} action */
  function handleCeoFab(action) {
    if (action === 'meeting-note') {
      onNavigate?.('ceo-copilot')
      toastInfo('Board Meeting sekmesine yönlendirildi', 'info')
      return
    }
    if (action === 'voice-note') {
      toastInfo('Sesli not: Copilot sohbetine dikte edebilirsiniz.', 'info')
      onNavigate?.('ceo-copilot')
      return
    }
    toastSuccess('Hatırlatma kaydedildi — Copilot görev listesine eklendi')
  }

  if (loading && !ecc) {
    return <LoadingBlock label="CEO Dashboard yükleniyor…" />
  }

  const health = ecc?.companyHealthScore ?? release?.finalScore.systemHealth ?? 0
  const decisions = ecc?.todayActions ?? []
  const risks = ecc?.criticalRisks ?? []
  const opportunities = ecc?.opportunities ?? []
  const briefing = ecc?.managementBriefing ?? []

  return (
    <div className="ecd">
      <PageRefreshBar
        title="CEO Dashboard yenile"
        onRefresh={handleRefresh}
        refreshing={loading}
        updatedAt={lastRefresh}
      />

      {isExecutiveMobile ? (
        <ExecutiveMobileDashboard
          view={mobileView}
          healthScore={health}
          onNavigate={onNavigate}
          onApprove={handleApprove}
          onReject={handleReject}
          onReview={handleReview}
          onCeoFabAction={handleCeoFab}
          mutating={mutating}
        />
      ) : null}

      <div className={`ecd__desktop-only${isExecutiveMobile ? '' : ''}`}>
      <header className="ecd__head">
        <div>
          <p className="ecd__kicker">MOBILYA OS Enterprise 1.0</p>
          <h1>CEO Dashboard</h1>
        </div>
        <div className="ecd__health">
          <span>Company Health</span>
          <strong>{health}</strong>
        </div>
        <div className="ecd__health">
          <span>Company Score</span>
          <strong>{release?.finalScore.totalScore ?? health}</strong>
        </div>
      </header>

      <div className="ecd__actions">
        <button type="button" className="mos-btn mos-btn-primary" onClick={() => onNavigate?.('ceo-copilot')}>CEO Copilot</button>
        <button type="button" className="mos-btn mos-btn-ghost" onClick={() => onNavigate?.('ceo-copilot')}>Board Meeting</button>
        <button type="button" className="mos-btn mos-btn-ghost" onClick={() => onNavigate?.('enterprise-release')}>Enterprise Release</button>
        <button type="button" className="mos-btn mos-btn-ghost" onClick={() => onNavigate?.('digital-workforce')}>Digital Workforce</button>
      </div>

      <div className="ecd__grid">
        <section className="ecd__panel">
          <h2>Today&apos;s Decisions</h2>
          <CeoPanelList
            items={decisions.slice(0, 5)}
            emptyMessage={CEO_EMPTY.decisions}
            getKey={(d, i) => d?.id ?? d?.title ?? `decision-${i}`}
            renderItem={(d) => d?.title ?? d?.label ?? d?.message ?? d?.action ?? '—'}
          />
        </section>
        <section className="ecd__panel ecd__panel--risk">
          <h2>Today&apos;s Risks</h2>
          <CeoPanelList
            items={risks.slice(0, 5)}
            emptyMessage={CEO_EMPTY.risks}
            getKey={(r, i) => r?.id ?? r?.title ?? `risk-${i}`}
            renderItem={(r) => r?.title ?? r?.message ?? '—'}
          />
        </section>
        <section className="ecd__panel ecd__panel--opp">
          <h2>Today&apos;s Opportunities</h2>
          <CeoPanelList
            items={opportunities.slice(0, 5)}
            emptyMessage={CEO_EMPTY.opportunities}
            getKey={(o, i) => o?.id ?? o?.title ?? `opp-${i}`}
            renderItem={(o) => o?.title ?? o?.message ?? '—'}
          />
        </section>
      </div>

      <div className="ecd__grid ecd__grid--2">
        <section className="ecd__panel">
          <h2>Prediction</h2>
          <p className="ecd__body-text">
            {briefing[0] ?? ecc?.commandDecision ?? CEO_EMPTY.prediction}
          </p>
        </section>
        <section className="ecd__panel">
          <h2>AI Board</h2>
          <p className="ecd__body-text">
            {board?.executiveSummary?.headline ?? CEO_EMPTY.aiBoard}
          </p>
          {board?.executiveSummary?.topDecisions?.[0] ? (
            <small>{board.executiveSummary.topDecisions[0]}</small>
          ) : null}
        </section>
      </div>
      </div>
    </div>
  )
}
