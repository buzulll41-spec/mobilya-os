import { useState } from 'react'

/**
 * @param {{ tone?: string; children: import('react').ReactNode }} props
 */
function Tag({ tone, children }) {
  return <span className={`mos-erp-tag mos-erp-tag--${tone ?? 'info'}`}>{children}</span>
}



/**

 * @param {{

 *   task: {

 *     id: string

 *     title: string

 *     description?: string

 *     statusLabel: string

 *     status: string

 *     durationLabel: string

 *     priorityLabel: string

 *     sourceModule: string

 *     riskLabel: string

 *     progress?: number

 *     progressLabel?: string

 *     progressBlocks?: string

 *   }

 *   showSuccessTick?: boolean

 * }} props

 */

function DigitalWorkforceTaskRow({ task, showSuccessTick = false }) {

  const progress = task.progress ?? (task.status === 'COMPLETED' ? 100 : undefined)



  return (

    <article

      className={`dw-task-row dw-task-row--${task.status.toLowerCase()}${showSuccessTick ? ' dw-task-row--tick' : ''}`}

    >

      <div className="dw-task-row__main">

        <strong>{task.title}</strong>

        {task.description ? <span className="dw-task-row__desc">{task.description}</span> : null}

      </div>



      {typeof progress === 'number' ? (

        <div className="dw-task-row__progress" aria-label={`İlerleme ${task.progressLabel ?? `${progress}%`}`}>

          <div className="dw-task-row__progress-track">

            <span className="dw-task-row__progress-fill" style={{ width: `${progress}%` }} />

          </div>

          <span className="dw-task-row__progress-meta">

            {task.progressBlocks ? (

              <span className="dw-task-row__progress-blocks" aria-hidden="true">

                {task.progressBlocks}

              </span>

            ) : null}

            <span>{task.progressLabel ?? `${progress}%`}</span>

          </span>

        </div>

      ) : null}



      <dl className="dw-task-row__meta">

        <div>

          <dt>Durum</dt>

          <dd>{task.statusLabel}</dd>

        </div>

        <div>

          <dt>Süre</dt>

          <dd>{task.durationLabel}</dd>

        </div>

        <div>

          <dt>Öncelik</dt>

          <dd>{task.priorityLabel}</dd>

        </div>

        <div>

          <dt>Kaynak</dt>

          <dd>{task.sourceModule}</dd>

        </div>

        <div>

          <dt>Risk</dt>

          <dd>{task.riskLabel}</dd>

        </div>

      </dl>

      {showSuccessTick ? (

        <span className="dw-task-row__success" aria-hidden="true">

          ✓

        </span>

      ) : null}

    </article>

  )

}



/**

 * @param {{

 *   open: boolean

 *   detail: {

 *     displayName: string

 *     name: string

 *     role: string

 *     department: string

 *     icon: string

 *     avatar: string

 *     description: string

 *     experienceStatusLabel: string

 *     experienceStatusTone: string

 *     livingStatusLabel?: string

 *     livingStatusEmoji?: string

 *     livingStatusTone?: string

 *     livingMessage?: string

 *     livingCardClass?: string

 *     theme: { accent: string, accentSoft: string, accentBorder: string }

 *     tasksToday: number

 *     tasksPending: number

 *     tasksCompleted: number

 *     successRate: number

 *     averageDurationLabel: string

 *     lastActionLabel: string

 *     lastCompletedTaskTitle: string

 *     performance: {

 *       totalTasks: number

 *       successfulTasks: number

 *       failedTasks: number

 *       averageDurationLabel: string

 *       successRate: number

 *     }

 *     todayTasks: object[]

 *     pendingTasks: object[]

 *     completedTasks: object[]

 *     taskHistory: object[]

 *     engineRisks: { orderId: string, stage: string, nextAction: string, priority: string }[]

 *     createdTasks: object[]

 *   } | null

 *   loading?: boolean

 *   recentCompleteFlash?: boolean

 *   onClose: () => void

 * }} props

 */

export default function DigitalWorkforceDrawer({

  open,

  detail,

  loading = false,

  recentCompleteFlash = false,

  onClose,

}) {

  const [activeTab, setActiveTab] = useState('overview')

  if (!open) return null



  const accentStyle = detail

    ? {

        '--dw-accent': detail.theme.accent,

        '--dw-accent-soft': detail.theme.accentSoft,

        '--dw-accent-border': detail.theme.accentBorder,

      }

    : undefined



  const statusLabel = detail?.livingStatusLabel ?? detail?.experienceStatusLabel

  const statusTone = detail?.livingStatusTone ?? detail?.experienceStatusTone

  const tabs = (detail?.futureTabs ?? []).filter((t) => t.active !== false)



  return (

    <div className="dw-drawer-root" role="presentation">

      <button type="button" className="dw-drawer-root__scrim" aria-label="Kapat" onClick={onClose} />

      <aside

        className={`dw-drawer dw-drawer--living${detail?.livingCardClass ?? ''}${recentCompleteFlash ? ' dw-drawer--flash' : ''}`}

        style={accentStyle}

        aria-label={detail ? `${detail.displayName} detayı` : 'AI çalışan detayı'}

      >

        {loading || !detail ? (

          <div className="dw-drawer__loading">Yükleniyor…</div>

        ) : (

          <>

            <header className="dw-drawer__head">

              <div className="dw-drawer__identity">

                <span

                  className={`dw-drawer__avatar${detail.livingCardClass?.includes('thinking') ? ' dw-drawer__avatar--thinking' : ''}`}

                  aria-hidden="true"

                >

                  {detail.avatar}

                </span>

                <div>

                  <h2 className="dw-drawer__title">{detail.displayName}</h2>

                  <p className="dw-drawer__sub">

                    {detail.role} · {detail.department}

                  </p>

                </div>

              </div>

              <div className="dw-drawer__head-actions">

                <span className="dw-drawer__live-status">

                  {detail.livingStatusEmoji} {statusLabel}

                </span>

                <Tag tone={statusTone}>{statusLabel}</Tag>

                <button type="button" className="dw-drawer__close" onClick={onClose} aria-label="Kapat">

                  ×

                </button>

              </div>

            </header>



            {detail.livingMessage ? (

              <div className="dw-drawer__live-banner" aria-live="polite">

                {detail.livingMessage}

              </div>

            ) : null}



            {tabs.length ? (

              <nav className="dw-drawer__tabs" aria-label="Çalışan sekmeleri">

                {tabs.map((tab) => (

                  <button

                    key={tab.id}

                    type="button"

                    className={`dw-drawer__tab${activeTab === tab.id ? ' dw-drawer__tab--active' : ''}`}

                    onClick={() => setActiveTab(tab.id)}

                  >

                    {tab.label}

                  </button>

                ))}

              </nav>

            ) : null}



            <div className="dw-drawer__body">
              {activeTab === 'overview' ? (
                <>
                  <section className="dw-drawer__section" aria-label="AI bilgisi">
                    <h3>AI Bilgisi</h3>
                    <p className="dw-drawer__info-text">{detail.description}</p>
                    <dl className="dw-drawer__info-grid">
                      <div>
                        <dt>Tam ad</dt>
                        <dd>{detail.name}</dd>
                      </div>
                      <div>
                        <dt>Son işlem</dt>
                        <dd className="dw-drawer__last-action">{detail.lastActionLabel}</dd>
                      </div>
                      <div>
                        <dt>Son tamamlanan</dt>
                        <dd>{detail.lastCompletedTaskTitle}</dd>
                      </div>
                      <div>
                        <dt>Başarı oranı</dt>
                        <dd>{detail.successRate}%</dd>
                      </div>
                    </dl>
                  </section>
                  <section className="dw-drawer__section" aria-label="Performans">
                    <h3>Performans</h3>
                    <dl className="dw-drawer__perf-grid">
                      <div>
                        <dt>Toplam görev</dt>
                        <dd>{detail.performance.totalTasks}</dd>
                      </div>
                      <div>
                        <dt>Başarılı</dt>
                        <dd>{detail.performance.successfulTasks}</dd>
                      </div>
                      <div>
                        <dt>Ort. süre</dt>
                        <dd>{detail.performance.averageDurationLabel}</dd>
                      </div>
                      <div>
                        <dt>Bugünkü</dt>
                        <dd>{detail.tasksToday}</dd>
                      </div>
                    </dl>
                  </section>
                  <section className="dw-drawer__section" aria-label="Business Engine riskleri">
                    <h3>Business Engine Riskleri</h3>
                    {detail.engineRisks.length === 0 ? (
                      <p className="dw-drawer__empty">İlişkili risk özeti yok.</p>
                    ) : (
                      <ul className="dw-drawer__risk-list">
                        {detail.engineRisks.map((risk) => (
                          <li key={risk.orderId} className="dw-drawer__risk-item">
                            <strong>{risk.orderId}</strong>
                            <span>
                              {risk.stage} · {risk.nextAction}
                            </span>
                            <Tag tone={risk.priority === 'CRITICAL' ? 'critical' : 'warning'}>
                              {risk.priority}
                            </Tag>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </>
              ) : activeTab === 'tasks' ? (
                <>
                  <section className="dw-drawer__section" aria-label="Bugünkü görevler">
                    <h3>Bugünkü Görevler ({detail.todayTasks.length})</h3>
                    {detail.todayTasks.length === 0 ? (
                      <p className="dw-drawer__empty">Bugün kayıtlı görev yok.</p>
                    ) : (
                      detail.todayTasks.map((task) => <DigitalWorkforceTaskRow key={task.id} task={task} />)
                    )}
                  </section>
                  <section className="dw-drawer__section" aria-label="Bekleyen görevler">
                    <h3>Bekleyen Görevler ({detail.pendingTasks.length})</h3>
                    {detail.pendingTasks.length === 0 ? (
                      <p className="dw-drawer__empty">Bekleyen görev yok.</p>
                    ) : (
                      detail.pendingTasks.map((task) => <DigitalWorkforceTaskRow key={task.id} task={task} />)
                    )}
                  </section>
                  <section className="dw-drawer__section" aria-label="Tamamlanan görevler">
                    <h3>Tamamlanan Görevler</h3>
                    {detail.completedTasks.length === 0 ? (
                      <p className="dw-drawer__empty">Tamamlanan görev yok.</p>
                    ) : (
                      detail.completedTasks.map((task) => (
                        <DigitalWorkforceTaskRow key={task.id} task={task} showSuccessTick />
                      ))
                    )}
                  </section>
                  <section className="dw-drawer__section" aria-label="Görev geçmişi">
                    <h3>Görev Geçmişi</h3>
                    {detail.taskHistory.length === 0 ? (
                      <p className="dw-drawer__empty">Geçmiş kaydı yok.</p>
                    ) : (
                      detail.taskHistory.map((task) => <DigitalWorkforceTaskRow key={task.id} task={task} />)
                    )}
                  </section>
                </>
              ) : activeTab === 'memory' ? (
                <section className="dw-drawer__section" aria-label="Memory">
                  <h3>Memory</h3>
                  <p className="dw-drawer__info-text">
                    AI çalışanın domain event&apos;lerden öğrendikleri — salt okunur bağlam.
                  </p>
                  {(detail.memoryRows ?? []).length === 0 ? (
                    <p className="dw-drawer__empty">Henüz hafıza kaydı yok.</p>
                  ) : (
                    <div className="dw-drawer__memory-table-wrap">
                      <table className="dw-drawer__memory-table">
                        <thead>
                          <tr>
                            <th scope="col">Tarih</th>
                            <th scope="col">Tür</th>
                            <th scope="col">Başlık</th>
                            <th scope="col">Önem</th>
                            <th scope="col">İlgili kayıt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detail.memoryRows ?? []).map((row) => (
                            <tr key={row.id}>
                              <td>{row.dateLabel}</td>
                              <td>{row.typeLabel}</td>
                              <td>{row.title}</td>
                              <td>
                                <Tag tone={row.importanceTone}>{row.importanceLabel}</Tag>
                              </td>
                              <td>{row.relatedRecord}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ) : activeTab === 'tool-history' ? (
                <section className="dw-drawer__section" aria-label="Tool History">
                  <h3>Tool History</h3>
                  <p className="dw-drawer__info-text">
                    AI çalışanın çalıştırdığı tool kayıtları — safe mode audit izi.
                  </p>
                  {(detail.toolExecutionRows ?? []).length === 0 ? (
                    <p className="dw-drawer__empty">Henüz tool execution kaydı yok.</p>
                  ) : (
                    <div className="dw-drawer__memory-table-wrap">
                      <table className="dw-drawer__memory-table">
                        <thead>
                          <tr>
                            <th scope="col">Tool</th>
                            <th scope="col">Saat</th>
                            <th scope="col">Sonuç</th>
                            <th scope="col">Manager</th>
                            <th scope="col">Approval</th>
                            <th scope="col">Duration</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(detail.toolExecutionRows ?? []).map((row) => (
                            <tr key={row.id}>
                              <td>{row.toolName}</td>
                              <td>{row.timeLabel}</td>
                              <td>
                                <Tag tone={row.statusTone}>{row.statusLabel}</Tag>
                              </td>
                              <td>{row.managerLabel}</td>
                              <td>{row.approvalLabel}</td>
                              <td>{row.durationLabel}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              ) : activeTab === 'live-activity' ? (
                <section className="dw-drawer__section" aria-label="Live Activity">
                  <h3>Live Activity</h3>
                  <dl className="dw-drawer__info-grid">
                    <div>
                      <dt>Status</dt>
                      <dd>{detail.liveActivity?.phaseLabel ?? 'Idle'}</dd>
                    </div>
                    <div>
                      <dt>Current Step</dt>
                      <dd>{detail.liveActivity?.currentStep ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Sipariş</dt>
                      <dd>{detail.liveActivity?.orderId ?? '—'}</dd>
                    </div>
                    <div>
                      <dt>Süre</dt>
                      <dd>{detail.liveActivity?.elapsedSeconds ?? 0} sn</dd>
                    </div>
                  </dl>
                  {(detail.liveActivity?.log ?? []).length === 0 ? (
                    <p className="dw-drawer__empty">Henüz aktivite kaydı yok.</p>
                  ) : (
                    <ul className="dw-drawer__activity-log">
                      {(detail.liveActivity?.log ?? []).map((entry) => (
                        <li key={entry.id ?? `${entry.at}-${entry.phase}`}>
                          <span className="dw-drawer__activity-log__phase">{entry.phase}</span>
                          <span>{entry.message}</span>
                          <time>{entry.at?.slice(11, 19)}</time>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : activeTab === 'llm-conversation' ? (
                <section className="dw-drawer__section" aria-label="LLM Conversation">
                  <h3>LLM Conversation</h3>
                  {(detail.llmConversation ?? []).length === 0 ? (
                    <p className="dw-drawer__empty">Henüz LLM konuşması yok.</p>
                  ) : (
                    <ul className="dw-drawer__llm-log">
                      {(detail.llmConversation ?? []).map((msg) => (
                        <li key={msg.id} className={`dw-drawer__llm-log__row dw-drawer__llm-log__row--${msg.role}`}>
                          <span className="dw-drawer__llm-log__role">{msg.role}</span>
                          <p>{msg.content}</p>
                          <time>{msg.at?.slice(11, 19)}</time>
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ) : null}
            </div>

          </>

        )}

      </aside>

    </div>

  )

}


