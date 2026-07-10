import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IconBell } from './Icons.jsx'
import {
  getReadNotificationIds,
  getUnreadNotificationCount,
  markAllNotificationsRead,
  markNotificationRead,
  notificationTypeLabel,
  resolveNotificationType,
} from '../services/notificationCenterStore.js'

/**
 * @typedef {{
 *   id: string
 *   title: string
 *   body: string
 *   time: string
 *   orderId?: string
 *   severity?: string
 *   suggestedAction?: string
 * }} NotificationItem
 */

/**
 * @param {{
 *   items?: NotificationItem[]
 *   onNavigate?: (page: string, ctx?: { orderId?: string }) => void
 * }} props
 */
function NotificationDropdown({ items = [], onNavigate }) {
  const [open, setOpen] = useState(false)
  const [readIds, setReadIds] = useState(getReadNotificationIds)
  const rootRef = useRef(null)

  const unreadCount = useMemo(
    () => getUnreadNotificationCount(items, readIds),
    [items, readIds],
  )

  useEffect(() => {
    if (!open) return
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(/** @type {Node} */ (e.target))) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  const handleOpen = useCallback(() => {
    setOpen((v) => !v)
  }, [])

  const handleSelect = useCallback(
    (item) => {
      markNotificationRead(item.id)
      setReadIds(getReadNotificationIds())
      setOpen(false)
      if (item.orderId) {
        onNavigate?.('orders', { orderId: item.orderId })
      }
    },
    [onNavigate],
  )

  const handleMarkAll = useCallback(() => {
    markAllNotificationsRead(items.map((n) => n.id))
    setReadIds(getReadNotificationIds())
  }, [items])

  return (
    <div className="mos-notif-dd" ref={rootRef}>
      <button
        type="button"
        className={`mos-icon-btn${open ? ' mos-icon-btn--open' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label={`Bildirimler${unreadCount ? `, ${unreadCount} okunmamış` : ''}`}
        onClick={handleOpen}
        style={{ position: 'relative' }}
      >
        <IconBell />
        {unreadCount > 0 ? (
          <span className="mos-icon-btn-badge mos-icon-btn-badge--count" aria-hidden>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        ) : null}
      </button>
      {open ? (
        <div className="mos-notif-panel" role="menu" aria-label="Bildirim merkezi">
          <div className="mos-notif-panel-head">
            <span className="mos-notif-panel-title">Bildirim Merkezi</span>
            <div className="mos-notif-panel-head-actions">
              {unreadCount > 0 ? (
                <button type="button" className="mos-notif-mark-all" onClick={handleMarkAll}>
                  Tümünü okundu işaretle
                </button>
              ) : null}
            </div>
          </div>
          <ul className="mos-notif-list">
            {items.length === 0 ? (
              <li>
                <p className="mos-notif-row-body" style={{ padding: '0.75rem 0.85rem' }}>
                  Bildirim yok
                </p>
              </li>
            ) : (
              items.map((n) => {
                const type = resolveNotificationType(n.severity)
                const unread = !readIds.has(n.id)
                return (
                  <li key={n.id}>
                    <button
                      type="button"
                      className={`mos-notif-row${unread ? ' mos-notif-row--unread' : ''}`}
                      role="menuitem"
                      onClick={() => handleSelect(n)}
                    >
                      <span className="mos-notif-row-inner">
                        <span
                          className={`mos-notif-type-dot mos-notif-type-dot--${type}`}
                          title={notificationTypeLabel(type)}
                          aria-hidden
                        />
                        <span className="mos-notif-row-content">
                          <span className="mos-notif-row-title">{n.title}</span>
                          <span className="mos-notif-row-body">{n.body}</span>
                          <span className="mos-notif-row-time">{n.time}</span>
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })
            )}
          </ul>
        </div>
      ) : null}
    </div>
  )
}

export default memo(NotificationDropdown)
