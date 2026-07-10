import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ensureDefaultBoardMeeting,
  getBoardMeetingHistoryLocal,
  runBoardMeeting,
  subscribeBoardMeetingStore,
} from '../../services/board/BoardMeetingService.js'
import { buildBoardMeetingHistoryVm, buildBoardMeetingVm } from '../../mappers/board/boardMeetingModel.js'

/**
 * @param {{
 *   runtimeCtx: {
 *     orders: import('../../data/seedOrders.js').Order[]
 *     dtos: import('../../contracts/v1/salesOrderListItem.js').SalesOrderListItemDto[]
 *     todayIso: string
 *   }
 * }} props
 */
function BoardMeetingPanel({ runtimeCtx }) {
  const [version, setVersion] = useState(0)
  const [question, setQuestion] = useState('Neden satış düştü?')
  const [running, setRunning] = useState(false)

  useEffect(() => {
    ensureDefaultBoardMeeting(runtimeCtx)
    const unsub = subscribeBoardMeetingStore(() => setVersion((v) => v + 1))
    return unsub
  }, [runtimeCtx])

  void version

  const meeting = useMemo(() => buildBoardMeetingVm(ensureDefaultBoardMeeting(runtimeCtx)), [runtimeCtx, version])
  const history = useMemo(() => buildBoardMeetingHistoryVm(getBoardMeetingHistoryLocal({ limit: 8 }).records), [version])

  const conveneBoard = useCallback(async () => {
    if (running) return
    setRunning(true)
    try {
      runBoardMeeting(question, runtimeCtx)
      setVersion((v) => v + 1)
    } finally {
      setRunning(false)
    }
  }, [question, runtimeCtx, running])

  return (
    <div className="ceo-board">
      <header className="ceo-board__header">
        <h2 className="ceo-board__title">Strategic AI Board</h2>
        <p className="ceo-board__subtitle">Sanal yönetim kurulu · Executive Intelligence</p>
      </header>

      <div className="ceo-board__actions">
        <input
          className="ceo-board__question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="CEO sorusu…"
          aria-label="Board sorusu"
        />
        <button type="button" className="mos-btn mos-btn-primary" onClick={() => void conveneBoard()} disabled={running}>
          {running ? 'Toplanıyor…' : 'Yönetim kurulunu topla'}
        </button>
      </div>

      {meeting.hasMeeting ? (
        <>
          <section className="ceo-board__summary" aria-label="Executive summary">
            <h3>{meeting.headline}</h3>
            <p className="ceo-board__question-label">Soru: {meeting.question}</p>
            <p>{meeting.result}</p>
            {!meeting.hasConsensus && meeting.conflicts.length ? (
              <p className="ceo-board__conflict">Çatışma çözümü: {meeting.conflicts[0].resolution}</p>
            ) : (
              <p className="ceo-board__consensus">Konsensüs sağlandı</p>
            )}
          </section>

          <section className="ceo-board__grid">
            <div className="ceo-board__panel">
              <h4>Director görüşleri</h4>
              <ul className="ceo-board__discussion">
                {meeting.discussion.map((line) => (
                  <li key={line.memberId}>
                    <strong>{line.memberLabel}</strong>
                    <span>{line.opinion}</span>
                    <em>{line.confidence}% güven</em>
                  </li>
                ))}
              </ul>
            </div>
            <div className="ceo-board__panel">
              <h4>En önemli 3 karar</h4>
              <ol className="ceo-board__list">
                {meeting.topDecisions.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ol>
              <h4>Yarın odak</h4>
              <ul className="ceo-board__list">
                {meeting.tomorrowFocus.map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            </div>
          </section>

          <section className="ceo-board__history">
            <h4>Board geçmişi</h4>
            <ul>
              {history.map((h) => (
                <li key={h.id}>
                  <span>{h.occurredAt.slice(0, 16).replace('T', ' ')}</span>
                  <strong>{h.question}</strong>
                  <span>{h.participantCount} AI · {h.result}</span>
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : null}
    </div>
  )
}

export default memo(BoardMeetingPanel)
