import { useEffect, useRef, useState } from 'react'
import { IconBell } from './Icons.jsx'

/**
 * @param {{ items?: { id: string; title: string; body: string; time: string }[] }} props
 */
export default function NotificationDropdown({ items = [] }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)

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

  return (
    <div className="mos-notif-dd" ref={rootRef}>
      <button
        type="button"
        className={`mos-icon-btn${open ? ' mos-icon-btn--open' : ''}`}
        aria-expanded={open}
        aria-haspopup="true"
        aria-label="Bildirimler"
        onClick={() => setOpen((v) => !v)}
      >
        <IconBell />
        <span className="mos-icon-btn-badge" aria-hidden />
      </button>
      {open ? (
        <div className="mos-notif-panel" role="menu" aria-label="Son bildirimler">
          <div className="mos-notif-panel-head">
            <span className="mos-notif-panel-title">Bildirimler</span>
            <span className="mos-notif-panel-meta">Demo</span>
          </div>
          <ul className="mos-notif-list">
            {items.map((n) => (
              <li key={n.id}>
                <button type="button" className="mos-notif-row" role="menuitem">
                  <span className="mos-notif-row-title">{n.title}</span>
                  <span className="mos-notif-row-body">{n.body}</span>
                  <span className="mos-notif-row-time">{n.time}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  )
}
