import { memo } from 'react'
import ActiveOrdersSection from '../components/ActiveOrdersSection.jsx'
import { IconPlus } from '../components/Icons.jsx'
import RiskMerkezi from '../components/RiskMerkezi.jsx'
import TodayOperations from '../components/TodayOperations.jsx'
import { dashboardTodaySales, formatTry } from '../data/index.js'

/** @typedef {import('../data/seedOrders.js').Order} Order */

/**
 * @param {{
 *   activeOrders: Order[]
 *   overdueRisk: Order[]
 *   underpaidRisk: Order[]
 *   missingOrders: Order[]
 *   todayDeliveries: Order[]
 *   montajEkipleri: { id: string; ad: string; uyeler: string; saat: string; not: string }[]
 *   todayIso: string
 *   kpis: { pendingCollection: number; overdueOrders: number; tomorrowShipments: number }
 *   onOpenOrderModal: () => void
 *   onOrderSelect: (order: Order) => void
 * }} props
 */
function DashboardPage({
  activeOrders,
  overdueRisk,
  underpaidRisk,
  missingOrders,
  todayDeliveries,
  montajEkipleri,
  todayIso,
  kpis,
  onOpenOrderModal,
  onOrderSelect,
}) {
  return (
    <>
      <div className="mos-dash">
        <header className="mos-dash-head">
          <div className="mos-dash-intro">
            <h1 className="mos-page-title">Günün özeti</h1>
            <p className="mos-page-sub">
              Operasyon, finans ve sevk tek çatıda — hızlı karar için tasarlandı.
            </p>
          </div>
          <button type="button" className="mos-btn mos-btn-primary" onClick={onOpenOrderModal}>
            <IconPlus />
            Sipariş ekle
          </button>
        </header>

        <div className="mos-grid-kpi">
          <article className="mos-card mos-kpi mos-kpi--sales mos-kpi--elevated mos-card--saas">
            <p className="mos-kpi-label">Bugünkü satış</p>
            <p className="mos-kpi-value">{formatTry(dashboardTodaySales)}</p>
            <p className="mos-kpi-hint">Kasa + POS</p>
          </article>
          <article className="mos-card mos-kpi mos-kpi--collect mos-kpi--elevated mos-card--saas">
            <p className="mos-kpi-label">Bekleyen tahsilat</p>
            <p className="mos-kpi-value">{formatTry(kpis.pendingCollection)}</p>
            <p className="mos-kpi-hint">Kalan bakiye toplamı</p>
          </article>
          <article className="mos-card mos-kpi mos-kpi--late mos-kpi--elevated mos-card--saas">
            <p className="mos-kpi-label">Geciken sipariş</p>
            <p className="mos-kpi-value">{kpis.overdueOrders}</p>
            <p className="mos-kpi-hint">Termin aşımı</p>
          </article>
          <article className="mos-card mos-kpi mos-kpi--ship mos-kpi--elevated mos-card--saas">
            <p className="mos-kpi-label">Yarınki sevk</p>
            <p className="mos-kpi-value">{kpis.tomorrowShipments}</p>
            <p className="mos-kpi-hint">Yükleme planı</p>
          </article>
        </div>

        <RiskMerkezi
          overdue={overdueRisk}
          underpaid={underpaidRisk}
          missing={missingOrders}
          onOrderClick={onOrderSelect}
        />

        <div className="mos-dash-split mos-dash-split--today">
          <TodayOperations
            todayIso={todayIso}
            deliveries={todayDeliveries}
            missing={missingOrders}
            crews={montajEkipleri}
            onOrderClick={onOrderSelect}
          />
        </div>
      </div>

      <ActiveOrdersSection
        orders={activeOrders}
        todayIso={todayIso}
        onOrderSelect={onOrderSelect}
      />
    </>
  )
}

export default memo(DashboardPage)
