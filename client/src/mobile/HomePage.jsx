import { useEffect, useMemo, useState } from 'react'
import { useAuth } from '../state/AuthProvider.jsx'
import { useOrders } from '../state/useOrders.js'
import { getOperationalToday } from '../data/index.js'
import { buildMobileOperationCenterTasks } from '../mappers/mobile/mobileOperationHubModel.js'
import { buildLiveOperationSnapshot } from '../application/live/operationDecisionEngine.js'
import {
  appendMobileLiveNotification,
  readMobileNotificationPreferences,
} from '../services/mobile/mobileNotificationCenterStore.js'
import {
  AppHeader,
  EmptyState,
  LoadingSkeleton,
  MobileScreenShell,
  PrimaryActionCard,
  SectionHeader,
} from './design-system/MobileOpsV2Components.jsx'
import { initialsFrom, roleLabel } from './utils/mobileIdentity.js'
import '../styles/orders-mobile-v1.css'

const LIVE_EVENT_CHECKPOINT_KEY = 'mos-live-operation-event-checkpoint-v1'

/** @param {string} level */
function toneFromLevel(level) {
  if (level.includes('KRITIK')) return 'red'
  if (level.includes('BUGUN')) return 'orange'
  if (level.includes('SERVIS')) return 'green'
  return 'blue'
}

/**
 * @param {{
 *   onNavigate: (page: 'home' | 'orders' | 'customers' | 'menu' | 'collection' | 'shipment' | 'service' | 'reports') => void
 * }} props
 */
export default function HomePage({ onNavigate }) {
  const { user } = useAuth()
  const {
    salesOrderListItemDtos,
    collectionRowVMs,
    shipmentQueueRows,
    domainEvents,
    dataPipeline,
    loading,
  } = useOrders()
  const [showAll, setShowAll] = useState(false)

  const todayIso = getOperationalToday()

  const tasks = useMemo(
    () =>
      buildMobileOperationCenterTasks({
        listItemDtos: salesOrderListItemDtos,
        collectionRows: collectionRowVMs,
        todayIso,
        currentUserName: user?.fullName ?? '',
      }),
    [salesOrderListItemDtos, collectionRowVMs, todayIso, user?.fullName],
  )

  const liveSnapshot = useMemo(
    () =>
      buildLiveOperationSnapshot({
        listItemDtos: salesOrderListItemDtos,
        collectionRows: collectionRowVMs,
        shipmentRows: shipmentQueueRows,
        operationTasks: tasks,
        domainEvents,
        todayIso,
      }),
    [salesOrderListItemDtos, collectionRowVMs, shipmentQueueRows, tasks, domainEvents, todayIso],
  )

  const criticalCount = useMemo(
    () => liveSnapshot.prioritizedOperations.filter((op) => op.score >= 80).length,
    [liveSnapshot],
  )

  const initials = useMemo(() => initialsFrom(user?.fullName ?? ''), [user?.fullName])
  const role = useMemo(() => roleLabel(user?.role), [user?.role])

  const actionCards = useMemo(() => {
    const baseCards = liveSnapshot.firstFiveCards
    const runbookCards = liveSnapshot.runbook.slice(0, 5).map((step) => ({
      id: `${step.id}-card`,
      level: step.blocked ? '🟢 SERVIS' : '🟠 BUGUN',
      title: `${step.step}. ${step.title}`,
      subtitle: step.ruleMessage ? `Kural: ${step.ruleMessage}` : `Skor ${step.score} ile operasyon sirasinda`,
      relatedPerson: step.blocked ? 'Kural motoru onayi gerekli' : 'Operasyon Ekibi',
      amountLabel: String(step.score),
      dueDateLabel: 'Bugun',
      hash: step.hash,
    }))
    return [...baseCards, ...runbookCards]
  }, [liveSnapshot])

  useEffect(() => {
    if (liveSnapshot.notifications.length === 0) return
    const prefs = readMobileNotificationPreferences()
    let seen = new Set()
    try {
      const seenRaw = localStorage.getItem(LIVE_EVENT_CHECKPOINT_KEY)
      const parsed = JSON.parse(seenRaw || '[]')
      seen = new Set(Array.isArray(parsed) ? parsed : [])
    } catch {
      seen = new Set()
    }
    let changed = false

    for (const notification of liveSnapshot.notifications) {
      if (!notification?.eventId || seen.has(notification.eventId)) continue
      appendMobileLiveNotification(
        {
          type: notification.type,
          title: notification.title,
          body: notification.body,
          navTarget: notification.navTarget,
          navFilter: notification.navFilter,
        },
        prefs,
      )
      seen.add(notification.eventId)
      changed = true
    }

    if (changed) {
      localStorage.setItem(LIVE_EVENT_CHECKPOINT_KEY, JSON.stringify([...seen].slice(-200)))
    }
  }, [liveSnapshot.notifications])

  const visibleCards = useMemo(() => actionCards.slice(0, 4), [actionCards])
  const hiddenCards = useMemo(() => actionCards.slice(4), [actionCards])

  function navigateByHash(hashValue) {
    window.location.hash = hashValue
  }

  return (
    <section className="mos-page evm-order-list-v1 evm-orders-v2" aria-label="Mobile Home">
      <MobileScreenShell
        header={
          <AppHeader
            eyebrow="Operation Center"
            title="Ana Sayfa"
            subtitle={`Canli operasyon modu · ${dataPipeline.layer.toUpperCase()}`}
            meta={`${role} • Merkez Magaza`}
            unreadCount={criticalCount}
            initials={initials}
            onOpenMenu={() => onNavigate('menu')}
          />
        }
        primary={
          <>
            <SectionHeader
              title="Ilk 5 Saniyede Basla"
              subtitle="Kartin tamamina dokun ve ise gec"
              onAction={hiddenCards.length > 0 ? () => setShowAll((value) => !value) : undefined}
              actionLabel={showAll ? 'Daralt' : 'Tumunu Gor'}
            />
            {liveSnapshot.rules.length > 0 ? (
              <p className="evm-order-list-v1__helper-text">
                {liveSnapshot.rules[0]}
              </p>
            ) : null}
            <ul className="evm-order-list-v1__cards evm-v2-action-stack" aria-label="Ana sayfa operasyon aksiyonlari">
              {loading ? (
                <li className="evm-order-list-v1__skeleton-wrap"><LoadingSkeleton rows={6} /></li>
              ) : visibleCards.length === 0 ? (
                <li className="evm-order-list-v1__empty">
                  <EmptyState
                    title="Baslatilacak operasyon bulunamadi"
                    description="Veri geldikten sonra bu alan otomatik olarak aksiyon kartlariyla dolar."
                  />
                </li>
              ) : (
                visibleCards.map((card, index) => (
                  <li key={card.id}>
                    <PrimaryActionCard
                      title={card.title}
                      subtitle={card.subtitle}
                      priority={card.level}
                      priorityTone={toneFromLevel(card.level)}
                      relatedPerson={card.relatedPerson}
                      amountLabel={card.amountLabel}
                      dueDateLabel={card.dueDateLabel}
                      onPress={() => navigateByHash(card.hash)}
                      buttonProps={{ 'data-testid': index === 0 ? 'home-first-action-card' : `home-action-card-${index + 1}` }}
                    />
                  </li>
                ))
              )}
            </ul>

            {showAll && hiddenCards.length > 0 ? (
              <ul className="evm-order-list-v1__cards evm-v2-action-stack" aria-label="Ana sayfa tum aksiyonlar">
                {hiddenCards.map((card, index) => (
                  <li key={`${card.id}-extra-${index}`}>
                    <PrimaryActionCard
                      title={card.title}
                      subtitle={card.subtitle}
                      priority={card.level}
                      priorityTone={toneFromLevel(card.level)}
                      relatedPerson={card.relatedPerson}
                      amountLabel={card.amountLabel}
                      dueDateLabel={card.dueDateLabel}
                      onPress={() => navigateByHash(card.hash)}
                      buttonProps={{ 'data-testid': `home-action-card-extra-${index + 1}` }}
                    />
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        }
      />
    </section>
  )
}
