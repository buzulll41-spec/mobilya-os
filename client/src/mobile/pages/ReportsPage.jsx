import { useMemo, useState } from 'react'
import { formatTry } from '../../data/dashboardHelpers.js'
import { useAuth } from '../../state/AuthProvider.jsx'
import { useOrders } from '../../state/useOrders.js'
import {
  AppHeader,
  MetricCard,
  MobileScreenShell,
  PrimaryListItem,
  Tabs,
} from '../design-system/MobileOpsV2Components.jsx'
import '../../styles/orders-mobile-v1.css'

const REPORT_CARDS = [
  { id: 'daily-sales', icon: '📈', title: 'Gunluk Satis' },
  { id: 'collections', icon: '💳', title: 'Tahsilat' },
  { id: 'shipments', icon: '🚚', title: 'Sevkiyat' },
  { id: 'service', icon: '🛠️', title: 'Servis' },
  { id: 'stock', icon: '📦', title: 'Stok' },
  { id: 'profitability', icon: '💹', title: 'Karlilik' },
]

/** @param {string} id */
function reportSummaryTitle(id) {
  if (id === 'daily-sales') return 'Gunluk satis ozeti'
  if (id === 'collections') return 'Tahsilat performansi'
  if (id === 'shipments') return 'Sevkiyat durumu'
  if (id === 'service') return 'Servis ve eksik parca takibi'
  if (id === 'stock') return 'Stok baskisi'
  return 'Karlilik gorunumu'
}

export default function ReportsPage() {
  const { user } = useAuth()
  const { salesOrderListItemDtos, collectionRowVMs, shipmentQueueRows } = useOrders()
  const [activeReport, setActiveReport] = useState('daily-sales')

  const userInitials = useMemo(() => {
    const raw = String(user?.fullName ?? '').trim()
    if (!raw) return 'MO'
    const parts = raw.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }, [user?.fullName])

  const stats = useMemo(() => {
    const totalSales = salesOrderListItemDtos.reduce(
      (sum, dto) => sum + Number(dto.totalAmount?.value ?? 0),
      0,
    )
    const totalCollected = salesOrderListItemDtos.reduce(
      (sum, dto) => sum + Number(dto.amountPaid?.value ?? 0),
      0,
    )
    const remainingCollection = collectionRowVMs.reduce(
      (sum, row) => sum + Number(row.remainingAmount?.value ?? 0),
      0,
    )
    const shipmentToday = shipmentQueueRows.filter((row) => row.plannedShipDate).length
    const inTransit = shipmentQueueRows.filter((row) => String(row.shipmentStatus).toUpperCase() === 'DISPATCHED').length
    const serviceOpen = salesOrderListItemDtos.reduce((sum, dto) => sum + Number(dto.openMissingItemsCount ?? 0), 0)
    const criticalRisk = salesOrderListItemDtos.filter((dto) => {
      const risk = String(dto.currentRiskSeverity ?? '').toUpperCase()
      return risk === 'HIGH' || risk === 'CRITICAL'
    }).length

    return {
      totalSales,
      totalCollected,
      remainingCollection,
      shipmentToday,
      inTransit,
      serviceOpen,
      criticalRisk,
    }
  }, [salesOrderListItemDtos, collectionRowVMs, shipmentQueueRows])

  const reportKpis = useMemo(() => {
    if (activeReport === 'daily-sales') {
      return [
        { label: 'Toplam Satis', value: formatTry(stats.totalSales) },
        { label: 'Acik Siparis', value: String(salesOrderListItemDtos.length) },
      ]
    }
    if (activeReport === 'collections') {
      return [
        { label: 'Toplam Tahsilat', value: formatTry(stats.totalCollected) },
        { label: 'Bekleyen', value: formatTry(stats.remainingCollection) },
      ]
    }
    if (activeReport === 'shipments') {
      return [
        { label: 'Planli Sevkiyat', value: String(stats.shipmentToday) },
        { label: 'Yolda', value: String(stats.inTransit) },
      ]
    }
    if (activeReport === 'service') {
      return [
        { label: 'Acik Servis', value: String(stats.serviceOpen) },
        { label: 'Kritik Risk', value: String(stats.criticalRisk) },
      ]
    }
    if (activeReport === 'stock') {
      return [
        { label: 'Eksik Parca', value: String(stats.serviceOpen) },
        { label: 'Kritik Risk', value: String(stats.criticalRisk) },
      ]
    }
    return [
      { label: 'Toplam Satis', value: formatTry(stats.totalSales) },
      { label: 'Tahsilat', value: formatTry(stats.totalCollected) },
    ]
  }, [activeReport, stats, salesOrderListItemDtos.length])

  return (
    <section className="mos-page evm-order-list-v1 evm-orders-v2" aria-label="Mobile Reports">
      <MobileScreenShell
        header={<AppHeader eyebrow="Analiz" title="Raporlar" subtitle="Tek dokunusla operasyon raporlari" meta="Yonetim gorunumu • Merkez Magaza" initials={userInitials} onOpenMenu={() => { window.location.hash = '#/mobile/menu' }} />}
        filter={<Tabs items={REPORT_CARDS.map((card) => ({ id: card.id, label: card.title }))} activeId={activeReport} onSelect={setActiveReport} />}
        primary={
          <ul className="evm-order-list-v1__cards" aria-label="Rapor kartlari">
            {REPORT_CARDS.map((card) => (
              <li key={card.id}>
                <PrimaryListItem
                  className="evm-order-list-v1__card-row"
                  title={card.title}
                  subtitle={reportSummaryTitle(card.id)}
                  metaLeft="Canli operasyon verisi"
                  metaRight={card.icon}
                  onPress={() => setActiveReport(card.id)}
                />
              </li>
            ))}
          </ul>
        }
        secondary={
          <div className="evm-v2-inline-metrics">
            <MetricCard title={reportKpis[0]?.label ?? 'Metrik'} value={reportKpis[0]?.value ?? '—'} detail={reportSummaryTitle(activeReport)} />
            <MetricCard title={reportKpis[1]?.label ?? 'Metrik'} value={reportKpis[1]?.value ?? '—'} detail="Canli API verisinden olusan mobil ozet" />
          </div>
        }
      />
    </section>
  )
}
