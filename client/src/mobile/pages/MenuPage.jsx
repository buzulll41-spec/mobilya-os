import { useMemo } from 'react'
import { useAuth } from '../../state/AuthProvider.jsx'
import { useOrders } from '../../state/useOrders.js'
import { useOfflineFirst } from '../../state/OfflineFirstProvider.jsx'
import { toastInfo, toastSuccess } from '../../lib/toastBus.js'
import { AppHeader, MobileScreenShell, PrimaryListItem, Badge, ErrorState, OfflineState } from '../design-system/MobileOpsV2Components.jsx'
import '../../styles/orders-mobile-v1.css'

/**
 * @param {{
 *   onNavigate: (page: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'ssh' | 'warehouse' | 'reports') => void
 *   onOpenOrderModal: () => void
 * }} props
 */
export default function MenuPage({ onNavigate, onOpenOrderModal }) {
  const { user, logout } = useAuth()
  const { operationalTasks, salesOrderListItemDtos, dataPipeline } = useOrders()
  const { pendingCount, conflictCount, syncing, forceSync } = useOfflineFirst()

  const stats = useMemo(() => {
    const notifications = operationalTasks.filter((task) => task.priority === 'CRITICAL' || task.priority === 'HIGH').length
    return {
      notifications,
      users: 1,
      records: salesOrderListItemDtos.length,
    }
  }, [operationalTasks, salesOrderListItemDtos])

  const menuGroups = [
    {
      id: 'operations',
      label: 'Operasyon',
      items: [
        { id: 'collection', title: 'Tahsilat', detail: 'Bekleyen tahsilat akislari', action: () => onNavigate('collection') },
        { id: 'shipment', title: 'Sevkiyat', detail: 'Plan ve teslim operasyonlari', action: () => onNavigate('shipment') },
        { id: 'service', title: 'Servis', detail: 'Acik servis kayitlari', action: () => onNavigate('service') },
        { id: 'ssh', title: 'SSH', detail: 'Eksik parca ve issue takibi', action: () => onNavigate('ssh') },
      ],
    },
    {
      id: 'sales',
      label: 'Satis',
      items: [
        { id: 'orders', title: 'Siparisler', detail: 'Tum siparis akisini ac', action: () => onNavigate('orders') },
        { id: 'customers', title: 'Musteriler', detail: 'Musteri kartlari ve bakiye', action: () => onNavigate('customers') },
        { id: 'create', title: 'Yeni Siparis', detail: 'Mobil hizli kayit baslat', action: onOpenOrderModal },
      ],
    },
    {
      id: 'management',
      label: 'Yonetim',
      items: [
        { id: 'notifications', title: 'Bildirimler', detail: `${stats.notifications} oncelikli bildirim`, action: () => onNavigate('service') },
        { id: 'settings', title: 'Ayarlar', detail: syncing ? 'Senkronizasyon suruyor' : `Bekleyen: ${pendingCount} · Catisma: ${conflictCount}`, action: async () => {
          await forceSync()
          toastSuccess('Senkronizasyon tetiklendi')
        } },
        { id: 'pipeline', title: 'Canli Veri Pipeline', detail: `Katman: ${dataPipeline.layer.toUpperCase()}${dataPipeline.usedFallback ? ' · fallback aktif' : ''}`, action: () => onNavigate('home') },
        { id: 'reports', title: 'Raporlar', detail: 'Operasyon ozetleri ve trendler', action: () => onNavigate('reports') },
        { id: 'users', title: 'Kullanicilar', detail: `${stats.users} aktif kullanici · ${user?.fullName ?? 'Bilinmiyor'}`, action: () => toastInfo('Kullanici yonetimi yakinda genisletilecek') },
      ],
    },
    {
      id: 'stock',
      label: 'Stok ve Tedarik',
      items: [
        { id: 'warehouse', title: 'Depo', detail: `${stats.records} siparis kaydi`, action: () => onNavigate('warehouse') },
        { id: 'supply', title: 'Tedarik', detail: 'Tedarik operasyonlarini ac', action: () => onNavigate('warehouse') },
        { id: 'incoming', title: 'Gelen Urun', detail: 'Gelen urun kayitlarina git', action: () => onNavigate('warehouse') },
      ],
    },
  ]

  const initials = useMemo(() => {
    const raw = String(user?.fullName ?? '').trim()
    if (!raw) return 'MO'
    const parts = raw.split(/\s+/).filter(Boolean)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase()
  }, [user?.fullName])

  return (
    <section className="mos-page evm-order-list-v1 evm-orders-v2" aria-label="Mobile Settings">
      <MobileScreenShell
        header={<AppHeader eyebrow="Yonetim" title="Ayarlar" subtitle="Tum moduller tek mobil akista bagli" meta={`${user?.role ?? 'USER'} • ${user?.fullName ?? 'Bilinmiyor'}`} initials={initials} onOpenMenu={() => onNavigate('menu')} />}
        primary={
          <>
            {pendingCount > 0 || conflictCount > 0 ? (
              <OfflineState title="Offline kuyruk aktif" description={`Bekleyen: ${pendingCount} · Catisma: ${conflictCount}`} actionLabel="Senkronize et" onAction={async () => { await forceSync(); toastSuccess('Senkronizasyon tetiklendi') }} />
            ) : null}
            {menuGroups.map((group) => (
              <section key={group.id} className="evm-menu-v2-group" aria-label={group.label}>
                <h2 className="evm-menu-v2-group__title">{group.label}</h2>
                <ul className="evm-order-list-v1__cards" aria-label={`${group.label} baglantilari`}>
                  {group.items.map((item) => (
                    <li key={item.id}>
                      <PrimaryListItem
                        className="evm-order-list-v1__card-row"
                        title={item.title}
                        subtitle={item.detail}
                        metaLeft="Menu"
                        metaRight="Git"
                        badge={item.id === 'service' ? <Badge label="Oncelik" tone={stats.notifications > 0 ? 'orange' : 'green'} count={stats.notifications} /> : undefined}
                        onPress={item.action}
                      />
                    </li>
                  ))}
                </ul>
              </section>
            ))}
            <ul className="evm-order-list-v1__cards" aria-label="Hesap baglantilari">
              <li>
                <PrimaryListItem
                  className="evm-order-list-v1__card-row"
                  title="Cikis"
                  subtitle="Oturumu guvenli sekilde kapat"
                  metaLeft="Hesap"
                  metaRight="Git"
                  onPress={logout}
                />
              </li>
            </ul>
          </>
        }
      />
    </section>
  )
}
