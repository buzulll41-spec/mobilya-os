import { useCallback, useEffect, useMemo, useState } from 'react'
import { getOperationalToday } from '../data/constants.js'
import { processCeoCopilotMessage } from '../services/ceo-copilot/CeoCopilotEngine.js'
import {
  setActiveConversationId,
  startNewConversation,
  subscribeCeoCopilotStore,
} from '../services/ceo-copilot/ceoCopilotStore.js'
import {
  buildCeoCopilotHeaderVm,
  buildCeoCopilotSidebarVm,
  buildCeoCopilotThreadVm,
} from '../mappers/ceo-copilot/ceoCopilotModel.js'
import BoardMeetingPanel from '../features/board/BoardMeetingPanel.jsx'
import '../styles/ceo-copilot.css'

const CEO_COPILOT_TABS = [
  { id: 'chat', label: 'Sohbet' },
  { id: 'board-meeting', label: 'Board Meeting' },
]

const QUICK_PROMPTS = [
  'Bugün sorun ne?',
  'Bugün ne yapmalıyım?',
  'Riskler neler?',
  'Collection ne durumda?',
  'Şirket sağlığı nasıl?',
  'Detay göster',
]

/**
 * @param {{
 *   orders: import('../data/seedOrders.js').Order[]
 *   dtos: import('../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   collectionRows?: import('../contracts/v1/collectionRowVm.js').CollectionRowVM[]
 *   shipmentRows?: import('../contracts/v1/shipmentRowVm.js').ShipmentRowVM[]
 *   onNavigate?: (pageId: string) => void
 * }} props
 */
export default function CeoCopilotPage({ orders, dtos, collectionRows = [], shipmentRows = [], onNavigate }) {
  const todayIso = getOperationalToday()
  const [version, setVersion] = useState(0)
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')

  useEffect(() => {
    const unsub = subscribeCeoCopilotStore(() => setVersion((v) => v + 1))
    return unsub
  }, [])

  void version

  const sidebar = useMemo(() => buildCeoCopilotSidebarVm(), [version])
  const thread = useMemo(() => buildCeoCopilotThreadVm(), [version])
  const header = useMemo(() => buildCeoCopilotHeaderVm(), [version])

  const runtimeCtx = useMemo(
    () => ({ orders, dtos, collectionRows, shipmentRows, todayIso }),
    [orders, dtos, collectionRows, shipmentRows, todayIso],
  )

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim()
      if (!trimmed || sending) return
      setSending(true)
      try {
        const result = await processCeoCopilotMessage(trimmed, runtimeCtx)
        if (result.deepLinks?.[0] && /detay|göster/.test(trimmed.toLowerCase())) {
          /* navigation optional on explicit detail */
        }
        setInput('')
        setVersion((v) => v + 1)
      } finally {
        setSending(false)
      }
    },
    [runtimeCtx, sending],
  )

  const openDeepLink = useCallback(
    (link) => {
      if (link.hash) {
        window.location.hash = link.hash.replace(/^#/, '')
      }
      onNavigate?.(link.pageId)
    },
    [onNavigate],
  )

  return (
    <div className="ceo-copilot">
      <aside className="ceo-copilot__sidebar">
        <div className="ceo-copilot__sidebar-head">
          <h1 className="ceo-copilot__brand">CEO COPILOT</h1>
          <p className="ceo-copilot__provider">{header.providerLabel}</p>
          <button
            type="button"
            className="mos-btn mos-btn-primary mos-btn-sm"
            style={{ marginTop: '0.65rem', width: '100%' }}
            onClick={() => {
              startNewConversation()
              setVersion((v) => v + 1)
            }}
          >
            + Yeni konuşma
          </button>
        </div>
        <div className="ceo-copilot__conv-list">
          {sidebar.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`ceo-copilot__conv ${thread.id === c.id ? 'is-active' : ''}`}
              onClick={() => {
                setActiveConversationId(c.id)
                setVersion((v) => v + 1)
              }}
            >
              <span className="ceo-copilot__conv-title">{c.title}</span>
              <span className="ceo-copilot__conv-preview">{c.preview || c.timeLabel}</span>
            </button>
          ))}
        </div>
      </aside>

      <section className="ceo-copilot__main">
        <div className="ceo-copilot__tabs" role="tablist" aria-label="CEO Copilot modları">
          {CEO_COPILOT_TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={activeTab === tab.id}
              className={`ceo-copilot__tab ${activeTab === tab.id ? 'is-active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {activeTab === 'board-meeting' ? (
          <BoardMeetingPanel runtimeCtx={runtimeCtx} />
        ) : (
          <>
        <div className="ceo-copilot__thread">
          {thread.messages.length === 0 ? (
            <div className="ceo-copilot__empty">
              <p>Evtrend — CEO Copilot</p>
              <p>Şirketinizi doğal dil ile yönetin.</p>
            </div>
          ) : (
            thread.messages.map((msg) => (
              <div key={msg.id} className={`ceo-copilot__msg ceo-copilot__msg--${msg.role}`}>
                <div className="ceo-copilot__bubble">{msg.content}</div>
                <div className="ceo-copilot__meta">
                  {msg.roleLabel} · {msg.timeLabel}
                  {msg.providerId ? ` · ${msg.providerId}` : ''}
                </div>
                {msg.deepLinks?.length ? (
                  <div className="ceo-copilot__links">
                    {msg.deepLinks.map((link) => (
                      <button
                        key={`${link.pageId}-${link.label}`}
                        type="button"
                        className="mos-btn mos-btn-ghost mos-btn-sm"
                        onClick={() => openDeepLink(link)}
                      >
                        {link.label} →
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>

        <div className="ceo-copilot__composer">
          <div className="ceo-copilot__hint-row">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                className="mos-btn mos-btn-ghost mos-btn-sm ceo-copilot__hint"
                onClick={() => void sendMessage(p)}
                disabled={sending}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="ceo-copilot__composer-row">
            <div className="ceo-copilot__input-wrap">
              <textarea
                className="ceo-copilot__textarea"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void sendMessage(input)
                  }
                }}
                placeholder="CEO mesajınız…"
                rows={2}
                aria-label="CEO Copilot mesajı"
              />
              <div className="ceo-copilot__composer-actions">
                <button type="button" className="mos-btn mos-btn-ghost mos-btn-sm" disabled title="Yakında">
                  📎 Dosya
                </button>
                <button type="button" className="mos-btn mos-btn-ghost mos-btn-sm" disabled title="Yakında">
                  🎤 Mikrofon
                </button>
              </div>
            </div>
            <button
              type="button"
              className="mos-btn mos-btn-primary"
              onClick={() => void sendMessage(input)}
              disabled={sending || !input.trim()}
            >
              {sending ? '…' : 'Gönder'}
            </button>
          </div>
        </div>
          </>
        )}
      </section>
    </div>
  )
}
