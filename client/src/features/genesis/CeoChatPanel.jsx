import { memo, useCallback, useState } from 'react'
import { processCeoChat } from '../../services/genesis/GenesisEngine.js'

/**
 * @param {{
 *   chat: { id: string, role: string, content: string, actionsTaken?: string[] }[]
 *   orders: import('../../data/seedOrders.js').Order[]
 *   dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *   todayIso: string
 *   onChatUpdate?: () => void
 * }} props
 */
function CeoChatPanel({ chat, orders, dtos, todayIso, onChatUpdate }) {
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)

  const send = useCallback(() => {
    const text = input.trim()
    if (!text || sending) return
    setSending(true)
    try {
      processCeoChat(text, { orders, dtos, todayIso })
      setInput('')
      onChatUpdate?.()
    } finally {
      setSending(false)
    }
  }, [input, sending, orders, dtos, todayIso, onChatUpdate])

  return (
    <section className="mos-erp-cockpit-section genesis-chat" aria-label="CEO Chat">
      <h2 className="mos-erp-cockpit-section__title">CEO CHAT</h2>
      <div className="genesis-chat__thread">
        {chat.length === 0 ? (
          <p className="genesis-chat__hint">“Sorun ne?” · “Neden?” · “Çöz.”</p>
        ) : (
          chat.map((msg) => (
            <div key={msg.id} className={`genesis-chat__msg genesis-chat__msg--${msg.role}`}>
              <span className="genesis-chat__role">{msg.role === 'ceo' ? 'CEO' : 'Genesis'}</span>
              <p>{msg.content}</p>
              {msg.actionsTaken?.length ? (
                <span className="genesis-chat__actions">Uygulandı: {msg.actionsTaken.join(', ')}</span>
              ) : null}
            </div>
          ))
        )}
      </div>
      <div className="genesis-chat__composer">
        <input
          type="text"
          className="genesis-chat__input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Sorun ne?"
          aria-label="CEO mesajı"
        />
        <button type="button" className="mos-btn mos-btn-primary mos-btn-sm" onClick={send} disabled={sending}>
          Gönder
        </button>
      </div>
    </section>
  )
}

export default memo(CeoChatPanel)
